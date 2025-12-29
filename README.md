
# 🎮 Mini-Juegos Platform (Deck Games)

A modern, real-time multiplayer game platform built with **React**, **Supabase**, and **TurboRepo**.

Current Featured Game: **Online Connect 4**.

## 🚀 Technologies

-   **Frontend**: React, Vite, TailwindCSS
-   **Backend / DB**: Supabase (PostgreSQL, Realtime, Auth, Edge Functions)
-   **Monorepo**: TurboRepo, pnpm
-   **State Management**: Zustand, React Hooks
-   **Languages**: TypeScript (Strict)

## 📂 Project Structure

This project is organized as a Monorepo:

```
.
├── apps/
│   └── web/                # Main Next.js/Vite application (The Lobby & Game Client)
├── packages/
│   ├── connect4/           # Shared Game Logic & UI for Connect 4
│   └── card-game-template/ # Template for future card games
├── supabase/               # SQL Scripts for Database Setup, RPCs, and RLS
└── turbo.json              # Build system configuration
```

## 🛠️ Setup & Installation

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

2.  **Environment Variables**:
    Create a `.env` in `apps/web/`:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Run Development Server**:
    ```bash
    pnpm run dev
    ```

## 🧠 Real-Time Architecture (Zero Trust)

This project uses a "Zero Trust" architecture to ensure security and prevent cheating in multiplayer games.

### 1. The Database as the Source of Truth
We do **not** trust the client to calculate the game state. The client is merely a "View" and an "Input Device".
-   **Game State**: Stored in the `matches` table in PostgreSQL.
-   **Validation**: All game rules (Winning logic, Turn validation, Board updates) are executed inside PostgreSQL using **RPC (Remote Procedure Calls)**.

### 2. The Flow
1.  **Player Moves**: The client calls a function like `make_move_connect4(column)`.
2.  **Server Validates**:
    -   Is it this player's turn?
    -   Is the column valid?
    -   Is the game already over?
3.  **Server Updates**: If valid, the SQL function updates the `jsonb` board state in the `matches` table.
4.  **Realtime Broadcast**: Supabase detects the `UPDATE` in the database and instantly sends the new state to all subscribed clients via WebSockets.
5.  **Client Renders**: The React client receives the new `board` and re-renders the UI.

### 3. Security (RLS)
-   **Row Level Security** is enabled on all tables.
-   **No Direct Updates**: Clients generally CANNOT standard `UPDATE` the matches table directly. They must use the controlled RPC functions.
-   This prevents users from manipulating the client-side code to send "I Won" messages to the database.

### 4. Presence (Disconnect Handling)
We use **Supabase Realtime Presence** to track who is currently looking at the game.
-   **Sync**: A "heartbeat" is exchanged between the client and Supabase.
-   **Pause on Disconnect**: The frontend listens for `presence` sync events. If the opponent's presence disappears, the UI enters a "Paused" state, waiting for them to reconnect.

## 📝 Future Improvements
-   [ ] Add ELO Rating System
-   [ ] Implement Chat
-   [ ] Add "Spectator Mode" (by adjusting RLS)
