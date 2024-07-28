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

## Play Catto

If you just want to play or use Catto, you can download the engine [in the releases page](https://github.com/nguyenphuminh/Catto/releases) and import it into a chess GUI (e.g. Arena, Cute Chess or Lucas Chess).

If you want to use Catto for development, follow the steps below.


## Dependencies 

* Node.js & npm

Note that you may also want to use Bun which is a much faster JS runtime env than Node.js.


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

If you are using Bun:
```
npm run bun-build
```

## Configure

There are several configurations for Catto that you can change in `catto.config.js` if you want:

```js
module.exports = {
    // Current version to show in UCI
    version: "v0.7.0",
    // Late move reduction config
    lmrFullDepth: 4, // Number of moves to be searched in full depth
    lmrMaxReduction: 3, // Only apply LMR above this depth
    // Search extensions config
    maxExtensions: 2 // Seach extension limit
}
```

Note that the config file is compiled with the engine itself, so if you are using the built version, like `catto.exe`, creating a `catto.config.js` file will have no effect.


## What do we currently have?

### The engine

* Principle variation search.
* Move ordering:
    * Hash move ordering.
    * PV move ordering.
    * MVV-LVA heuristic.
    * Killer heuristic.
    * History heuristic.
    * Countermove heuristic.
* Transposition table.
* Pruning:
    * Reverse futility pruning.
    * Null-move pruning.
    * Razoring.
    * Futility pruning.
    * Delta pruning.
* Late move reductions.
* Search extensions:
    * Check extensions.
    * One reply extensions.
* Quiescence search.
* Iterative deepening.
* Aspiration windows.
* Time control:
    * Fixed time per move: 1/30 of the remaining time.
* Evalution:
    * PeSTO evaluation (PST, materials, and tapered evaluation).
    * Isolated, doubled and passed pawns bonus/penalty.
    * Mobility:
        * Rook on open/half-open file bonus.
        * Bishop legal moves.
        * Queen legal moves.
    * King safety:
        * Penalty if king is on half-open file.
        * Bonus if king has pieces nearby.
* UCI.


## Todos

See todos for Catto [here](https://github.com/users/nguyenphuminh/projects/2).


## Copyrights

Copyrights © 2024 Nguyen Phu Minh.

This project is licensed under the GPL-3.0 License.
