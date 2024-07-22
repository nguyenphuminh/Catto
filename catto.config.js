module.exports = {
    // Current version to show in UCI
    version: "v0.7.0",
    // Late move reduction config
    lmrFullDepth: 4, // Number of moves to be searched in full depth
    lmrMaxReduction: 3, // Only apply LMR above this depth
    // Search extensions config
    maxExtensions: 2 // Seach extension limit
}
