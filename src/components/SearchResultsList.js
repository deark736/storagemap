import React from 'react';

function findLocationWithPath(locations, targetId, path = []) {
  for (const location of locations) {
    const currentPath = [...path, location];
    if (Number(location.id) === Number(targetId)) {
      return { location, path: currentPath };
    }
    const childMatch = findLocationWithPath(location.children || [], targetId, currentPath);
    if (childMatch) {
      return childMatch;
    }
  }
  return null;
}

function SearchResultsList({ items, inventory, loading, error, onSelectResult }) {
  if (error) {
    return (
      <div
        role="list"
        aria-label="Search results"
        style={{ background: '#fff', border: '1px solid #ccc', borderTop: 0 }}
      >
        <p role="alert" style={{ margin: 0, padding: '8px', color: '#b00020' }}>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        role="list"
        aria-label="Search results"
        style={{ background: '#fff', border: '1px solid #ccc', borderTop: 0 }}
      >
        <p style={{ margin: 0, padding: '8px', color: '#666' }}>Searching...</p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Search results"
      style={{ background: '#fff', border: '1px solid #ccc', borderTop: 0 }}
    >
      {items.length > 0 ? items.map(item => {
        const match = findLocationWithPath(inventory, item.locationId);
        const locationId = match ? match.location.id : String(item.locationId);
        const pathNames = match ? match.path.map(part => part.name).join(' > ') : '';

        return (
          <button
            type="button"
            role="listitem"
            key={item.id}
            onClick={() => onSelectResult(locationId, String(item.id))}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px',
              textAlign: 'left',
              border: 0,
              borderBottom: '1px solid #eee',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <strong>{item.name}</strong>
            <span style={{ display: 'block', color: '#666', fontSize: '12px' }}>
              {pathNames}
            </span>
          </button>
        );
      }) : (
        <p style={{ margin: 0, padding: '8px', color: '#666' }}>No matching items found.</p>
      )}
    </div>
  );
}

export default SearchResultsList;