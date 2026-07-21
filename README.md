# Leaderboard

A full-stack leaderboard application built with React, TypeScript, Node.js, and SQLite.

The frontend displays player rankings, while the backend provides GET and POST APIs for reading and adding scores. Player data is stored permanently in a SQLite database.

## Technologies Used

- React
- TypeScript
- Vite
- Node.js
- SQLite
- HTML and CSS

## Features

- Display leaderboard rankings
- Sort players by score
- Show the top `n` players
- Add new player scores through the backend
- Store scores permanently in SQLite
- React frontend connected to a Node.js backend
- Responsive user interface

## Requirements

- Node.js version 22.5 or newer
- npm

Node.js 22.5 or newer is required because the backend uses the built-in `node:sqlite` module.

## Installation

Open a terminal in the `ranking` folder and install the dependencies:

npm install


## Database
The backend automatically creates a SQLite database at:

The database contains a players table.

Column	Type	Description
id	INTEGER	Unique player ID
name	TEXT	Player name
score	INTEGER	Player score
The database is created automatically when the backend starts for the first time.


## Project Structure

ranking/
├── data/
│   └── leaderboard.sqlite
├── public/
├── src/
│   ├── main.tsx
│   ├── style.css
│   └── counter.ts
├── index.html
├── package.json
├── package-lock.json
├── server.mjs
├── tsconfig.json
├── vite.config.ts
└── README.md

Running the Complete Application
Use two terminals.

Terminal 1:
cd ranking
npm run server

Terminal 2:
cd ranking
npm run dev

Then open:
http://localhost:5173
The frontend will load leaderboard data from the backend, and the backend will read and write player scores in the SQLite database. ``````

