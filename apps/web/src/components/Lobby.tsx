
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface Match {
    id: string;
    player1_id: string;
    player2_id: string | null;
    status: 'waiting' | 'playing' | 'finished';
    created_at: string;
    profiles: { username: string } | null; // Joined profile
}

export const Lobby = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMatches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                player1:player1_id (username)
            `)
            .eq('status', 'waiting')
            .order('created_at', { ascending: false });

        setLoading(false);

        if (error) {
            console.error('Error fetching matches:', error);
            // Optional: Set an error state to display to user
        } else if (data) {
            // Transform data to match interface if needed, primarily handling the join
            setMatches(data as any);
        }
    };

    useEffect(() => {
        fetchMatches();

        // Subscribe to new matches
        const channel = supabase
            .channel('lobby')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'matches' }, // broaden filter to debug
                () => {
                    fetchMatches();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createMatch = async () => {
        if (!user) return;
        setLoading(true);
        // Create match
        const { data, error } = await supabase
            .from('matches')
            .insert({
                player1_id: user.id,
                mode: 'online',
                status: 'waiting'
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert('Error creating match');
            setLoading(false);
        } else if (data) {
            navigate(`/online/${data.id}`);
        }
    };

    const joinMatch = async (matchId: string) => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase.rpc('join_match', { p_match_id: matchId });

        if (error) {
            console.error(error);
            alert('Error joining match: ' + error.message);
            setLoading(false);
        } else {
            // Wait a bit or navigate immediately
            navigate(`/online/${matchId}`);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Lobby</h2>
                <div className="flex gap-2">
                    <button
                        onClick={fetchMatches}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        title="Refresh List"
                    >
                        ↻
                    </button>
                    <button
                        onClick={createMatch}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Match'}
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {matches.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                        No waiting matches found. Create one!
                    </div>
                ) : (
                    matches.map((match: any) => (
                        <div key={match.id} className="flex justify-between items-center p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
                            <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                    vs {match.player1?.username || 'Unknown Player'}
                                </h3>
                                <p className="text-xs text-zinc-500">
                                    Created {new Date(match.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                            {match.player1_id !== user?.id && (
                                <button
                                    onClick={() => joinMatch(match.id)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    Join
                                </button>
                            )}
                            {match.player1_id === user?.id && (
                                <button
                                    disabled
                                    className="px-4 py-2 bg-zinc-400 text-white rounded-lg cursor-not-allowed"
                                >
                                    Waiting...
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
