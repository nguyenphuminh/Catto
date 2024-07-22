"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enpassant = exports.side = exports.castleHash = exports.hashTable = void 0;
exports.genZobristKey = genZobristKey;
const evaluations_1 = require("./evaluations");
const crypto_1 = __importDefault(require("crypto"));
function rand() {
    const buffer = crypto_1.default.randomBytes(8);
    return BigInt("0x" + buffer.toString("hex"));
}
function randBoard() {
    const board = [];
    for (let x = 0; x < 8; x++) {
        const row = [];
        for (let y = 0; y < 8; y++) {
            row.push(rand());
        }
        board.push(row);
    }
    return board;
}
function sqToXY(position) {
    const file = position[0].toLowerCase();
    const rank = position[1];
    const j = file.charCodeAt(0) - "a".charCodeAt(0);
    const i = 8 - parseInt(rank, 10);
    return [i, j];
}
exports.hashTable = [
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard()
];
exports.castleHash = [
    rand() /* Black king side */,
    rand() /* Black queen side */,
    rand() /* White king side */,
    rand() /* White queen side */,
];
exports.side = [
    rand() /* Black to move */,
    rand() /* White to move */
];
exports.enpassant = randBoard();
function genZobristKey(chessObj) {
    const board = chessObj.board();
    let hash = 0n;
    // Hash pieces' positions
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            if (board[x][y] === null)
                continue;
            const piece = board[x][y].type;
            const pieceColor = board[x][y].color;
            const pieceNum = evaluations_1.PIECE_NUM[piece];
            // Hash piece type
            hash ^= exports.hashTable[pieceNum][x][y];
            // Hash piece color
            hash ^= pieceColor === "b" ? exports.side[0] : exports.side[1];
        }
    }
    // Hash castling rights
    const fen = chessObj.fen();
    const castlingRights = fen.split(" ")[2];
    if (castlingRights.includes("k")) {
        hash ^= exports.castleHash[0];
    }
    if (castlingRights.includes("q")) {
        hash ^= exports.castleHash[1];
    }
    if (castlingRights.includes("K")) {
        hash ^= exports.castleHash[2];
    }
    if (castlingRights.includes("Q")) {
        hash ^= exports.castleHash[3];
    }
    // Hash turn
    hash ^= chessObj.turn() === "b" ? exports.side[0] : exports.side[1];
    // Hash enpassant square if any
    const epSquare = fen.split(" ")[3];
    if (epSquare !== "-") {
        const [epX, epY] = sqToXY(epSquare);
        hash ^= exports.enpassant[epX][epY];
    }
    return hash;
}
