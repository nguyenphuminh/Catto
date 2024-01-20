## The Catto chess engine

Meow...?


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

## What do we currently have?

### The engine

* Negamax search algorithm with Alpha-Beta pruning.
* Move ordering:
	* MVV-LVA heuristic.
	* Killer heuristic.
	* History heuristic.
	* Countermove heuristic.
* Checkmate and stalemate detection.
* Quiescence search.
* Evalution:
	* PeSTO evaluation.
	* Pawn structure.
* UCI (not tested in GUIs).


### Others

* A simple and not-that-intuitive console application that takes a FEN value and returns a move.


## This looks familiar...

This used to be the Meow chess engine but I have decided to rebuilt it from the ground up because the old codebase is too messy and I lost track of what I was doing. Catto is written in Typescript and is designed to be more modular.


## Copyrights

Copyrights © 2024 Nguyen Phu Minh.

This project is licensed under the GPL-3.0 License.
