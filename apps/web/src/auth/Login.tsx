
import React from 'react';
import { useAuth } from './AuthProvider';

export const Login = () => {
    const { signInWithGoogle, user, signOut } = useAuth();

    if (user) {
        return (
            <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-600 dark:text-zinc-400">
                    Signed in as <span className="font-bold text-zinc-900 dark:text-zinc-100">{user.email}</span>
                </p>
                <button
                    onClick={signOut}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 max-w-sm w-full mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Welcome to Connect 4</h2>
            <button
                onClick={signInWithGoogle}
                className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm w-full justification-center"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Sign in with Google</span>
            </button>
        </div>
    );
};
