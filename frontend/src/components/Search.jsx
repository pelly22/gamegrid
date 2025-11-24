import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';

const Search = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [dictionary, setDictionary] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        fetch('/search_index.json')
            .then(res => res.json())
            .then(data => setDictionary(data))
            .catch(err => console.error("Failed to load search index:", err));
    }, []);

    const fuse = useMemo(() => {
        return new Fuse(dictionary, {
            keys: ['n'], // Search by name
            threshold: 0.3, // Fuzzy threshold (0.0 = exact, 1.0 = match anything)
            includeScore: true
        });
    }, [dictionary]);

    const handleSearch = () => {
        if (!query.trim()) return;

        const searchResults = fuse.search(query);
        // Map back to original items and limit to 10
        const topResults = searchResults.slice(0, 10).map(result => result.item);

        setResults(topResults);
        setHasSearched(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-600 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-bold">Guess a Game</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="relative mb-4">
                    <input
                        type="text"
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="Type game name and press Enter..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHasSearched(false); // Reset results on type
                        }}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                        🔍
                    </button>
                </div>

                {hasSearched && (
                    <div className="mb-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        Did you mean...
                    </div>
                )}

                <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                    {hasSearched && results.map(game => (
                        <li
                            key={game.id}
                            className="p-2 hover:bg-slate-700/50 cursor-pointer text-white border-b border-slate-700/50 last:border-0 flex items-center gap-3 rounded-lg transition-colors group"
                            onClick={() => onSelect(game)}
                        >
                            {game.c ? (
                                <img src={game.c} alt={game.n} className="w-10 h-14 object-cover rounded shadow-sm group-hover:scale-105 transition-transform" />
                            ) : (
                                <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-xs text-slate-600">?</div>
                            )}
                            <div>
                                <div className="font-bold text-sm md:text-base">{game.n}</div>
                                <div className="text-xs text-slate-400">{game.y}</div>
                            </div>
                        </li>
                    ))}
                    {hasSearched && results.length === 0 && (
                        <li className="p-4 text-slate-500 text-center italic">
                            No games found. Try a different spelling?
                        </li>
                    )}
                    {!hasSearched && query.length > 0 && (
                        <li className="p-4 text-slate-500 text-center text-sm">
                            Press <kbd className="bg-slate-700 px-1 rounded text-slate-300">Enter</kbd> to search
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Search;
