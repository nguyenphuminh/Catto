import { Engine } from "./dist/core.js";
import readline from "readline";
import config from "./catto.config.js";

const io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

io.question("Enter FEN value: ", fen => {
    const engine = new Engine({ ...config, fen });

    console.log("Move:\n", engine.findMove());

    console.log("Searched nodes:", engine.nodes);
    
    io.close();
});
