import React, { useEffect, useState } from 'react';
import { searchItems } from '../api/items';
import SearchResultsList from './SearchResultsList';

function ItemSearchBar({ inventory, locationId = null, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchItems(trimmed, locationId)
      .then(items => {
        if (cancelled) return;
        setResults(items);
        setError('');
      })
      .catch(e => {
        if (cancelled) return;
        setResults([]);
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, locationId]);

  return (
    <div style={{ width: '60%', margin: '0 auto', textAlign: 'left' }}>
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search for an item..."
        aria-label="Search for an item"
        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
      />
      {trimmed && (
        <SearchResultsList
          items={results}
          inventory={inventory}
          loading={loading}
          error={error}
          onSelectResult={onSelectResult}
        />
      )}
    </div>
  );
}

export default ItemSearchBar;