<div align="center">
    <br/>
    <img src="./assets/logo.png?"/>
    <br/>
    <div><b>The Catto Chess Engine</b></div>
    <br/>
    <a href="https://github.com/nguyenphuminh/Catto/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-GPLv3-blue.svg"/></a>
    <a href="https://github.com/nguyenphuminh/Catto/releases"><img src="https://img.shields.io/github/package-json/v/nguyenphuminh/Catto?label=stable"></a>
    <a href="https://github.com/nguyenphuminh/Catto/stargazers"><img src="https://img.shields.io/github/stars/nguyenphuminh/Catto?color=gold"></a>
</div>


## Dependencies 

* Node.js & npm


## Setup

1. Clone the repository to your machine.

2. Go to `./Catto/`, install the packages:
```
npm install
```

3. Compile Catto:
```
npx tsc
```

4. Fire up Catto!
```
node .
```

## Build into executable

In your console, type:
```
npm run build
```

## Configure

There are several configurations for Catto that you can change in `catto.config.js` if you want:

```js
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
```


## What do we currently have?

### The engine

* Principle variation search.
* Move ordering:
    * Hash move ordering.
    * MVV-LVA heuristic.
    * Killer heuristic.
    * History heuristic.
    * Countermove heuristic.
* Transposition table.
* Null-move pruning.
* Late move reductions.
* Search extensions:
    * Check extensions.
    * One reply extensions.
* Quiescence search.
* Evalution:
    * PeSTO evaluation.
    * Pawn structure.
* Checkmate and draw detection.
* UCI.


## Todos

See todos for Catto [here](https://github.com/users/nguyenphuminh/projects/2).


## Copyrights

Copyrights © 2024 Nguyen Phu Minh.

This project is licensed under the GPL-3.0 License.
