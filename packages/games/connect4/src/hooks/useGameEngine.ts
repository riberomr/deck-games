import { useState, useCallback } from 'react';

export type Player = 'red' | 'yellow';
export type CellChecker = Player | null;
export type GameStatus = 'waiting' | 'playing' | 'won' | 'draw' | 'abandoned';

export interface GameState {
    board: CellChecker[][];
    currentPlayer: Player;
    winner: Player | null;
    status: GameStatus;
    winningCells: [number, number][] | null;
}

const ROWS = 6;
const COLS = 7;

export const useGameEngine = () => {
    const createBoard = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    const [board, setBoard] = useState<CellChecker[][]>(createBoard());
    const [currentPlayer, setCurrentPlayer] = useState<Player>('red');
    const [winner, setWinner] = useState<Player | null>(null);
    const [status, setStatus] = useState<GameStatus>('playing');
    const [winningCells, setWinningCells] = useState<[number, number][] | null>(null);

    const checkWin = (boardState: CellChecker[][], row: number, col: number, player: Player): [number, number][] | null => {
        // Directions: Horizontal, Vertical, Diagonal /, Diagonal \
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];

        for (const [dx, dy] of directions) {
            // Check positive direction
            let winningLine: [number, number][] = [[row, col]];

            for (let i = 1; i < 4; i++) {
                const r = row + dx * i;
                const c = col + dy * i;
                if (r < 0 || r >= ROWS || c < 0 || c >= COLS || boardState[r][c] !== player) break;
                winningLine.push([r, c]);
            }

            // Check negative direction
            for (let i = 1; i < 4; i++) {
                const r = row - dx * i;
                const c = col - dy * i;
                if (r < 0 || r >= ROWS || c < 0 || c >= COLS || boardState[r][c] !== player) break;
                winningLine.push([r, c]);
            }

            if (winningLine.length >= 4) return winningLine;
        }
        return null;
    };

    const playColumn = useCallback((colIndex: number) => {
        if (status !== 'playing') return;

        // Find the first empty row in the column from the bottom
        let rowIndex = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!board[r][colIndex]) {
                rowIndex = r;
                break;
            }
        }

        if (rowIndex === -1) return; // Column is full

        const newBoard = board.map((row: CellChecker[]) => [...row]);
        newBoard[rowIndex][colIndex] = currentPlayer;
        setBoard(newBoard);

        const winLine = checkWin(newBoard, rowIndex, colIndex, currentPlayer);
        if (winLine) {
            setWinner(currentPlayer);
            setWinningCells(winLine);
            setStatus('won');
        } else if (newBoard.every((row: CellChecker[]) => row.every((cell: CellChecker) => cell !== null))) {
            setStatus('draw');
        } else {
            setCurrentPlayer((prev: Player) => prev === 'red' ? 'yellow' : 'red');
        }
    }, [board, currentPlayer, status]);

    const resetGame = useCallback(() => {
        setBoard(createBoard());
        setCurrentPlayer('red');
        setWinner(null);
        setWinningCells(null);
        setStatus('playing');
    }, []);

    return {
        board,
        currentPlayer,
        winner,
        status,
        winningCells,
        playColumn,
        resetGame
    };
};
