import React, { useEffect, useState } from 'react';
import Search from './Search';

const Grid = () => {
    const [puzzle, setPuzzle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeCell, setActiveCell] = useState(null); // {r: 0, c: 0}

    // State with initializers from localStorage
    const [guesses, setGuesses] = useState(() => {
        const saved = localStorage.getItem('vgg_guesses');
        return saved ? JSON.parse(saved) : {};
    });
    const [lives, setLives] = useState(() => {
        const saved = localStorage.getItem('vgg_lives');
        return saved ? parseInt(saved) : 3;
    });
    const [gameState, setGameState] = useState(() => {
        const saved = localStorage.getItem('vgg_gamestate');
        return saved ? saved : 'playing';
    });

    useEffect(() => {
        fetch('/daily_puzzle.json')
            .then(res => res.json())
            .then(data => {
                setPuzzle(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load puzzle:", err);
                setLoading(false);
            });
    }, []);

    // Persist state
    useEffect(() => {
        localStorage.setItem('vgg_guesses', JSON.stringify(guesses));
        localStorage.setItem('vgg_lives', lives.toString());
        localStorage.setItem('vgg_gamestate', gameState);
    }, [guesses, lives, gameState]);

    useEffect(() => {
        if (!puzzle) return;
        if (gameState !== 'playing') return;

        const totalCells = puzzle.rows.length * puzzle.cols.length;
        const correctGuesses = Object.values(guesses).filter(g => g.correct).length;

        if (lives <= 0) {
            setGameState('lost');
        } else if (correctGuesses === totalCells) {
            setGameState('won');
        }
    }, [lives, guesses, puzzle, gameState]);

    const handleCellClick = (r, c) => {
        if (gameState !== 'playing') return;
        if (guesses[`${r},${c}`]) return; // Already guessed
        setActiveCell({ r, c });
    };

    const handleGameSelect = (game) => {
        const cellKey = `${activeCell.r},${activeCell.c}`;
        const validIds = puzzle.valid_answers[cellKey] || [];
        const isCorrect = validIds.includes(game.id);

        const newGuess = {
            game: { name: game.n, year: game.y, cover: game.c },
            correct: isCorrect,
            rarity: isCorrect ? Math.floor(Math.random() * 100) : 0 // Mock rarity
        };

        setGuesses(prev => ({ ...prev, [cellKey]: newGuess }));

        if (!isCorrect) {
            setLives(prev => prev - 1);
        }

        setActiveCell(null);
    };

    const handleGiveUp = () => {
        if (confirm("Are you sure you want to give up?")) {
            setLives(0);
            setGameState('lost');
        }
    };

    const handleReset = () => {
        if (confirm("Reset game progress?")) {
            localStorage.removeItem('vgg_guesses');
            localStorage.removeItem('vgg_lives');
            localStorage.removeItem('vgg_gamestate');
            window.location.reload();
        }
    };

    if (loading) return <div className="text-white text-center mt-10">Loading Grid...</div>;
    if (!puzzle) return <div className="text-red-500 text-center mt-10">Error loading puzzle.</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
            <h1 className="text-4xl font-bold text-white mb-4">Video Game Grid</h1>

            <div className="mb-6 flex gap-8 text-white text-xl font-bold items-center">
                <div className={lives > 0 ? "text-green-400" : "text-red-500"}>Lives: {lives}</div>
                <div className={gameState === 'won' ? "text-green-400" : gameState === 'lost' ? "text-red-500" : ""}>
                    {gameState === 'won' ? "YOU WON!" : gameState === 'lost' ? "GAME OVER" : "Playing"}
                </div>
                {gameState === 'playing' && (
                    <button onClick={handleGiveUp} className="text-sm bg-red-900 hover:bg-red-700 text-white px-3 py-1 rounded border border-red-600">
                        Give Up
                    </button>
                )}
                <button onClick={handleReset} className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded border border-slate-500">
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
                {/* Top-Left Empty Cell */}
                <div className="w-24 h-24 md:w-32 md:h-32"></div>

                {/* Column Headers */}
                {puzzle.cols.map((col, i) => (
                    <div key={`col-header-${i}`} className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                        <div className="bg-slate-800 text-white font-bold px-4 py-2 rounded-full border-2 border-slate-600 text-center text-xs md:text-sm shadow-lg w-full">
                            {col.label}
                        </div>
                    </div>
                ))}

                {/* Rows */}
                {puzzle.rows.map((row, rIdx) => (
                    <React.Fragment key={`row-${rIdx}`}>
                        {/* Row Header */}
                        <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                            <div className="bg-slate-800 text-white font-bold px-4 py-2 rounded-full border-2 border-slate-600 text-center text-xs md:text-sm shadow-lg w-full">
                                {row.label}
                            </div>
                        </div>

                        {/* Cells */}
                        {puzzle.cols.map((col, cIdx) => {
                            const cellKey = `${rIdx},${cIdx}`;
                            const guess = guesses[cellKey];

                            return (
                                <div
                                    key={`cell-${rIdx}-${cIdx}`}
                                    className={`w-24 h-24 md:w-32 md:h-32 rounded-lg border-2 transition-all flex flex-col items-center justify-center overflow-hidden relative shadow-inner
                    ${guess
                                            ? (guess.correct ? "bg-slate-800 border-green-500" : "bg-red-900/80 border-red-500")
                                            : "bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-blue-400 cursor-pointer"
                                        }
                  `}
                                    onClick={() => handleCellClick(rIdx, cIdx)}
                                >
                                    {guess ? (
                                        guess.correct && guess.game.cover ? (
                                            <>
                                                <img src={guess.game.cover} alt={guess.game.name} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 truncate text-center">
                                                    {guess.game.name}
                                                </div>
                                                <div className="absolute top-1 right-1 bg-green-600 text-white text-[10px] px-1 rounded font-bold shadow">
                                                    {guess.rarity}%
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-2 text-center">
                                                <div className="text-white font-bold text-xs md:text-sm line-clamp-3">{guess.game.name}</div>
                                                {guess.correct && <div className="text-green-400 text-xs mt-1">{guess.rarity}%</div>}
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-slate-500 text-2xl font-bold">+</span>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {activeCell && (
                <Search
                    onSelect={handleGameSelect}
                    onClose={() => setActiveCell(null)}
                />
            )}
        </div>
    );
};

export default Grid;
