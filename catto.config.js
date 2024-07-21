module.exports = {
    // Search depth
    searchDepth: 4,
    // Set to true to turn on debug mode, will log out useful info
    debug: false,
    // If you disable stable mode, features that are in-dev and might cause issues will be turned on
    stable: true,
    // The starting position represented as a FEN string
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    // Current version to show in UCI
    version: "v0.6.0",
    // Late move reduction config
    lmrFullDepth: 4, // Number of moves to be searched in full depth
    lmrMaxReduction: 3, // Only apply LMR above this depth
    // Search extensions config
    maxExtensions: 2 // Seach extension limit
}
