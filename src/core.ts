import { Chess, Move } from "chess.js";
import { evaluateBoard } from "./evaluate";
import { mvv_lva, PIECE_NUM, mgMaterial } from "./evaluations";
import { genZobristKey } from "./zobrist";

const MATE_SCORE = 48000;
const MATE_VALUE = 49000;
const INFINITY = 50000;

export enum HashFlag {
    exact,
    alpha,
    beta
}

export interface HashEntry {
    score: number;
    hashFlag: HashFlag,
    depth: number;
    move: Move
}

export interface EngineOptions {
    fen: string;
    searchDepth: number;
    lmrFullDepth: number;
    lmrMaxReduction: number;
    maxExtensions: number;
    version: string;
}

export interface HistoryMove {
    "b": Record<string, number>[],
    "w": Record<string, number>[]
}

export class Engine {
    public chess: Chess;
    public fen: string;
    public searchDepth: number;
    public nodes: number = 0;
    public lmrMaxReduction: number;
    public lmrFullDepth: number;
    public maxExtensions: number;
    public ply: number = 0;
    public prevMove?: Move;
    public uci: boolean = false;

    // Used for engine termination
    public startTime: number = 0;
    public timeout: number = 99999999999;
    public stopped: boolean = false;

    // Used for killer move heuristic
    public killerMove = [ new Array(64).fill(null), new Array(64).fill(null) ];
    // Used for counter move heuristic
    public counterMove: Record<string, Move> = {};
    // Used for history move heuristic
    public historyMove: HistoryMove = {
        "b": [ {}, {}, {}, {}, {}, {} ],
        "w": [ {}, {}, {}, {}, {}, {} ]
    }

    // PV table
    public pvLength: number[];
    public pvTable: string[][];
    public collectPV = false;
    public scorePV = false;

    constructor(options: EngineOptions) {
        this.fen = options.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.searchDepth = options.searchDepth || 64;
        this.chess = new Chess(this.fen);
        this.lmrMaxReduction = options.lmrMaxReduction;
        this.lmrFullDepth = options.lmrFullDepth;
        this.maxExtensions = options.maxExtensions;

        // Init pv table
        this.pvLength = new Array(this.searchDepth).fill(0);
        this.pvTable = [];
        for (let i = 0; i < this.searchDepth; i++) {
            this.pvTable.push(new Array(this.searchDepth).fill(""));
        }
    }

    // PV
    enablePVScoring(moves: Move[]) {
        // Disable following PV
        this.collectPV = false;

        for (const move of moves) {
            // Make sure we hit PV move
            if (this.pvTable[0][this.ply] == move.lan) {
                // Enable move scoring
                this.scorePV = true;
                // Enable collecting PV
                this.collectPV = true;
            }
        }
    }

    // Tranposition table
    public hashTable: Map<bigint, HashEntry> = new Map();

    recordHash(score: number, depth: number, hashFlag: HashFlag, move: Move, customHash?: bigint) {
        const hash = customHash || genZobristKey(this.chess);
        // const hash = this.chess.fen();

        if (score < -MATE_SCORE) score -= this.ply;
        if (score > MATE_SCORE) score += this.ply;
        
        this.hashTable.set(hash, {
            score,
            depth,
            hashFlag,
            move
        }); 
    }

    probeHash(alpha: number, beta: number, depth: number, customHash?: bigint): number {
        const hash = customHash || genZobristKey(this.chess);
        // const hash = this.chess.fen();

        const hashEntry = this.hashTable.get(hash);

        if (!hashEntry)
            // If position does not exist the transposition table
            return 99999;
        
        if (depth <= hashEntry.depth) {
            let score = hashEntry.score;

            if (score < -MATE_SCORE) score += this.ply;
            if (score > MATE_SCORE) score -= this.ply;

            if (hashEntry.hashFlag === HashFlag.exact)
                return score;
            if (hashEntry.hashFlag === HashFlag.alpha && score <= alpha)
                return alpha;
            if (hashEntry.hashFlag === HashFlag.beta && score >= beta)
                return beta;
        }

        return 99999;
    }

    // Move ordering
    getMovePrio(move: Move, currentBoardHash: bigint): number {
        let priority = 0;

        // Hash Move
        const hashEntry = this.hashTable.get(currentBoardHash);

        if (
            hashEntry && 
            hashEntry.move &&
            move.san === hashEntry.move.san
        ) {
            priority += 100000;
        }

        // PV move
        if (this.scorePV) {
            // Make sure it is PV move
            if (this.pvTable[0][this.ply] == move.lan)
            {
                // Disable PV scoring
                this.scorePV = false;

                priority += 50000;
            }
        }
        
        // Non-capture moves
        if (!move.captured) {
            // 1st killer move
            if (this.killerMove[0][this.ply] && this.killerMove[0][this.ply].san === move.san) { 
                priority += 9000; 
            }
    
            // 2nd killer move
            else if (this.killerMove[1][this.ply] && this.killerMove[1][this.ply].san === move.san) {
                priority += 8000;
            }
    
            // Counter move
            if (this.prevMove && this.counterMove[this.prevMove.san] && this.counterMove[this.prevMove.san].san === move.san) {
                priority += 9000;
            }
    
            // History move
            priority += this.historyMove[move.color][PIECE_NUM[move.piece]][move.to] || 0;
            
            return priority;
        }
    
        // For captures, we use MVV-LVA heuristic
        const attacker = move.piece;
        const victim = move.captured;
    
        priority += mvv_lva[ PIECE_NUM[attacker] ][ PIECE_NUM[victim] ];

        return priority;
    }

    sortMoves(moves: Move[], customHash?: bigint) {
        const currentBoardHash = customHash || genZobristKey(this.chess);

        return moves
            .map(move => ({ move, priority: this.getMovePrio(move, currentBoardHash) }))
            .sort((moveA, moveB) => moveB.priority - moveA.priority)
            .map(scoredMove => scoredMove.move);
    }

    // Quiescence search
    quiescence(alpha: number, beta: number): number {
        // Increment nodes count
        this.nodes++;

        const evaluation = evaluateBoard(this.chess);

        // Fail-hard beta cutoff
        if (evaluation >= beta) {
            // Node fails high
            return beta;
        }

        // Delta pruning
        const delta = mgMaterial[4];
        if (evaluation < alpha - delta) {
            return alpha;
        }

        // Found a better move
        if (evaluation > alpha) {
            alpha = evaluation;
        }

        let possibleMoves = this.sortMoves(this.chess.moves({ verbose: true }).filter(move => move.captured));

        for (const childMove of possibleMoves) {
            this.chess.move(childMove);

            this.ply++;

            const score = -this.quiescence(-beta, -alpha);

            this.ply--;

            this.chess.undo(); // Take back move
            
            // Return 0 if engine is forced to stop
            if (this.stopped || Date.now() - this.startTime > this.timeout) return 0;

            // fail-hard beta cutoff
            if (score >= beta) {
                // node (move) fails high
                return beta;
            }
            
            // found a better move
            if (score > alpha) {
                // PV node (move)
                alpha = score; 
            }
        }

        return alpha;
    }

    // Calculate extensions
    calculateExtensions(moves: number, inCheck: boolean) {
        let extensions = 0;

        // One reply extension and check extension
        if (moves === 1 || inCheck) {
            extensions = 1;
        }

        return extensions;
    }

    // The main negamax search algorithm
    negamax(depth: number, alpha: number, beta: number, extended: number): number {
        // Init
        const inCheck = this.chess.inCheck();
        this.pvLength[this.ply] = this.ply;
        // Hash onced to prevent duplications
        const currentHash = genZobristKey(this.chess);

        this.nodes++;

        let hashFlag = HashFlag.alpha;

        // Detecting 3-fold repetition
        if (this.ply && this.chess.isThreefoldRepetition()) {
            this.recordHash(0, depth, HashFlag.exact, this.prevMove!, currentHash);
            return 0;
        }

        // Check if position exists in transposition table
        let score = this.probeHash(alpha, beta, depth, currentHash);

        if (this.ply && score !== 99999)
            return score;

        // Quiescence search
        if (depth === 0) return this.quiescence(alpha, beta);

        // Reverse futility pruning
        const isPv = beta - alpha > 1;
        const currentEval = evaluateBoard(this.chess);
        if (depth < 3 && !inCheck && !isPv && Math.abs(beta - 1) > -48900) {
            let rfpMargin = mgMaterial[0] * depth; // Scaled for each depth by a pawn

            if (currentEval - rfpMargin >= beta) return currentEval - rfpMargin;
        }

        // Null move pruning
        if (this.ply && depth >= 3 && !inCheck) {
            // Preserve old moves to reconstruct chess obj
            const oldMoves = this.chess.history();

            // Make null move
            let tokens = this.chess.fen().split(" ");
            tokens[1] = this.chess.turn() === "w" ? "b" : "w";
            tokens[3] = '-'; // reset the en passant square
            this.chess.load(tokens.join(" "));

            // Search with reduced depth
            const score = -this.negamax(depth - 1 - 2, -beta, -beta + 1, extended);

            // Reconstruct chess obj prior to null move
            this.chess.load(this.fen);
            for (const oldMove of oldMoves) {
                this.chess.move(oldMove);
            }

            // Fail-hard beta cutoff
            if (score >= beta) {
                return beta;
            }
        }

        // Get next moves
        let possibleMoves = this.chess.moves({ verbose: true });

        // Detecting checkmates and stalemates
        if (possibleMoves.length === 0) {
            if (inCheck) {
                return -MATE_VALUE + this.ply; // Checkmate

                // Ply is added because:
                // - In our checkmate, we would want the furthest path to checkmate
                // - In their checkmate, we would want the shortest path to checkmate
            }

            return 0; // Stalemate
        }

        // Calculate extensions
        const extensions = extended < this.maxExtensions ? this.calculateExtensions(possibleMoves.length, inCheck) : 0;

        // Sort moves
        if (this.collectPV)
            // Enable PV move scoring
            this.enablePVScoring(possibleMoves);

        possibleMoves = this.sortMoves(possibleMoves, currentHash);
        let searchedMoves = 0, bestMoveSoFar: Move;

        // Razoring, skipping an entire subtree
        if (!isPv && !inCheck && depth <= 3) {
            // Prepare score for first phase
            let scaledScore = currentEval + mgMaterial[0];

            if (scaledScore < beta) {
                const qScore = this.quiescence(alpha, beta);

                if (depth === 1) return Math.max(qScore, scaledScore);
                
                // Second phase for depth 2 and depth 3
                scaledScore += mgMaterial[0];

                if (scaledScore < beta && qScore < beta) return Math.max(qScore, scaledScore);
            }
        }

        // Futility pruning
        let fpEnabled = false;
        if (depth < 4 && Math.abs(alpha) < MATE_SCORE) {
            // Margin for each depth, the shallower the depth the more we reduce the margin
            const futilityMargin = [ 0, mgMaterial[0], mgMaterial[1], mgMaterial[3] ];
            fpEnabled = currentEval + futilityMargin[depth] <= alpha;
        }

        // Find the best move
        for (const move of possibleMoves) {
            // const tempMove = move;
            this.prevMove = move;

            // Make move
            this.ply++;
            this.chess.move(move);
            let score = 0;

            // Apply futility pruning
            if (
                fpEnabled &&
                searchedMoves > 0 &&
                !move.captured &&
                !move.promotion &&
                !this.chess.inCheck()
            ) { 
                this.chess.undo();
                this.ply--;
                continue;
            }

            // Do normal, alpha-beta full search on first (PV) move
            if (searchedMoves === 0) {
                score = -this.negamax(depth - 1 + extensions, -beta, -alpha, extended + extensions);
            } else {
                // Late move reduction
                if (
                    searchedMoves >= this.lmrFullDepth && 
                    depth >= this.lmrMaxReduction && 
                    !this.chess.inCheck() &&
                    !move.captured &&
                    !move.promotion &&
                    extensions === 0
                ) {
                    score = -this.negamax(depth - 2, -alpha-1, -alpha, extended);   
                } else { // Raise score to enable full search
                    score = alpha + 1;
                }

                // Principal variation search
                if (score > alpha) {
                    // Try to prove that remaining moves are bad by considering if they can raise alpha or not
                    score = -this.negamax(depth - 1 + extensions, -alpha-1, -alpha, extended + extensions);

                    // If they can indeed raise alpha, we have to re-search with normal alpha-beta full search
                    if (score > alpha && score < beta) {
                        score = -this.negamax(depth - 1 + extensions, -beta, -alpha, extended + extensions);
                    }
                }
            }


            // Take back move
            this.chess.undo();
            this.ply--;

            searchedMoves++;

            // Return 0 if engine is forced to stop
            if (this.stopped || Date.now() - this.startTime > this.timeout) return 0;

            // Fail-hard beta cutoff
            if (score >= beta) {
                // Store move in the case of a fail-hard beta cutoff
                this.recordHash(beta, depth, HashFlag.beta, move, currentHash);

                if (!move.captured) { // Only quiet moves
                    // Store killer moves
                    
                    this.killerMove[1][this.ply] = this.killerMove[0][this.ply];
                    this.killerMove[0][this.ply] = move;
    
                    // Store counter moves
                    this.counterMove[this.prevMove.san] = move;
                }

                // Node fails high
                return beta;
            }

            // Found better move
            if (score > alpha) {
                bestMoveSoFar = move;

                hashFlag = HashFlag.exact;

                // Store history moves
                if (!move.captured) { // Only quiet moves
                    this.historyMove[move.color][PIECE_NUM[move.piece]][move.to] += depth;
                }

                alpha = score;

                // Store pv move
                this.pvTable[this.ply][this.ply] = move.lan;

                // Loop over the next ply
                for (let nextPly = this.ply + 1; nextPly < this.pvLength[this.ply + 1]; nextPly++)
                    // Copy move from deeper ply into a current ply's line
                    this.pvTable[this.ply][nextPly] = this.pvTable[this.ply + 1][nextPly];
                
                // Adjust PV length
                this.pvLength[this.ply] = this.pvLength[this.ply + 1];
            }
        }

        this.recordHash(alpha, depth, hashFlag, bestMoveSoFar!, currentHash);

        // Node fails low
        return alpha;
    }

    findMove() {
        // Iterative deepening with aspiration windows
        this.startTime = Date.now();

        let alpha = -INFINITY, beta = INFINITY, score = 0, bestMove = "";

        for (let depth = 1; depth <= this.searchDepth; depth++) {
            // Reset collect PV flag
            this.collectPV = true;

            // Find moves
            score = this.negamax(depth, alpha, beta, 0);

            // Handle timeouts
            if (this.stopped || Date.now() - this.startTime > this.timeout) {
                break;
            }

            // Fell out of window
            if (score <= alpha || score >= beta) {
                alpha = -INFINITY;    
                beta = INFINITY;
                depth--;
                continue;
            }

            alpha = score - 50;
            beta = score + 50;

            if (this.pvLength[0]) {
                let pv = "";

                for (let i = 0; i < this.pvLength[0]; i++) {
                    pv += ` ${this.pvTable[0][i]}`;
                }

                if (score >= -MATE_VALUE && score <= -MATE_SCORE) {
                    console.log(`info depth ${depth} score mate ${Math.round(-(score + MATE_VALUE) / 2)} time ${Date.now() - this.startTime} nodes ${this.nodes} pv${pv}`);
                } else if (score >= MATE_SCORE && score <= MATE_VALUE) {
                    console.log(`info depth ${depth} score mate ${Math.round((MATE_VALUE - score) / 2)} time ${Date.now() - this.startTime} nodes ${this.nodes} pv${pv}`);
                } else {
                    console.log(`info depth ${depth} score cp ${Math.round(score)} time ${Date.now() - this.startTime} nodes ${this.nodes} pv${pv}`);
                }
            }

            // This is used to prevent cases where moves at a depth is not completely searched.
            // We will just use the best move of previous depth if time is up or forced-stopped.
            bestMove = this.pvTable[0][0];
        }

        console.log(`bestmove ${bestMove}`);
    }
}
