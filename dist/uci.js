"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UCI = void 0;
const core_js_1 = require("./core.js");
const readline_1 = __importDefault(require("readline"));
class UCI {
    engine;
    engineOptions;
    constructor(engineOptions) {
        this.engine = new core_js_1.Engine(engineOptions);
        this.engineOptions = engineOptions;
    }
    start() {
        const uci = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        uci.on("line", command => {
            switch (command.trim()) {
                case "uci":
                    console.log("id name Catto " + this.engineOptions.version);
                    console.log("id author nguyenphuminh");
                    console.log("uciok");
                    break;
                case "isready":
                    console.log("readyok");
                    break;
                case "ucinewgame":
                    this.handlePosition("position startpos");
                    break;
                case "quit":
                    process.exit(1);
                case "stop":
                    this.engine.stopped = true;
                    break;
                default:
                    if (command.startsWith("position")) {
                        this.handlePosition(command);
                    }
                    if (command.startsWith("go")) {
                        this.handleGo(command);
                    }
            }
        });
    }
    handlePosition(command) {
        const args = command.split(" "), movesString = command.split("moves ")[1];
        let fen = "";
        // Load position
        if (args[1] === "startpos") {
            fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        }
        else if (args[1] === "fen") {
            if (movesString) {
                fen = command.split("position fen ")[1].split(" moves ")[0];
            }
            else {
                fen = command.split("position fen ")[1];
            }
        }
        this.engine = new core_js_1.Engine({ ...this.engineOptions, fen });
        // Load moves
        if (movesString) {
            const moves = command.split("moves ")[1].split(" ").filter(move => move.length !== 0);
            if (moves) {
                for (const move of moves) {
                    this.engine.chess.move(move);
                }
            }
        }
    }
    handleGo(command) {
        const args = command.split(" ");
        const side = this.engine.chess.turn();
        let timeout = 99999999999;
        for (let i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "wtime":
                    if (side === "w") {
                        timeout = Math.floor(parseInt(args[i + 1]) * 1 / 30);
                        i++;
                    }
                    break;
                case "btime":
                    if (side === "b") {
                        timeout = Math.floor(parseInt(args[i + 1]) * 1 / 30);
                        i++;
                    }
                    break;
                case "movetime":
                    timeout = parseInt(args[i + 1]);
                    i++;
                    break;
            }
        }
        this.engine.timeout = timeout;
        this.engine.findMove();
    }
}
exports.UCI = UCI;
