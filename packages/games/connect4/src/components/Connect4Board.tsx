import React from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { BoardUI } from './BoardUI';

export const Connect4Game = () => {
    const { board, currentPlayer, winner, status, winningCells, playColumn, resetGame } = useGameEngine();

    return (
        <BoardUI
            board={board}
            currentPlayer={currentPlayer}
            winner={winner}
            status={status}
            winningCells={winningCells}
            playColumn={playColumn}
            resetGame={resetGame}
            showResetButton={true}
        />
    );
};

