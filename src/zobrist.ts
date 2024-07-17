import { Chess } from "chess.js";
import { PIECE_NUM } from "./evaluations";
import crypto from "crypto";

function rand(): bigint {
    const buffer = crypto.randomBytes(8);

    return BigInt("0x" + buffer.toString("hex"));
}

function randBoard(): bigint[][] {
    const board: bigint[][] = [];

    for (let x = 0; x < 8; x++) {
        const row: bigint[] = [];

        for (let y = 0; y < 8; y++) {
            row.push(rand());
        }
        
        board.push(row);
    }

    return board;
}

function sqToXY(position: string) {
    const file = position[0].toLowerCase();
    const rank = position[1];

    const j = file.charCodeAt(0) - "a".charCodeAt(0);
    const i = 8 - parseInt(rank, 10);

    return [ i, j ];
}

export const hashTable = [
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard(),
    randBoard()
]

export const castleHash = [ 
    rand() /* Black king side */,
    rand() /* Black queen side */,
    rand() /* White king side */,
    rand() /* White queen side */,
];

export const side = [
    rand() /* Black to move */,
    rand() /* White to move */
]

export const enpassant = randBoard();

export function genZobristKey(chessObj: Chess) {
    const board = chessObj.board();

    let hash = 0n;

    // Hash pieces' positions
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            if (board[x][y] === null) continue;

            const piece = board[x][y]!.type;
            const pieceColor = board[x][y]!.color;
            const pieceNum = PIECE_NUM[piece];
            
            // Hash piece type
            hash ^= hashTable[pieceNum][x][y];
            // Hash piece color
            hash ^= pieceColor === "b" ? side[0] : side[1];
        }
    }

    // Hash castling rights
    const castlingRights = chessObj.fen().split(" ")[2];

    if (castlingRights.includes("k")) { hash ^= castleHash[0]; }
    if (castlingRights.includes("q")) { hash ^= castleHash[1]; }
    if (castlingRights.includes("K")) { hash ^= castleHash[2]; }
    if (castlingRights.includes("Q")) { hash ^= castleHash[3]; }

    // Hash turn
    hash ^= chessObj.turn() === "b" ? side[0] : side[1];

    // Hash enpassant square if any
    const epSquare = chessObj.fen().split(" ")[3];
    if (epSquare !== "-") {
        const [ epX, epY ] = sqToXY(epSquare);

        hash ^= enpassant[epX][epY];
    }

    return hash;
}
