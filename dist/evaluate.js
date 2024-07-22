"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBoard = evaluateBoard;
const evaluations_1 = require("./evaluations");
function pcolor(side) {
    return side === "w" ? 0 : 1;
}
function evaluateBoard(chessObj) {
    const board = chessObj.board();
    const side = chessObj.turn();
    const mg = [0, 0], eg = [0, 0], file = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    let gamePhase = 0;
    // Evaluate material and position and guessing current game phase
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === null)
                continue;
            const color = pcolor(board[x][y].color);
            // Count material and square value
            mg[color] += evaluations_1.mgMaterial[evaluations_1.PIECE_NUM[board[x][y].type]] + evaluations_1.mgTable[board[x][y].color + board[x][y].type][x][y];
            eg[color] += evaluations_1.egMaterial[evaluations_1.PIECE_NUM[board[x][y].type]] + evaluations_1.egTable[board[x][y].color + board[x][y].type][x][y];
            // Guess game phase based on material
            gamePhase += evaluations_1.gamephaseInc[evaluations_1.PIECE_NUM[board[x][y].type]];
            // Count pawns in a file
            if (board[x][y].type === "p") {
                file[color][y] += 1;
            }
        }
    }
    // Pawn structure eval
    let pawnDeficit = 0, us = pcolor(side), enemy = pcolor(side) ^ 1;
    for (let index = 0; index < 8; index++) {
        // Doubled pawns of us
        pawnDeficit -= (file[us][index] >= 1 ? (file[us][index] - 1) * 20 : 0) - (file[enemy][index] >= 1 ? (file[enemy][index] - 1) * 20 : 0);
        let isolatedPawnScore = 0;
        // Isolated pawns of us
        if (file[us][index] >= 1) {
            if (
            // If pawn is from b to g file
            (index > 0 &&
                index < 7 &&
                file[us][index - 1] === 0 &&
                file[us][index + 1] === 0) ||
                // If pawn is from a file
                (index === 0 &&
                    file[us][index + 1] === 0) ||
                // If pawn is from h file
                (index === 7 &&
                    file[us][index - 1] === 0)) {
                isolatedPawnScore -= 10;
            }
        }
        // Isolated pawns of the opponent
        if (file[enemy][index] >= 1) {
            if (
            // If pawn is from b to g file
            (index > 0 &&
                index < 7 &&
                file[enemy][index - 1] === 0 &&
                file[enemy][index + 1] === 0) ||
                // If pawn is from a file
                (index === 0 &&
                    file[enemy][index + 1] === 0) ||
                // If pawn is from h file
                (index === 7 &&
                    file[enemy][index - 1] === 0)) {
                isolatedPawnScore += 10;
            }
        }
        pawnDeficit += isolatedPawnScore;
    }
    // Tapered eval
    let mgScore = mg[us] - mg[enemy];
    let egScore = eg[us] - eg[enemy];
    let mgPhase = gamePhase;
    if (mgPhase > 24)
        mgPhase = 24; // Early promotion might lead to out-of-bound score
    let egPhase = 24 - mgPhase;
    // console.log(chessObj.ascii(), (mgScore * mgPhase + egScore * egPhase) / 24);
    return (mgScore * mgPhase + egScore * egPhase) / 24 + pawnDeficit;
}
