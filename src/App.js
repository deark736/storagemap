
import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import InventoryView from './components/InventoryView';
import HomeView from './components/HomeView';
import HelpView from './components/HelpView';
import Footer from './components/Footer';
import * as itemsApi from './api/items';
import './PublicPages.css';

// Turns the flat list from the API into the nested tree InventoryView uses.
function buildTree(locations, items = []) {
  const nodes = new Map(
    locations.map(l => [
      l.id,
      { id: String(l.id), name: l.name, type: 'location', children: [], items: [] }
    ])
  );
  const roots = [];

  locations.forEach(l => {
    const node = nodes.get(l.id);
    if (l.parentId === null) roots.push(node);
    else nodes.get(l.parentId)?.children.push(node);
  });

  items.forEach(item => {
    const targetNode = nodes.get(item.locationId);
    if (targetNode) {
      targetNode.items.push({
        id: String(item.id),
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        locationId: item.locationId,
        categoryId: item.categoryId
      });
    }
  });

  return roots;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [inventory, setInventory] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Loads the locations from the API. It throws if the request fails,
  // so the caller can show the error message.
  const refreshLocations = useCallback(async () => {
    let locationsResponse;
    let itemsData;

    try {
      [locationsResponse, itemsData] = await Promise.all([
        fetch('/api/locations'),
        itemsApi.fetchItems()
      ]);
    } catch {
      throw new Error('Could not reach the server');
    }

    if (!locationsResponse.ok) throw new Error('Could not load locations');

    const locationsData = await locationsResponse.json();
    setInventory(buildTree(locationsData, itemsData));
    setLoadError('');
  }, []);

  useEffect(() => {
    if (currentView !== 'inventory') return;

    refreshLocations().catch(error => setLoadError(error.message));
  }, [currentView, refreshLocations]);

  return (
    <div className="public-app">
      <Navbar
        isLoggedIn={isLoggedIn}
        onLogout={() => setIsLoggedIn(false)}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <main className="public-main">
        <div className="public-main-inner">
          {currentView === 'home' && (
            <HomeView
              isLoggedIn={isLoggedIn}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'inventory' && (
            <>
              {loadError && (
                <p
                  role="alert"
                  style={{ color: '#b00020', margin: '0 0 10px' }}
                >
                  {loadError}
                </p>
              )}

              <InventoryView
                inventory={inventory}
                refreshLocations={refreshLocations}
              />
            </>
          )}

          {currentView === 'help' && (
            <HelpView
              isLoggedIn={isLoggedIn}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'signup' && (
            <div>
              <h1>Sign Up</h1>

              <button
                onClick={() => {
                  setIsLoggedIn(true);
                  setCurrentView('inventory');
                }}
              >
                Test Signup
              </button>
            </div>
          )}

          {currentView === 'login' && (
            <div>
              <h1>Log In</h1>

              <button
                onClick={() => {
                  setIsLoggedIn(true);
                  setCurrentView('inventory');
                }}
              >
                Test Login
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
