# Mini Juegos - PWA Monorepo

This is a Monorepo for a Multiplayer PWA Game Platform built with React, Vite, Turborepo, and Tailwind CSS.

## Structure

- **apps/web**: The main Shell application (PWA). Includes Lobby and Routing.
- **packages/ui**: Shared UI components (Buttons, Cards, Tailwind Config).
- **packages/games/connect4**: Full implementation of the Connect 4 game.
- **packages/games/card-game-template**: Boilerplate for future card games.

## Logic (Connect 4)

The Connect 4 game uses a local `useGameEngine` hook separated from the UI.
It supports hot-seat multiplayer (two players on one device).

## How to Run

JXoO1dnNI8Duw044

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   This will start the web app at [http://localhost:3000](http://localhost:3000).

3. **Build**:
   ```bash
   pnpm build
   ```

## Requirements Checked
- [x] Monorepo with Turborepo & pnpm workspaces.
- [x] React + Vite + TypeScript.
- [x] Tailwind CSS.
- [x] Lazy loading of games.
- [x] Shared UI package.
- [x] Connect 4 Logic abstracted in `useGameEngine`.
- [x] Responsive Design.
