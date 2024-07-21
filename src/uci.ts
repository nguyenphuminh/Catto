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
            switch (command) {
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

                default:
                    if (command.includes("position")) {
                        this.handlePosition(command);
                    }
                    
                    if (command.includes("go")) {
                        this.handleGo(command);
                    }
            }
        })
    }

    handlePosition(command: string) {
        const args = command.split(" ");

        // Load position
        if (args[1].includes("startpos")) { 
            this.engine = new Engine(this.engineOptions);
        } else if (args[1] === "fen") {
            this.engine = new Engine({ ...this.engineOptions, fen: command.split("position fen ")[1] });
        }

        // Load moves
        const movesString = command.split("moves ")[1];
        
        if (movesString) {
            const moves = command.split("moves ")[1].split(" ").filter(move => move.length !== 0);
    
            if (moves) {
                for (const move of moves) {
                    this.engine.chess.move(move);
                }
            }
        }
        // console.log(this.engine.chess.ascii());
    }

    handleGo(command: string) { // To be updated
        // const start = Date.now();
        const result = this.engine.findMove();

        console.log(`info depth ${result.depth} score cp ${Math.round(result.evaluation)} time ${result.time} nodes ${result.nodes} pv ${result.pvTable.join(" ")}`);
        console.log(`bestmove ${result.bestMove?.lan}`);
        // console.log(this.engine.nodes);
        // console.log(Date.now() - start);
    }
}
