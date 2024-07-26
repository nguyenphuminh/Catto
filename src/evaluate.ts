import { Chess } from "chess.js";
import { mgTable, egTable, gamephaseInc, PIECE_NUM, mgMaterial, egMaterial } from "./evaluations";

function pcolor(side: string) { 
    return side === "w" ? 0 : 1;
}

export function evaluateBoard(chessObj: Chess) {
    const board = chessObj.board();
    const side = chessObj.turn();
    const us = pcolor(side), enemy = pcolor(side) ^ 1;

    const mg = [ 0, 0 ] // Early-mid game score
        , eg = [ 0, 0 ] // Endgame score
        , file = [ // Pawns on files
            [ 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0 ]
        ]
        , rooksOnFile = [ // Rooks on files
            new Array(8).fill(0),
            new Array(8).fill(0)
        ], kingsOnFile = [ // Kings on files
            new Array(8).fill(0),
            new Array(8).fill(0)
        ];

    let gamePhase = 0;

    // King safety
    let kingScore = 0;

    // Evaluate material and position and guessing current game phase
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === null) continue;

            const colorStr = board[x][y]!.color;
            const color = pcolor(colorStr);
            const pieceType = board[x][y]!.type;

            // Count material and square value
            mg[color] += mgMaterial[PIECE_NUM[pieceType]] + mgTable[colorStr + pieceType][x][y];
            eg[color] += egMaterial[PIECE_NUM[pieceType]] + egTable[colorStr + pieceType][x][y];

            // Guess game phase based on material
            gamePhase += gamephaseInc[PIECE_NUM[pieceType]];

            // Count pawns in a file
            if (pieceType === "p") {
                file[color][y] += 1;
            }

            // Check if rook is in a file
            if (pieceType === "r") {
                rooksOnFile[color][y] += 1;
            }

            // Check king shield
            if (pieceType === "k") {
                let shieldBonus = 0;

                if (board[x] && board[x][y-1] && board[x][y-1]!.color === colorStr) { shieldBonus += 5; }
                if (board[x] && board[x][y+1] && board[x][y+1]!.color === colorStr) { shieldBonus += 5; }
                if (board[x-1] && board[x-1][y] && board[x-1][y]!.color === colorStr) { shieldBonus += 5; }
                if (board[x+1] && board[x+1][y] && board[x+1][y]!.color === colorStr) { shieldBonus += 5; }
                if (board[x-1] && board[x-1][y-1] && board[x-1][y-1]!.color === colorStr) { shieldBonus += 5; }
                if (board[x+1] && board[x+1][y+1] && board[x+1][y+1]!.color === colorStr) { shieldBonus += 5; }
                if (board[x-1] && board[x-1][y+1] && board[x-1][y+1]!.color === colorStr) { shieldBonus += 5; }
                if (board[x+1] && board[x+1][y-1] && board[x+1][y-1]!.color === colorStr) { shieldBonus += 5; }

                kingScore += color === us ? shieldBonus : -shieldBonus;

                kingsOnFile[color][y] = 1;
            }
        }
    }

    // Pawn structure and rooks eval
    let pawnDeficit = 0, rookScore = 0;

    for (let index = 0; index < 8; index++) {
        // Doubled pawns eval
        pawnDeficit -= (file[us][index] >= 1 ? (file[us][index] - 1) * 20 : 0) - (file[enemy][index] >= 1 ? (file[enemy][index] - 1) * 20 : 0);

        // Rooks on open/half open file:
        rookScore += (file[us][index] === 0 ? 20 * rooksOnFile[us][index] : 0) - (file[enemy][index] === 0 ? 20 * rooksOnFile[enemy][index] : 0);

        // King on open/half open file:
        kingScore -= (file[us][index] === 0 ? 20 * kingsOnFile[us][index] : 0) - (file[enemy][index] === 0 ? 20 * kingsOnFile[enemy][index] : 0);

        // Isolated/passed pawns eval
        let isolatedPawnScore = 0, passedPawnScore = 0;

        // Isolated/passed pawns of us
        if (file[us][index] >= 1) {
            // Isolated pawns
            if (
                // If pawn is from b to g file
                (
                    index > 0 && 
                    index < 7 &&
                    file[us][index - 1] === 0 &&
                    file[us][index + 1] === 0
                ) ||
                // If pawn is from a file
                (
                    index === 0 &&
                    file[us][index + 1] === 0
                ) ||
                // If pawn is from h file
                (
                    index === 7 &&
                    file[us][index - 1] === 0
                )
            ) {
                isolatedPawnScore -= 10;
            }

            // Passed pawns
            if (
                // If pawn is from b to g file
                (
                    index > 0 && 
                    index < 7 &&
                    file[enemy][index - 1] === 0 &&
                    file[enemy][index + 1] === 0 &&
                    file[enemy][index] === 0
                ) ||
                // If pawn is from a file
                (
                    index === 0 &&
                    file[enemy][index + 1] === 0 &&
                    file[enemy][index] === 0
                ) ||
                // If pawn is from h file
                (
                    index === 7 &&
                    file[enemy][index - 1] === 0 &&
                    file[enemy][index] === 0
                )
            ) {
                passedPawnScore += 20;
            }
        }

        // Isolated/double pawns of the enemy
        if (file[enemy][index] >= 1) {
            if (
                // If pawn is from b to g file
                (
                    index > 0 && 
                    index < 7 &&
                    file[enemy][index - 1] === 0 &&
                    file[enemy][index + 1] === 0
                ) ||
                // If pawn is from a file
                (
                    index === 0 &&
                    file[enemy][index + 1] === 0
                ) ||
                // If pawn is from h file
                (
                    index === 7 &&
                    file[enemy][index - 1] === 0
                )
            ) {
                isolatedPawnScore += 10;
            }

            // Passed pawns
            if (
                // If pawn is from b to g file
                (
                    index > 0 && 
                    index < 7 &&
                    file[us][index - 1] === 0 &&
                    file[us][index + 1] === 0 &&
                    file[us][index] === 0
                ) ||
                // If pawn is from a file
                (
                    index === 0 &&
                    file[us][index + 1] === 0 &&
                    file[us][index] === 0
                ) ||
                // If pawn is from h file
                (
                    index === 7 &&
                    file[us][index - 1] === 0 &&
                    file[us][index] === 0
                )
            ) {
                passedPawnScore -= 20;
            }
        }

        pawnDeficit += isolatedPawnScore + passedPawnScore;
    }
    
    console.log(kingScore);

    // Mobility
    // Our bishop mobility
    let bishopMoves = chessObj.moves({ piece: "b" });
    let bishopScore = bishopMoves.length * 5;

    // Our queen mobility
    let queenMoves = chessObj.moves({ piece: "q" });
    mg[us] += queenMoves.length;
    eg[us] += queenMoves.length * 2;

    // Switch side
    let tokens = chessObj.fen().split(" ");
    tokens[1] = side === "w" ? "b" : "w";
    tokens[3] = '-'; // reset the en passant square
    const opChessObj = new Chess(tokens.join(" "));

    // Their bishop mobility
    let opBishopMoves = opChessObj.moves({ piece: "b" });
    bishopScore -= opBishopMoves.length * 5;

    // Their queen mobility
    let opQueenMoves = opChessObj.moves({ piece: "q" });
    mg[enemy] += opQueenMoves.length;
    eg[enemy] += opQueenMoves.length * 2;

    // Tapered eval
    let mgScore = mg[us] - mg[enemy];
    let egScore = eg[us] - eg[enemy];

    let mgPhase = gamePhase;
    
    if (mgPhase > 24) mgPhase = 24; // Early promotion might lead to out-of-bound score
    
    let egPhase = 24 - mgPhase;
    
    return (mgScore * mgPhase + egScore * egPhase) / 24 + pawnDeficit + rookScore + bishopScore + kingScore;
}
