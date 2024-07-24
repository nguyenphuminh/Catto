import { Chess } from "chess.js";
import { mgTable, egTable, gamephaseInc, PIECE_NUM, mgMaterial, egMaterial } from "./evaluations";

function pcolor(side: string) { 
    return side === "w" ? 0 : 1;
}

export function evaluateBoard(chessObj: Chess) {
    const board = chessObj.board();
    const side = chessObj.turn();

    const mg = [ 0, 0 ]
        , eg = [ 0, 0 ]
        , file = [ 
            [ 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0 ]
        ]
        , rooksOnFile = [
            new Array(8).fill(0),
            new Array(8).fill(0)
        ];

    let gamePhase = 0;

    // Evaluate material and position and guessing current game phase
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === null) continue;

            const color = pcolor(board[x][y]!.color);

            // Count material and square value
            mg[color] += mgMaterial[PIECE_NUM[board[x][y]!.type]] + mgTable[board[x][y]!.color + board[x][y]!.type][x][y];
            eg[color] += egMaterial[PIECE_NUM[board[x][y]!.type]] + egTable[board[x][y]!.color + board[x][y]!.type][x][y];

            // Guess game phase based on material
            gamePhase += gamephaseInc[PIECE_NUM[board[x][y]!.type]];

            // Count pawns in a file
            if (board[x][y]!.type === "p") {
                file[color][y] += 1;
            }

            // Check if rook is in a file
            if (board[x][y]!.type === "r") {
                rooksOnFile[color][y] += 1;
            }
        }
    }

    // Pawn structure eval
    let pawnDeficit = 0, rookScore = 0, us = pcolor(side), enemy = pcolor(side) ^ 1;

    for (let index = 0; index < 8; index++) {
        // Doubled pawns eval
        pawnDeficit -= (file[us][index] >= 1 ? (file[us][index] - 1) * 20 : 0) - (file[enemy][index] >= 1 ? (file[enemy][index] - 1) * 20 : 0);

        // Rooks on open/half open file:
        rookScore += (file[us][index] === 0 ? 20 * rooksOnFile[us][index] : 0) - (file[enemy][index] === 0 ? 20 * rooksOnFile[enemy][index] : 0);

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

    // Tapered eval
    let mgScore = mg[us] - mg[enemy];
    let egScore = eg[us] - eg[enemy];

    let mgPhase = gamePhase;
    
    if (mgPhase > 24) mgPhase = 24; // Early promotion might lead to out-of-bound score
    
    let egPhase = 24 - mgPhase;
    
    return (mgScore * mgPhase + egScore * egPhase) / 24 + pawnDeficit + rookScore;
}
