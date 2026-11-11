import React, { useState } from 'react';

function findLocation(locations, locationId) {
  for (const location of locations) {
    if (location.id === locationId) {
      return location;
    }

    const childMatch = findLocation(location.children || [], locationId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function findLocationPath(locations, locationId, path = []) {
  for (const location of locations) {
    const currentPath = [...path, location];
    if (location.id === locationId) {
      return currentPath;
    }

    const childPath = findLocationPath(location.children || [], locationId, currentPath);
    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function updateLocation(locations, locationId, update) {
  return locations.map(location => {
    if (location.id === locationId) {
      return update(location);
    }

    if (location.children?.length) {
      return {
        ...location,
        children: updateLocation(location.children, locationId, update)
      };
    }

    return location;
  });
}

function removeLocation(locations, locationId) {
  return locations
    .filter(location => location.id !== locationId)
    .map(location => ({
      ...location,
      children: removeLocation(location.children || [], locationId)
    }));
}

function flattenLocations(locations, depth = 0) {
  return locations.flatMap(location => [
    { location, depth },
    ...flattenLocations(location.children || [], depth + 1)
  ]);
}

function flattenItems(locations, path = []) {
  return locations.flatMap(location => {
    const currentPath = [...path, location];
    return [
      ...(location.items || []).map(item => ({ item, location, path: currentPath })),
      ...flattenItems(location.children || [], currentPath)
    ];
  });
}

function collectLocationIds(location) {
  return [location.id, ...(location.children || []).flatMap(collectLocationIds)];
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function InventoryView({ inventory, setInventory }) {
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editedItemName, setEditedItemName] = useState('');
  const [movingItemId, setMovingItemId] = useState(null);
  const [movingLocation, setMovingLocation] = useState(false);
  const [targetLocationId, setTargetLocationId] = useState('');

  const selectedLocation = selectedLocationId === null
    ? null
    : findLocation(inventory, selectedLocationId);
  const selectedPath = selectedLocationId === null
    ? null
    : findLocationPath(inventory, selectedLocationId);
  const locations = flattenLocations(inventory);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? flattenItems(inventory).filter(({ item }) => (
      item.name.toLowerCase().includes(normalizedSearch)
    ))
    : [];
  const allItems = flattenItems(inventory).sort((a, b) => (
    a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' })
  ));
  const moveableLocations = selectedLocation
    ? locations.filter(({ location }) => (
      !collectLocationIds(selectedLocation).includes(location.id)
    ))
    : [];

  function addLocation(parentId) {
    const name = newLocationName.trim();
    if (!name) {
      return;
    }

    const newLocation = {
      id: createId(),
      name,
      type: 'location',
      children: []
    };

    if (parentId === null) {
      setInventory(currentInventory => [...currentInventory, newLocation]);
    } else {
      setInventory(currentInventory => updateLocation(
        currentInventory,
        parentId,
        location => ({
          ...location,
          children: [...(location.children || []), newLocation]
        })
      ));
    }

    setNewLocationName('');
    setIsAddingLocation(false);
  }

  function saveLocationName() {
    const name = newName.trim();
    if (!name || selectedLocationId === null) {
      return;
    }

    setInventory(currentInventory => updateLocation(
      currentInventory,
      selectedLocationId,
      location => ({ ...location, name })
    ));
    setIsEditing(false);
  }

  function moveSelectedLocation() {
    if (!selectedLocation || targetLocationId === '') {
      return;
    }

    const destinationId = targetLocationId === 'root' ? null : targetLocationId;
    const movedLocation = selectedLocation;
    setInventory(currentInventory => {
      const withoutLocation = removeLocation(currentInventory, selectedLocation.id);
      if (destinationId === null) {
        return [...withoutLocation, movedLocation];
      }

      return updateLocation(withoutLocation, destinationId, destination => ({
        ...destination,
        children: [...(destination.children || []), movedLocation]
      }));
    });
    setMovingLocation(false);
    setTargetLocationId('');
  }

  function addItem() {
    const name = newItemName.trim();
    if (!name || selectedLocationId === null) {
      return;
    }

    setInventory(currentInventory => updateLocation(
      currentInventory,
      selectedLocationId,
      location => ({
        ...location,
        items: [...(location.items || []), { id: createId(), name }]
      })
    ));
    setNewItemName('');
    setIsAddingItem(false);
  }

  function updateItem(itemId, update) {
    setInventory(currentInventory => updateLocation(
      currentInventory,
      selectedLocationId,
      location => ({
        ...location,
        items: (location.items || []).map(item => (
          item.id === itemId ? update(item) : item
        ))
      })
    ));
  }

  function moveItem(item) {
    if (!selectedLocation || targetLocationId === '') {
      return;
    }

    const destinationId = targetLocationId;
    setInventory(currentInventory => {
      const withoutItem = updateLocation(
        currentInventory,
        selectedLocation.id,
        location => ({
          ...location,
          items: (location.items || []).filter(existingItem => existingItem.id !== item.id)
        })
      );
      return updateLocation(withoutItem, destinationId, destination => ({
        ...destination,
        items: [...(destination.items || []), item]
      }));
    });
    setMovingItemId(null);
    setTargetLocationId('');
  }

  function renderLocationTree(treeLocations, depth = 0) {
    return treeLocations.map(location => (
      <React.Fragment key={location.id}>
        <button
          type="button"
          onClick={() => {
            setSelectedLocationId(location.id);
            setIsEditing(false);
            setIsAddingItem(false);
            setIsAddingLocation(false);
            setMovingLocation(false);
            setMovingItemId(null);
          }}
          aria-current={selectedLocationId === location.id ? 'location' : undefined}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px',
            paddingLeft: `${10 + depth * 18}px`,
            marginBottom: '4px',
            textAlign: 'left',
            cursor: 'pointer',
            background: selectedLocationId === location.id ? '#d5e7ff' : 'transparent',
            border: '0'
          }}
        >
          {location.name}
        </button>
        {renderLocationTree(location.children || [], depth + 1)}
      </React.Fragment>
    ));
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>StorageMap</h2>
        <p>Know all the locations.</p>
        <div style={{ width: '60%', margin: '0 auto', textAlign: 'left' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search for an item..."
            aria-label="Search for an item"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          {normalizedSearch && (
            <div
              role="list"
              aria-label="Search results"
              style={{ background: '#fff', border: '1px solid #ccc', borderTop: 0 }}
            >
              {searchResults.length > 0 ? searchResults.map(({ item, location, path }) => (
                <button
                  type="button"
                  role="listitem"
                  key={item.id}
                  onClick={() => {
                    setSelectedLocationId(location.id);
                    setHighlightedItemId(item.id);
                  }}
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
                    {path.map(part => part.name).join(' > ')}
                  </span>
                </button>
              )) : (
                <p style={{ margin: 0, padding: '8px', color: '#666' }}>No matching items found.</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, background: '#e0e0e0', padding: '15px' }}>
          <p style={{ fontWeight: 'bold' }}>All Locations</p>
          <button
            type="button"
            style={{ marginBottom: '10px' }}
            onClick={() => setShowAllItems(current => !current)}
          >
            {showAllItems ? 'Show locations' : 'Display all items'}
          </button>
          {inventory.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>No locations created yet.</p>
          ) : renderLocationTree(inventory)}
          {isAddingLocation && selectedLocationId === null ? (
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={newLocationName}
                onChange={event => setNewLocationName(event.target.value)}
                placeholder="Location name"
                style={{ width: '100%', marginBottom: '5px', padding: '4px' }}
              />
              <button type="button" onClick={() => addLocation(null)} style={{ marginRight: '5px' }}>Save</button>
              <button type="button" onClick={() => { setIsAddingLocation(false); setNewLocationName(''); }}>Cancel</button>
            </div>
          ) : (
            <button type="button" style={{ marginTop: '10px' }} onClick={() => {
              setSelectedLocationId(null);
              setIsAddingLocation(true);
            }}>
              Add Location
            </button>
          )}
        </div>
        <div style={{ flex: 2, background: '#f5f5f5', padding: '15px' }}>
          {showAllItems ? (
            <section aria-label="All items">
              <h3>All Items</h3>
              {allItems.length > 0 ? (
                <ol>
                  {allItems.map(({ item, location, path }) => (
                    <li key={item.id} style={{ marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setShowAllItems(false);
                          setHighlightedItemId(item.id);
                        }}
                        style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {item.name}
                      </button>
                      <span style={{ display: 'block', color: '#666', fontSize: '12px' }}>
                        {path.map(part => part.name).join(' > ')}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No items have been added yet.</p>
              )}
            </section>
          ) : selectedLocation ? (
            <>
              <p style={{ fontSize: '12px', color: '#666' }}>
                {selectedPath.map((location, index) => (
                  <React.Fragment key={location.id}>
                    {index > 0 && ' > '}
                    <button
                      type="button"
                      onClick={() => setSelectedLocationId(location.id)}
                      style={{ border: 0, background: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                    >
                      {location.name}
                    </button>
                  </React.Fragment>
                ))}
              </p>
              {isEditing ? (
                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={event => setNewName(event.target.value)}
                    placeholder="New name"
                    style={{ marginRight: '5px', padding: '4px' }}
                  />
                  <button type="button" onClick={saveLocationName} style={{ marginRight: '5px' }}>Save</button>
                  <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <h3>{selectedLocation.name}</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <button type="button" style={{ marginRight: '5px' }} onClick={() => setIsAddingItem(true)}>Add item</button>
                    <button type="button" style={{ marginRight: '5px' }} onClick={() => {
                      setIsAddingLocation(true);
                      setNewLocationName('');
                    }}>
                      Add sublocation
                    </button>
                    <button type="button" style={{ marginRight: '5px' }} onClick={() => {
                      setIsEditing(true);
                      setNewName(selectedLocation.name);
                    }}>Rename</button>
                    <button type="button" style={{ marginRight: '5px' }} onClick={() => {
                      setMovingLocation(true);
                      setTargetLocationId('');
                    }}>Move location</button>
                    <button type="button" style={{ background: '#ffcccc', marginRight: '5px' }} onClick={() => {
                      setInventory(currentInventory => removeLocation(currentInventory, selectedLocation.id));
                      setSelectedLocationId(null);
                    }}>Delete</button>
                  </div>
                </>
              )}

              {isAddingLocation && selectedLocationId !== null && (
                <div style={{ marginBottom: '15px', background: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={event => setNewLocationName(event.target.value)}
                    placeholder="Sublocation name"
                    style={{ width: '100%', marginBottom: '5px', padding: '4px' }}
                  />
                  <button type="button" onClick={() => addLocation(selectedLocation.id)} style={{ marginRight: '5px' }}>Save</button>
                  <button type="button" onClick={() => { setIsAddingLocation(false); setNewLocationName(''); }}>Cancel</button>
                </div>
              )}

              {movingLocation && (
                <div style={{ marginBottom: '15px' }}>
                  <label>
                    Move location and everything inside it to{' '}
                    <select
                      aria-label="Move location destination"
                      value={targetLocationId}
                      onChange={event => setTargetLocationId(event.target.value)}
                      style={{ marginRight: '5px', padding: '2px' }}
                    >
                      <option value="">Select destination...</option>
                      <option value="root">Main</option>
                      {moveableLocations.map(({ location, depth }) => (
                        <option key={location.id} value={location.id}>
                          {`${'— '.repeat(depth)}${location.name}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={moveSelectedLocation} style={{ marginRight: '5px' }}>Confirm</button>
                  <button type="button" onClick={() => { setMovingLocation(false); setTargetLocationId(''); }}>Cancel</button>
                </div>
              )}

              {isAddingItem && (
                <div style={{ marginBottom: '15px', background: '#fff', padding: '10px', border: '1px solid #ccc' }}>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={event => setNewItemName(event.target.value)}
                    placeholder="Item name"
                    style={{ width: '100%', marginBottom: '5px', padding: '4px' }}
                  />
                  <button type="button" onClick={addItem} style={{ marginRight: '5px' }}>Save</button>
                  <button type="button" onClick={() => { setIsAddingItem(false); setNewItemName(''); }}>Cancel</button>
                </div>
              )}

              {selectedLocation.children?.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>Sublocations:</strong>
                  <ul>
                    {selectedLocation.children.map(child => (
                      <li key={child.id}>
                        <button type="button" onClick={() => setSelectedLocationId(child.id)}>{child.name}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLocation.items?.length > 0 ? (
                <div>
                  <strong>Items:</strong>
                  <ul>
                    {selectedLocation.items.map(item => (
                      <li
                        key={item.id}
                        style={{
                          marginBottom: '8px',
                          background: highlightedItemId === item.id ? '#fff3bf' : 'transparent'
                        }}
                      >
                        {editingItemId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editedItemName}
                              onChange={event => setEditedItemName(event.target.value)}
                              style={{ padding: '2px', marginRight: '5px' }}
                            />
                            <button type="button" onClick={() => {
                              if (editedItemName.trim()) {
                                updateItem(item.id, currentItem => ({
                                  ...currentItem,
                                  name: editedItemName.trim()
                                }));
                                setEditingItemId(null);
                              }
                            }} style={{ marginRight: '3px', fontSize: '10px' }}>Save</button>
                            <button type="button" onClick={() => setEditingItemId(null)} style={{ fontSize: '10px' }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            {item.name}
                            <button type="button" style={{ marginLeft: '10px', fontSize: '10px' }} onClick={() => {
                              setEditingItemId(item.id);
                              setEditedItemName(item.name);
                            }}>Rename</button>
                            {movingItemId === item.id ? (
                              <span style={{ marginLeft: '10px' }}>
                                <select
                                  aria-label={`Move ${item.name} to location`}
                                  value={targetLocationId}
                                  onChange={event => setTargetLocationId(event.target.value)}
                                  style={{ marginRight: '5px', padding: '2px' }}
                                >
                                  <option value="">Select location...</option>
                                  {locations
                                    .filter(({ location }) => location.id !== selectedLocation.id)
                                    .map(({ location }) => (
                                      <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => moveItem(item)} style={{ marginRight: '3px', fontSize: '10px' }}>Confirm</button>
                                <button type="button" onClick={() => { setMovingItemId(null); setTargetLocationId(''); }} style={{ fontSize: '10px' }}>Cancel</button>
                              </span>
                            ) : (
                              <button type="button" style={{ marginLeft: '5px', fontSize: '10px' }} onClick={() => {
                                setMovingItemId(item.id);
                                setTargetLocationId('');
                                setEditingItemId(null);
                              }}>Move</button>
                            )}
                            <button type="button" style={{ marginLeft: '5px', fontSize: '10px', background: '#ffcccc' }} onClick={() => {
                              setInventory(currentInventory => updateLocation(
                                currentInventory,
                                selectedLocation.id,
                                location => ({
                                  ...location,
                                  items: (location.items || []).filter(existingItem => existingItem.id !== item.id)
                                })
                              ));
                            }}>Delete</button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No items inside this location yet.</p>
              )}
            </>
          ) : (
            <p style={{ color: '#666' }}>Select a location from the sidebar or add a location to begin.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryView;
