
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { CellChecker, Player, GameStatus } from '@repo/connect4';

interface OnlineGameState {
    board: CellChecker[][];
    currentTurn: string | null; // UUID of player
    status: GameStatus;
    winnerId: string | null;
}

export const useOnlineConnect4 = (matchId: string) => {
    const { user } = useAuth();
    const [board, setBoard] = useState<CellChecker[][]>(Array(6).fill(Array(7).fill(null)));
    const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
    const [status, setStatus] = useState<GameStatus>('playing');
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [player1, setPlayer1] = useState<string | null>(null);
    const [player2, setPlayer2] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [winningCells, setWinningCells] = useState<[number, number][] | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (!matchId) return;

        const fetchMatch = async () => {
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (error) {
                console.error('Error fetching match:', error);
                return;
            }

            if (data) {
                setPlayer1(data.player1_id);
                setPlayer2(data.player2_id);

                // Parse state
                const state = data.state;
                if (state) {
                    // Fallback to empty board if missing or empty
                    const rawBoard = (state.board && state.board.length > 0)
                        ? state.board
                        : Array(6).fill(Array(7).fill(0));

                    // Map 0/1/2 to null/'red'/'yellow'
                    const mappedBoard = rawBoard.map((row: any[]) =>
                        row.map((cell: number) => {
                            if (cell === 1) return 'red';
                            if (cell === 2) return 'yellow';
                            return null;
                        })
                    );

                    setBoard(mappedBoard);
                    setCurrentTurnId(state.current_turn);
                    // Check for winner in state if available, otherwise rely on winner_id
                    if (state.winner) setWinnerId(state.winner);
                }

                setStatus(data.status as GameStatus);
                setWinnerId(data.winner_id);
                setRematchId((data as any).rematch_match_id);
                setIsLoading(false);
            }
        };

        fetchMatch();
    }, [matchId]);

    const [isOpponentPresent, setIsOpponentPresent] = useState(true);

    // ... existing ...

    // Realtime Subscription
    useEffect(() => {
        if (!matchId || !user) return;

        const channel = supabase
            .channel(`match:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`
                },
                (payload) => {
                    // ... existing update logic ...
                    const newData = payload.new;
                    // ... (keep existing logic) ...
                    const state = newData.state;
                    if (state) {
                        const rawBoard = (state.board && state.board.length > 0)
                            ? state.board
                            : Array(6).fill(Array(7).fill(0));
                        // Map 0/1/2 to null/'red'/'yellow'
                        const mappedBoard = rawBoard.map((row: any[]) =>
                            row.map((cell: number) => {
                                if (cell === 1) return 'red';
                                if (cell === 2) return 'yellow';
                                return null;
                            })
                        );
                        setBoard(mappedBoard);
                        setCurrentTurnId(state.current_turn);
                    }
                    setStatus(newData.status as GameStatus);
                    setWinnerId(newData.winner_id);
                    setPlayer1(newData.player1_id);
                    setPlayer2(newData.player2_id);
                    if (newData.rematch_match_id) setRematchId(newData.rematch_match_id);
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const userIds = Object.keys(newState);

                // Check if opponent is present:
                // If I am P1, is P2 there? If I am P2, is P1 there?
                // Note: user IDs in presence are what we key by.
                // We initially set presence tracking to user.id below.

                if (player1 && player2) {
                    const opponentId = user.id === player1 ? player2 : player1;
                    // Check if opponentId is in the presences
                    // Presence keys might be the user_id if we track that way, or we scan values.
                    // Standard Supabase presence state: { 'uuid': [ { presence_ref: ... } ] }
                    // We will .track({ user_id: user.id })

                    const isPresent = Object.values(newState).some((presences: any) =>
                        presences.some((p: any) => p.user_id === opponentId)
                    );
                    setIsOpponentPresent(isPresent);
                } else {
                    // In waiting state, presence is just "is there anyone else?" or specific logic?
                    // User asked: "if the owner is not in the game ... finished".
                    // So if I am visitor and I see owner gone, I should know.
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, user, player1, player2]);

    // Handle Leave/Disconnect
    useEffect(() => {
        const handleUnload = async () => {
            // Best effort leave
            // We cannot await here effectively on close, but for navigation we can.
            // Using sendBeacon might be better but RPC is POST.
            // Only call leave if waiting (host cleaning up). If playing, we pause (do nothing).
            if (status === 'waiting') {
                await supabase.rpc('leave_match', { p_match_id: matchId });
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            // Also trigger on unmount if we are navigating away (active status)
            // But be careful not to trigger on simple re-renders. 
            // The empty dependency array [] of a parent component usually handles this if this hook is top level.
            // Actually, we don't want to leave if we are just hot-reloading.
            // Let's rely on 'beforeunload' for tab close. 
            // For navigation (Back button), the component unmounts.
        };
    }, [matchId, status]);

    const playColumn = async (colIndex: number) => {
        if (!user) return;

        console.log('Attempting Move:', {
            colIndex,
            userId: user.id,
            currentTurnId,
            isMyTurn: user.id === currentTurnId
        });

        if (currentTurnId !== user.id) {
            console.warn('Blocked Move: Not your turn (Frontend Check)');
            return;
        }

        // Optimistic update (optional, but RPC is fast enough usually)
        // For now, let's rely on RPC and Realtime to update the board to ensure consistency
        // Calling RPC
        const { data, error } = await supabase.rpc('make_move_connect4', {
            p_match_id: matchId,
            p_col_index: colIndex
        });

        if (error) {
            console.error('RPC Error making move:', error);
            alert(`Error: ${error.message}`);
        }
    };

    let currentPlayerColor: Player | null = null;
    if (user?.id === player1) currentPlayerColor = 'red';
    else if (user?.id === player2) currentPlayerColor = 'yellow';

    const isMyTurn = user?.id === currentTurnId;
    const currentTurnColor: Player = (currentTurnId === player1) ? 'red' : 'yellow';

    // Helper to calculate winner color
    let winnerColor: Player | null = null;
    if (winnerId) {
        winnerColor = winnerId === player1 ? 'red' : 'yellow';
    }

    // Map Backend Status ("finished") to Frontend Status ("won" or "draw")
    let displayStatus: GameStatus = status;
    if (status === 'finished' as any) { // Type assertion if 'finished' is missing from GameStatus
        if (winnerId) {
            displayStatus = 'won';
        } else {
            displayStatus = 'draw';
        }
    }

    const [rematchId, setRematchId] = useState<string | null>(null);

    // Extend initial fetch to get rematch_match_id (need to ensure interface has it if TS errors)
    // Extend Realtime to listen to UPDATE on matches (it handles generic updates so should be fine)

    const requestRematch = async () => {
        const { data, error } = await supabase.rpc('create_rematch', { p_old_match_id: matchId });
        if (error) throw error;
        return data;
    };

    return {
        board,
        currentPlayer: currentTurnColor, // For BoardUI
        status: displayStatus,
        winner: winnerColor,
        playColumn,
        isLoading,
        isMyTurn,
        playerColor: currentPlayerColor,
        winningCells,
        rematchId,
        requestRematch,
        isOpponentPresent
    };
};
