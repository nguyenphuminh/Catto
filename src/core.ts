import { Chess, Move } from "chess.js";
import { evaluateBoard } from "./evaluate";
import { mvv_lva, PIECE_NUM, mgMaterial } from "./evaluations";
import { genZobristKey } from "./zobrist";

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
    debug: boolean;
    stable: boolean;
    searchDepth: number;
    lmrFullDepth: number;
    lmrMaxReduction: number;
    maxExtensions: number;
    uci: boolean;
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
    public bestMove?: Move;
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
    public pvTable: string[];

    constructor(options: EngineOptions) {
        this.fen = options.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.searchDepth = options.searchDepth || 64;
        this.chess = new Chess(this.fen);
        this.uci = options.uci;
        this.lmrMaxReduction = options.lmrMaxReduction;
        this.lmrFullDepth = options.lmrFullDepth;
        this.maxExtensions = options.maxExtensions;

        this.pvTable = new Array(this.searchDepth).fill("");
    }

    // Tranposition table
    public hashTable: Record<string, HashEntry> = {};

    recordHash(score: number, depth: number, hashFlag: HashFlag, move: Move) {
        // if (this.stable) return;

        const hash = genZobristKey(this.chess).toString();
        // const hash = this.chess.fen();
        
        this.hashTable[hash] = {
            score,
            depth,
            hashFlag,
            move
        }
    }

    probeHash(alpha: number, beta: number, depth: number): number {
        const hash = genZobristKey(this.chess).toString();
        // const hash = this.chess.fen();

        const hashEntry = this.hashTable[hash];

        if (!hashEntry)
            // If position does not exist the transposition table
            return 99999;
        
        if (depth <= hashEntry.depth) {
            let score = hashEntry.score;

            if (score < -48000) score += this.ply;
            if (score > 48000) score -= this.ply;

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
    getMovePrio(move: Move, currentBoardHash: string): number {
        let priority = 0;

        // Hash Move
        // const currentBoardHash = this.chess.fen();
        if (
            this.hashTable[currentBoardHash] && 
            this.hashTable[currentBoardHash].move &&
            move.san === this.hashTable[currentBoardHash].move.san
        ) {
            priority += 100000;
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

    sortMoves(moves: Move[]) {
        const currentBoardHash = genZobristKey(this.chess).toString();

        return moves
            .map(move => ({ move, priority: this.getMovePrio(move, currentBoardHash) }))
            .sort((moveA, moveB) => moveB.priority - moveA.priority)
            .map(scoredMove => scoredMove.move);
    }

    // Quiescence search
    quiescence(alpha: number, beta: number): number {
        // increment nodes count
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
        const inCheck = this.chess.inCheck();

        this.nodes++;

        let hashFlag = HashFlag.alpha;

        // Detecting 3-fold repetition
        if (this.ply && this.chess.isThreefoldRepetition()) {
            this.recordHash(0, depth, HashFlag.exact, this.prevMove!);
            return 0;
        }

        // Check if position exists in transposition table
        let score = this.probeHash(alpha, beta, depth);

        if (this.ply && score !== 99999)
            return score;

        // Quiescence search
        if (depth === 0) return this.quiescence(alpha, beta);

        // Null move pruning
        if (this.ply && depth >= 3 && !inCheck) {
            // Preserve old moves to reconstruct chess obj
            const oldMoves = this.chess.history();

            // Make null move
            let tokens = this.chess.fen().split(" ");
            tokens[1] = this.chess.turn() === "w" ? "b" : "w";
            tokens[3] = '-' // reset the en passant square
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
                return -49000 + this.ply; // Checkmate

                // Ply is added because:
                // - In our checkmate, we would want the furthest path to checkmate
                // - In their checkmate, we would want the shortest path to checkmate
            }

            return 0; // Stalemate
        }

        // Calculate extensions
        const extensions = extended < this.maxExtensions ? this.calculateExtensions(possibleMoves.length, inCheck) : 0;

        // Sort moves
        possibleMoves = this.sortMoves(possibleMoves);
        let searchedMoves = 0, bestMoveSoFar: Move;

        // Futility pruning
        let fpEnabled = false;
        if (depth < 4 && Math.abs(alpha) < 48000) {
            const currentEval = evaluateBoard(this.chess);
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
                this.recordHash(beta, depth, HashFlag.beta, move);

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

                // Store best move if it's root
                if (this.ply === 0) {
                    this.bestMove = move;
                }

                // Store pv move
                this.pvTable[this.ply] = move.lan;
            }
        }

        this.recordHash(alpha, depth, hashFlag, bestMoveSoFar!);

        // Node fails low
        return alpha;
    }

    findMove() {
        // Iterative deepening with aspiration windows
        this.startTime = Date.now();

        let alpha = -50000, beta = 50000, score = 0, currentBestMove = null;

        for (let depth = 1; depth <= this.searchDepth; depth++) {
            // Stop searching if forced to stop
            if (this.stopped || Date.now() - this.startTime > this.timeout) {
                break;
            }

            score = this.negamax(depth, alpha, beta, 0);

            if (score <= alpha || score >= beta) {
                alpha = -50000;    
                beta = 50000;
                depth--;
                continue;
            }

            alpha = score - 50;
            beta = score + 50;

            console.log(`info depth ${depth} score cp ${Math.round(score)} time ${Date.now() - this.startTime} nodes ${this.nodes} pv ${this.pvTable.join(" ").trim()}`);

            currentBestMove = this.bestMove;
        }

        console.log(`bestmove ${currentBestMove?.lan}`);
    }
}
