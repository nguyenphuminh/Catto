import { Engine, EngineOptions } from "./core.js";
import readline from "readline";

export class UCI {
    public engine: Engine;
    public engineOptions: EngineOptions;

    constructor(engineOptions: EngineOptions) {
        this.engine = new Engine(engineOptions);
        this.engineOptions = engineOptions;
    }

    start() {
        const uci = readline.createInterface({
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
                        setImmediate(() => this.handleGo(command));
                    }
            }
        })
    }

    handlePosition(command: string) {
        const args = command.split(" "), movesString = command.split("moves ")[1];
        
        let fen = "";

        // Load position
        if (args[1] === "startpos") {
            fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        } else if (args[1] === "fen") {
            if (movesString) {
                fen = command.split("position fen ")[1].split(" moves ")[0];
            } else {
                fen = command.split("position fen ")[1];
            }
        }

        this.engine = new Engine({ ...this.engineOptions, fen });

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

    handleGo(command: string) { // To be updated
        const args = command.split(" ");
        const side = this.engine.chess.turn();

        let timeout = 99999999999;

        for (let i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "wtime":
                    if (side === "w") {
                        timeout = Math.floor(parseInt(args[i+1]) * 1 / 30);
                        i++;
                    }

                    break;

                case "btime":
                    if (side === "b") {
                        timeout = Math.floor(parseInt(args[i+1]) * 1 / 30);
                        i++;
                    }

                    break;

                case "movetime":
                    timeout = parseInt(args[i+1]);
                    i++;

                    break;
                
                case "depth":
                    this.engine.searchDepth = parseInt(args[i+1]);

                    break;
            }
        }

        this.engine.timeout = timeout;
        this.engine.findMove();
    }
}
