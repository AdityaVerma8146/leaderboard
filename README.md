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

```bash
npm install
