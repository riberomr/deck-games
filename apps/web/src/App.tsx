import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '@repo/ui';

// Lazy load games
const Connect4 = React.lazy(() => import('@repo/connect4').then(module => ({ default: module.Connect4Game })));
const CardGame = React.lazy(() => import('@repo/card-game-template').then(module => ({ default: module.CardGamePlaceholder })));

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        MiniGames
                    </Link>
                    <nav>
                        <Link to="/">
                            <Button variant="secondary" className="text-sm">Home</Button>
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6">
                {children}
            </main>
        </div>
    );
};

const Lobby = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2 py-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                    Choose Your Game
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                    Play locally with a friend on the same device. No account needed.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Connect 4" className="hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                        <div className="aspect-video bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <div className="grid grid-cols-7 gap-1 p-2">
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full ${i % 2 === 0 ? 'bg-red-500' : 'bg-yellow-400'}`} />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            The classic strategy game. Be the first to get four of your colored discs in a row.
                        </p>
                        <Button className="w-full" onClick={() => navigate('/play/connect4')}>
                            Play Connect 4
                        </Button>
                    </div>
                </Card>

                <Card title="Card Game (WIP)" className="opacity-75">
                    <div className="space-y-4">
                        <div className="aspect-video bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <span className="text-4xl">🃏</span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            A placeholder for a future card game. Coming soon to MiniGames.
                        </p>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/play/cards')}>
                            Preview Template
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Lobby />} />
                        <Route path="/play/connect4" element={<Connect4 />} />
                        <Route path="/play/cards" element={<CardGame />} />
                    </Routes>
                </Suspense>
            </Layout>
        </BrowserRouter>
    );
}

export default App;
