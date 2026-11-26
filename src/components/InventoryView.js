import * as api from '../api/locations';
import * as itemsApi from '../api/items';
import React, { useState } from 'react';
import ItemSearchBar from './ItemSearchBar';
import LocationFilter from './LocationFilter';

function findLocation(locations, locationId) {
  for (const location of locations) {
    if (String(location.id) === String(locationId)) {
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
    if (String(location.id) === String(locationId)) {
      return currentPath;
    }

    const childPath = findLocationPath(location.children || [], locationId, currentPath);
    if (childPath) {
      return childPath;
    }
  }

  return null;
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

function InventoryView({ inventory, refreshLocations }) {
  const [actionError, setActionError] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
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
  const [filterLocationId, setFilterLocationId] = useState('');

  const selectedLocation = selectedLocationId === null
    ? null
    : findLocation(inventory, selectedLocationId);
  const selectedPath = selectedLocationId === null
    ? null
    : findLocationPath(inventory, selectedLocationId);
  const locations = flattenLocations(inventory);
  const allItems = flattenItems(inventory).sort((a, b) => (
    a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' })
  ));
  const filterLocation = filterLocationId
    ? findLocation(inventory, filterLocationId)
    : null;
  const branchLocationIds = filterLocation
    ? collectLocationIds(filterLocation).map(String)
    : [];
  const filteredItems = filterLocationId
    ? allItems.filter(({ location }) => branchLocationIds.includes(String(location.id)))
    : allItems;
  const moveableLocations = selectedLocation
    ? locations.filter(({ location }) => (
      !collectLocationIds(selectedLocation).includes(location.id)
    ))
    : [];

  async function addLocation(parentId) {
    const name = newLocationName.trim();
    if (!name) return;
    try {
      await api.createLocation(name, parentId === null ? null : Number(parentId));
      await refreshLocations();
      setNewLocationName('');
      setIsAddingLocation(false);
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function saveLocationName() {
    const name = newName.trim();
    if (!name || selectedLocationId === null) return;
    try {
      await api.updateLocation(Number(selectedLocationId), { name });
      await refreshLocations();
      setIsEditing(false);
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function moveSelectedLocation() {
    if (!selectedLocation || targetLocationId === '') return;
    const parentId = targetLocationId === 'root' ? null : Number(targetLocationId);
    try {
      await api.updateLocation(Number(selectedLocation.id), { parentId });
      await refreshLocations();
      setMovingLocation(false);
      setTargetLocationId('');
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function deleteSelectedLocation() {
    if (!window.confirm(`Delete "${selectedLocation.name}"?`)) return;
    try {
      await api.deleteLocation(Number(selectedLocation.id));
      setSelectedLocationId(null);
      await refreshLocations();
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }
  async function addItem() {
    const name = newItemName.trim();
    if (!name || selectedLocationId === null) return;

    try {
      await itemsApi.createItem(name, Number(selectedLocationId));
      await refreshLocations();
      setNewItemName('');
      setIsAddingItem(false);
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function saveItemName(itemId) {
    const name = editedItemName.trim();
    if (!name) return;
    try {
      await itemsApi.updateItem(Number(itemId), { name });
      await refreshLocations();
      setEditingItemId(null);
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await itemsApi.deleteItem(Number(itemId));
      await refreshLocations();
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
  }

  async function moveItem(item) {
    if (!selectedLocation || targetLocationId === '') {
      return;
    }

    try {
      await itemsApi.updateItem(Number(item.id), {
        locationId: Number(targetLocationId)
      });
      await refreshLocations();
      setMovingItemId(null);
      setTargetLocationId('');
      setActionError('');
    } catch (e) {
      setActionError(e.message);
    }
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
        <ItemSearchBar
          inventory={inventory}
          locationId={filterLocationId || null}
          onSelectResult={(locationId, itemId) => {
            setSelectedLocationId(locationId);
            setHighlightedItemId(itemId);
            setShowAllItems(false);
          }}
        />
      </div>
      <div style={{ minHeight: '24px', marginBottom: '10px' }}>
        {actionError && <p role="alert" style={{ color: '#b00020', margin: 0 }}>{actionError}</p>}
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
              <LocationFilter
                locations={locations}
                value={filterLocationId}
                onChange={setFilterLocationId}
              />
              {filteredItems.length > 0 ? (
                <ol>
                  {filteredItems.map(({ item, location, path }) => (
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
                <p style={{ color: '#666', fontStyle: 'italic' }}>No items match the selected location.</p>
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
                    <button type="button" style={{ background: '#ffcccc', marginRight: '5px' }} onClick={deleteSelectedLocation}>Delete</button>
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
                            <button type="button" onClick={() => saveItemName(item.id)} style={{ marginRight: '3px', fontSize: '10px' }}>Save</button>
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
                            <button
                              type="button"
                              style={{ marginLeft: '5px', fontSize: '10px', background: '#ffcccc' }}
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              Delete
                            </button>
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
