import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameEngine, Player, CellChecker } from '../hooks/useGameEngine';
import { Disc } from './Disc';

export const Connect4Game = () => {
    const { board, currentPlayer, winner, status, winningCells, playColumn, resetGame } = useGameEngine();

    // Effect for confetti on win
    useEffect(() => {
        if (status === 'won') {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [status]);

    const isWinningCell = (row: number, col: number) => {
        if (!winningCells) return false;
        return winningCells.some(([r, c]) => r === row && c === col);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-4 w-full max-w-lg mx-auto">
            {/* Header / Status */}
            <div className="flex justify-between items-center w-full px-4 py-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    State: <span className="text-zinc-900 dark:text-zinc-100 uppercase">{status}</span>
                </div>
                {status === 'playing' ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Turn:</span>
                        <div className={`w-4 h-4 rounded-full ${currentPlayer === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                    </div>
                ) : (
                    <div className="font-bold text-green-600 dark:text-green-400">
                        {status === 'won' ? `${winner?.toUpperCase()} WINS!` : 'DRAW!'}
                    </div>
                )}
            </div>

            {/* Game Board */}
            <div className="relative p-3 bg-blue-600 rounded-lg shadow-lg">
                {/* Grid Container */}
                <div className="grid grid-cols-7 gap-2 md:gap-3">
                    {board.map((row: CellChecker[], rowIndex: number) => (
                        row.map((cell: CellChecker, colIndex: number) => {
                            const isWin = isWinningCell(rowIndex, colIndex);
                            const isDimmed = status === 'won' && !isWin;

                            return (
                                <button
                                    key={`${rowIndex}-${colIndex}`}
                                    onClick={() => playColumn(colIndex)}
                                    disabled={status !== 'playing' || !!board[0][colIndex]}
                                    className="group relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center focus:outline-none"
                                    aria-label={`Column ${colIndex + 1}, Row ${rowIndex + 1}`}
                                >
                                    {/* Empty Slot Background */}
                                    <div className="absolute inset-0 bg-blue-800 rounded-full opacity-20" />

                                    {/* Disc with Animation */}
                                    {cell && (
                                        <Disc
                                            color={cell}
                                            isWinning={isWin}
                                            isDimmed={isDimmed}
                                        />
                                    )}
                                </button>
                            );
                        })
                    ))}
                </div>
            </div>

            {/* Controls */}
            <button
                onClick={resetGame}
                className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
                Reset Game
            </button>
        </div>
    );
};
