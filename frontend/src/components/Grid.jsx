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
    const [guessesLeft, setGuessesLeft] = useState(() => {
        const saved = localStorage.getItem('vgg_guesses_left');
        return saved ? parseInt(saved) : 9;
    });
    const [gameState, setGameState] = useState(() => {
        const saved = localStorage.getItem('vgg_gamestate');
        return saved ? saved : 'playing';
    });
    const [lastPlayedDate, setLastPlayedDate] = useState(() => {
        return localStorage.getItem('vgg_last_played_date');
    });
    const [timeToNext, setTimeToNext] = useState("");

    useEffect(() => {
        fetch('/daily_puzzle.json')
            .then(res => res.json())
            .then(data => {
                setPuzzle(data);
                setLoading(false);

                // Check for daily reset
                if (data.id !== lastPlayedDate) {
                    // New day, new puzzle! Reset everything.
                    setGuesses({});
                    setGuessesLeft(9);
                    setGameState('playing');
                    setLastPlayedDate(data.id);
                    localStorage.setItem('vgg_guesses', JSON.stringify({}));
                    localStorage.setItem('vgg_guesses_left', "9");
                    localStorage.setItem('vgg_gamestate', 'playing');
                    localStorage.setItem('vgg_last_played_date', data.id);
                }
            })
            .catch(err => {
                console.error("Failed to load puzzle:", err);
                setLoading(false);
            });
    }, []);

    // Countdown Timer
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCHours(24, 0, 0, 0); // Next midnight UTC
            const diff = tomorrow - now;

            if (diff <= 0) {
                // Refresh page if it's time for a new puzzle
                window.location.reload();
                return;
            }

            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeToNext(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(timerId);
    }, []);

    // Persist state
    useEffect(() => {
        localStorage.setItem('vgg_guesses', JSON.stringify(guesses));
        localStorage.setItem('vgg_guesses_left', guessesLeft.toString());
        localStorage.setItem('vgg_gamestate', gameState);
    }, [guesses, guessesLeft, gameState]);

    useEffect(() => {
        if (!puzzle) return;
        if (gameState !== 'playing') return;

        const totalCells = puzzle.rows.length * puzzle.cols.length;
        const correctGuesses = Object.values(guesses).filter(g => g.correct).length;

        if (guessesLeft <= 0) {
            if (correctGuesses === totalCells) {
                setGameState('won');
            } else {
                setGameState('lost');
            }
        } else if (correctGuesses === totalCells) {
            setGameState('won');
        }
    }, [guessesLeft, guesses, puzzle, gameState]);

    const handleCellClick = (r, c) => {
        if (gameState !== 'playing') return;
        if (guesses[`${r},${c}`]) return; // Already guessed correctly
        setActiveCell({ r, c });
    };

    const handleGameSelect = (game) => {
        const cellKey = `${activeCell.r},${activeCell.c}`;
        const validIds = puzzle.valid_answers[cellKey] || [];
        const isCorrect = validIds.includes(game.id);

        // Always decrement guesses
        setGuessesLeft(prev => prev - 1);

        if (isCorrect) {
            const newGuess = {
                game: { name: game.n, year: game.y, cover: game.c },
                correct: true,
                rarity: Math.floor(Math.random() * 100) // Mock rarity
            };
            setGuesses(prev => ({ ...prev, [cellKey]: newGuess }));
        } else {
            // Incorrect guess: Cell stays open, but we lose a guess.
            // Optionally alert the user or show a temporary "Miss" animation
            alert("Incorrect! That game doesn't match.");
        }

        setActiveCell(null);
    };

    const handleGiveUp = () => {
        if (confirm("Are you sure you want to give up?")) {
            setGuessesLeft(0);
            setGameState('lost');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-pulse text-blue-400 font-bold text-xl">Loading Grid...</div>
        </div>
    );

    if (!puzzle) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-red-500 font-bold">Error loading puzzle.</div>
        </div>
    );

    const score = Object.values(guesses).filter(g => g.correct).length;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black p-4 font-sans">
            {/* Title with Gradient */}
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-8 tracking-tight drop-shadow-lg">
                Gamegrid
            </h1>

            {/* Glassmorphism Stats Bar */}
            <div className="mb-8 flex gap-6 text-white text-lg font-semibold items-center bg-white/5 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 text-blue-400">
                    <span>Guesses:</span>
                    <span className="text-2xl">{guessesLeft}</span>
                </div>
                <div className="h-6 w-px bg-white/20"></div>
                <div className="flex items-center gap-2 text-green-400">
                    <span>Score:</span>
                    <span className="text-2xl">{score}/9</span>
                </div>
                <div className="h-6 w-px bg-white/20"></div>
                <div className={`${gameState === 'won' ? "text-green-400" : gameState === 'lost' ? "text-red-500" : "text-slate-200"}`}>
                    {gameState === 'won' ? "VICTORY!" : gameState === 'lost' ? "GAME OVER" : "Playing"}
                </div>

                <div className="h-6 w-px bg-white/20"></div>
                <div className="text-slate-400 text-sm font-mono">
                    Next: {timeToNext}
                </div>

                {(gameState === 'playing') && (
                    <>
                        <div className="h-6 w-px bg-white/20"></div>
                        <button
                            onClick={handleGiveUp}
                            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-4 py-2 rounded-lg border border-red-500/30 transition-colors uppercase tracking-wider"
                        >
                            Give Up
                        </button>
                    </>
                )}
            </div>

            {/* Main Grid Container */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 p-4 bg-black/20 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-sm">
                {/* Top-Left Empty Cell - Strict Sizing */}
                <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0"></div>

                {/* Column Headers */}
                {puzzle.cols.map((col, i) => (
                    <div key={`col-header-${i}`} className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                        <div className="bg-slate-800/80 text-slate-200 font-bold px-2 py-3 rounded-xl border border-slate-700/50 text-center text-xs md:text-sm shadow-lg w-full h-full flex items-center justify-center backdrop-blur-sm">
                            {col.label}
                        </div>
                    </div>
                ))}

                {/* Rows */}
                {puzzle.rows.map((row, rIdx) => (
                    <React.Fragment key={`row-${rIdx}`}>
                        {/* Row Header */}
                        <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                            <div className="bg-slate-800/80 text-slate-200 font-bold px-2 py-3 rounded-xl border border-slate-700/50 text-center text-xs md:text-sm shadow-lg w-full h-full flex items-center justify-center backdrop-blur-sm">
                                {row.label}
                            </div>
                        </div>

                        {/* Cells */}
                        {puzzle.cols.map((col, cIdx) => {
                            const cellKey = `${rIdx},${cIdx}`;
                            const guess = guesses[cellKey];
                            const isActive = activeCell && activeCell.r === rIdx && activeCell.c === cIdx;

                            return (
                                <div
                                    key={`cell-${rIdx}-${cIdx}`}
                                    className={`
                                        w-24 h-24 md:w-32 md:h-32 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden relative shadow-inner group
                                        ${guess
                                            ? (guess.correct ? "bg-slate-900 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-red-900/50 border-red-500/50")
                                            : isActive
                                                ? "bg-slate-800 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)] scale-105 z-10"
                                                : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-500 cursor-pointer hover:scale-[1.02]"
                                        }
                                    `}
                                    onClick={() => handleCellClick(rIdx, cIdx)}
                                >
                                    {guess ? (
                                        guess.correct && guess.game.cover ? (
                                            <>
                                                <img src={guess.game.cover} alt={guess.game.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-1 px-1">
                                                    <div className="text-white text-[10px] md:text-xs font-medium truncate text-center leading-tight">
                                                        {guess.game.name}
                                                    </div>
                                                </div>
                                                <div className="absolute top-1 right-1 bg-green-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-sm backdrop-blur-sm">
                                                    {guess.rarity}%
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-2 text-center w-full">
                                                <div className="text-white font-bold text-xs md:text-sm line-clamp-3 leading-tight">{guess.game.name}</div>
                                                {guess.correct && <div className="text-green-400 text-xs mt-1 font-mono">{guess.rarity}%</div>}
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-slate-600 text-3xl font-light group-hover:text-slate-400 transition-colors">+</span>
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
