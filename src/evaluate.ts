import { Chess, PieceSymbol } from "chess.js";
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
        ];

    let gamePhase = 0;

    // Evaluate material and position and guessing current game phase
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === null) continue;

            const color = pcolor(board[x][y]!.color);

            // Count material
            mg[color] += mgMaterial[PIECE_NUM[board[x][y]!.type]];
            eg[color] += egMaterial[PIECE_NUM[board[x][y]!.type]];

            // Count square value
            mg[color] += mgTable[board[x][y]!.color + board[x][y]!.type][x][y];
            eg[color] += egTable[board[x][y]!.color + board[x][y]!.type][x][y];

            // Guess game phase based on material
            gamePhase += gamephaseInc[PIECE_NUM[board[x][y]!.type]];

            // Count pawns in a file
            if (board[x][y]!.type === "p") {
                file[pcolor(board[x][y]!.color)][y] += 1;
            }
        }
    }

    // Pawn structure eval
    let pawnDeficit = 0;

    for (let index = 0; index < 8; index++) {
        // Pawn deficit of us
        pawnDeficit -= file[pcolor(side)][index] >= 1 ? (file[pcolor(side)][index] - 1) * 20 : 0;
        // Pawn deficit of the opponent
        pawnDeficit += file[pcolor(side) ^ 1][index] >= 1 ? (file[pcolor(side) ^ 1][index] - 1) * 20 : 0;
    }

    // Tapered eval
    let mgScore = mg[pcolor(side)] - mg[pcolor(side) ^ 1];
    let egScore = eg[pcolor(side)] - eg[pcolor(side) ^ 1];

    let mgPhase = gamePhase;
    
    if (mgPhase > 24) mgPhase = 24; // Early promotion might lead to out-of-bound score
    
    let egPhase = 24 - mgPhase;

    // console.log(chessObj.ascii(), (mgScore * mgPhase + egScore * egPhase) / 24);
    
    return (mgScore * mgPhase + egScore * egPhase) / 24 + pawnDeficit;
}
