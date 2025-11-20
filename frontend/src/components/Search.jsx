import React, { useState, useEffect } from 'react';

const Search = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [dictionary, setDictionary] = useState([]);

    useEffect(() => {
        fetch('/search_index.json')
            .then(res => res.json())
            .then(data => setDictionary(data))
            .catch(err => console.error("Failed to load search index:", err));
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = dictionary.filter(game =>
            game.n.toLowerCase().includes(lowerQuery)
        ).slice(0, 10); // Limit to 10 results

        setResults(filtered);
    }, [query, dictionary]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md border border-slate-600">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-bold">Select a Game</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <input
                    type="text"
                    className="w-full bg-slate-900 text-white border border-slate-700 rounded p-2 mb-4 focus:outline-none focus:border-blue-500"
                    placeholder="Search for a game..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />

                <ul className="max-h-60 overflow-y-auto">
                    {results.map(game => (
                        <li
                            key={game.id}
                            className="p-2 hover:bg-slate-700 cursor-pointer text-white border-b border-slate-700 last:border-0 flex items-center gap-3"
                            onClick={() => onSelect(game)}
                        >
                            {game.c && <img src={game.c} alt={game.n} className="w-10 h-14 object-cover rounded" />}
                            <div>
                                <div className="font-bold">{game.n}</div>
                                <div className="text-xs text-slate-400">{game.y}</div>
                            </div>
                        </li>
                    ))}
                    {query.length >= 2 && results.length === 0 && (
                        <li className="p-2 text-slate-500 text-center">No games found</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Search;
