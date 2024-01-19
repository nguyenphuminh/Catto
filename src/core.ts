import { Chess, Color, Move } from "chess.js";
import { evaluateBoard } from "./evaluate.js";
import { mvv_lva, PIECE_NUM } from "./evaluations.js";

export interface EngineOptions {
    fen: string;
    debug: boolean;
    searchDepth: number;
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
    public debug: boolean;
    public searchDepth: number;
    public nodes: number = 0; // Searched nodes, used for debugging
    public ply: number = 0;
    public prevMove?: Move;
    public bestMove?: Move;
    public uci: boolean = false;
    // Used for killer move heuristic
    public killerMove = [ new Array(64).fill(null), new Array(64).fill(null) ];
    // Used for counter move heuristic
    public counterMove: Record<string, Move> = {};
    // Used for history move heuristic
    public historyMove: HistoryMove = {
        "b": [ {}, {}, {}, {}, {}, {} ],
        "w": [ {}, {}, {}, {}, {}, {} ]
    }

    constructor(options: EngineOptions) {
        this.fen = options.fen;
        this.debug = options.debug;
        this.searchDepth = options.searchDepth - 1;
        this.chess = new Chess(this.fen);
        this.uci = options.uci;
    }

    getMovePrio(move: Move): number {
        // Killer heuristic and history heuristic
        
        let priority = 0;
    
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
        const scoredMoves: { move: Move, priority: number }[] = [];
        
        for (const move of moves) { 
            scoredMoves.push({ move, priority: this.getMovePrio(move) }); 
        }

        return scoredMoves
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

    negamax(depth: number, alpha: number, beta: number): number {        
        this.nodes++;

        if (depth === 0) return this.quiescence(alpha, beta);

        // Get next moves
        let possibleMoves = this.chess.moves({ verbose: true });

        // Detecting checkmates and stalemates
        if (possibleMoves.length === 0) {    
            if (this.chess.inCheck()) {
                return -49000 + this.ply; // Checkmate

                // Ply is added because:
                // - In our checkmate, we would want the furthest path to checkmate
                // - In their checkmate, we would want the shortest path to checkmate
            }

            return 0; // Stalemate
        }

        // Sort moves
        possibleMoves = this.sortMoves(possibleMoves);

        let bestMoveSoFar: Move, oldAlpha = alpha;

        // Find the best move
        for (const move of possibleMoves) {
            // const tempMove = move;
            this.prevMove = move;

            // Make move
            this.ply++;
            this.chess.move(move);
            const score = -this.negamax(depth - 1, -beta, -alpha);

            // Take back move
            this.chess.undo();
            this.ply--;

            // Fail-hard beta cutoff
            if (score >= beta) {
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
                // Store history moves
                if (!move.captured) { // Only quiet moves
                    this.historyMove[move.color][PIECE_NUM[move.piece]][move.to] += depth;
                }

                alpha = score;

                // Store best move if it's root
                if (this.ply === 0) {
                    bestMoveSoFar = move;
                }
            }
        }

        // Found better move
        if (oldAlpha !== alpha) {
            this.bestMove = bestMoveSoFar!;
        }

        // Node fails low
        return alpha;
    }

    findMove() {
        this.negamax(this.searchDepth, -50000, 50000);

        return this.bestMove;
    }
}
