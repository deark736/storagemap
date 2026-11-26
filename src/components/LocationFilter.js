import React from 'react';

function LocationFilter({ locations, value, onChange }) {
  return (
    <label style={{ display: 'block', marginBottom: '10px' }}>
      Filter by location{' '}
      <select
        aria-label="Filter items by location"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">All locations</option>
        {locations.map(({ location, depth }) => (
          <option key={location.id} value={location.id}>
            {`${'— '.repeat(depth)}${location.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LocationFilter;
