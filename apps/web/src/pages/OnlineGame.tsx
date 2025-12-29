import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoardUI } from '@repo/connect4';
import { useOnlineConnect4 } from '../hooks/useOnlineConnect4';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

export const OnlineGame = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isJoining, setIsJoining] = React.useState(false);

    // Safety check
    if (!matchId) return <div>Invalid Match ID</div>;

    const {
        board,
        currentPlayer,
        status,
        winner,
        winningCells,
        playColumn,
        isLoading,
        isMyTurn,
        playerColor,
        rematchId,
        requestRematch,
        isOpponentPresent
    } = useOnlineConnect4(matchId);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl animate-pulse">Loading Match...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-4xl flex justify-between items-center mb-8">
                <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    &larr; Back to Lobby
                </button>
                <div className="text-xs text-zinc-400 font-mono">
                    Match: {matchId.slice(0, 8)}...
                </div>
            </div>

            {status === 'waiting' && (
                <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-dashed border-zinc-300 dark:border-zinc-700 animate-in fade-in zoom-in duration-300">
                    {/* CASE 1: I am the Host */}
                    {playerColor && (
                        <>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-blue-600 animate-pulse">Waiting for opponent...</h2>
                                <p className="text-zinc-500 max-w-sm">
                                    Share the link below with a friend to start the game immediately.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 w-full max-w-md">
                                <input
                                    readOnly
                                    value={window.location.href}
                                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        alert('Link copied!');
                                    }}
                                    className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                    Copy
                                </button>
                            </div>

                            <div className="text-xs text-zinc-400">
                                Match ID: <span className="font-mono">{matchId}</span>
                            </div>
                        </>
                    )}

                    {/* CASE 2: I am a Visitor (Not Player 1, and Match is Waiting) */}
                    {!playerColor && (
                        <div className="text-center space-y-4">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Join Match?</h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                You have been invited to play Connect 4.
                            </p>
                            <button
                                disabled={isJoining}
                                onClick={async () => {
                                    setIsJoining(true);
                                    const { error } = await supabase.rpc('join_match', { p_match_id: matchId });

                                    if (error) {
                                        // If error is "not in waiting state", check if we actually joined (race condition)
                                        if (error.message.includes('not in waiting state')) {
                                            // Fetch match details to see if we are player 2
                                            const { data } = await supabase.from('matches').select('player2_id').eq('id', matchId).single();
                                            if (data?.player2_id === user?.id) {
                                                // We are good, ignore error
                                                return;
                                            }
                                        }
                                        console.error("Join Match Error:", error);
                                        alert(error.message);
                                        setIsJoining(false);
                                    }
                                    // If success, Realtime will update status -> UI changes automatically
                                }}
                                className="px-8 py-3 bg-green-600 text-white text-lg font-bold rounded-full hover:bg-green-700 transition-transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:scale-100"
                            >
                                {isJoining ? 'JOINING...' : 'JOIN GAME'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {status !== 'waiting' && (
                <div className="flex flex-col items-center relative">
                    {/* Game Paused Overlay */}
                    {status === 'playing' && !isOpponentPresent && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl py-20">
                            <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4 animate-bounce-in">
                                <div className="text-4xl mb-4">⚠️</div>
                                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Opponent Disconnected</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                                    Waiting for them to reconnect...
                                </p>
                                <div className="animate-pulse text-zinc-400 text-sm">
                                    The game is paused.
                                </div>
                            </div>
                        </div>
                    )}

                    <BoardUI
                        board={board}
                        currentPlayer={currentPlayer}
                        winner={winner}
                        status={status}
                        winningCells={winningCells}
                        playColumn={playColumn}
                        resetGame={() => { }}
                        showResetButton={false}
                        playerColor={playerColor || undefined}
                    />

                    {status === 'playing' && (
                        <div className="mt-8 text-center">
                            {isMyTurn ? (
                                <div className="text-xl font-bold text-green-600 animate-bounce">
                                    YOUR TURN!
                                </div>
                            ) : (
                                <div className="text-zinc-500">
                                    Waiting for opponent...
                                </div>
                            )}
                        </div>
                    )}

                    {(status === 'won' || status === 'draw' || status === 'finished' as any) && (
                        <div className="mt-8 text-center space-y-4">
                            {rematchId ? (
                                <button
                                    onClick={() => window.location.href = `/online/${rematchId}`}
                                    className="px-8 py-3 bg-blue-600 text-white text-lg font-bold rounded-full hover:bg-blue-700 transition-transform hover:scale-105 shadow-xl animate-bounce"
                                >
                                    GO TO REMATCH &rarr;
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        try {
                                            await requestRematch();
                                        } catch (e: any) {
                                            alert(e.message);
                                        }
                                    }}
                                    className="px-8 py-3 bg-purple-600 text-white text-lg font-bold rounded-full hover:bg-purple-700 transition-transform hover:scale-105 shadow-xl"
                                >
                                    REMATCH?
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
