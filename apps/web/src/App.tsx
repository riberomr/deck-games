import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '@repo/ui';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { Lobby as OnlineLobby } from './components/Lobby';
import { OnlineGame } from './pages/OnlineGame';

// Lazy load games
const Connect4 = React.lazy(() => import('@repo/connect4').then(module => ({ default: module.Connect4Game })));
const CardGame = React.lazy(() => import('@repo/card-game-template').then(module => ({ default: module.CardGamePlaceholder })));

const Layout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 transition-colors">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        MiniGames
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link to="/">
                            <Button variant="secondary" className="text-sm">Home</Button>
                        </Link>
                        {user ? (
                            <span className="text-sm text-zinc-500 hidden sm:inline">{user.email}</span>
                        ) : (
                            <span className="text-xs text-zinc-400">Offline</span>
                        )}
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6">
                {children}
            </main>
        </div>
    );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading Auth...</div>;
    if (!user) return <Login />;
    return <>{children}</>;
};

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2 py-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                    Choose Your Game
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                    Play locally or online with friends!
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Connect 4 (Local)" className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <div className="space-y-4">
                        <div className="aspect-video bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <span className="text-4xl">👥</span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Play locally on this device. No login required.
                        </p>
                        <Button className="w-full" onClick={() => navigate('/play/connect4')}>
                            Play Local
                        </Button>
                    </div>
                </Card>

                <Card title="Connect 4 (Online)" className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                    <div className="space-y-4">
                        <div className="aspect-video bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                            <span className="text-4xl">🌍</span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Challenge anyone online. Real-time multiplayer.
                        </p>
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => navigate('/online')}>
                            Play Online
                        </Button>
                    </div>
                </Card>

                <Card title="Card Game (WIP)" className="opacity-75">
                    <div className="space-y-4">
                        <div className="aspect-video bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <span className="text-4xl">🃏</span>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/play/cards')}>
                            Preview Template
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

import { ReloadPrompt } from './components/ReloadPrompt';

function App() {
    return (
        <AuthProvider>
            <ReloadPrompt />
            <BrowserRouter>
                <Layout>
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    }>
                        <Routes>
                            <Route path="/" element={<Home />} />

                            {/* Local Games */}
                            <Route path="/play/connect4" element={<Connect4 />} />
                            <Route path="/play/cards" element={<CardGame />} />

                            {/* Online Games */}
                            <Route path="/online" element={
                                <PrivateRoute>
                                    <OnlineLobby />
                                </PrivateRoute>
                            } />
                            <Route path="/online/:matchId" element={
                                <PrivateRoute>
                                    <OnlineGame />
                                </PrivateRoute>
                            } />
                        </Routes>
                    </Suspense>
                </Layout>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
