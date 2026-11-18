import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import InventoryView from './components/InventoryView';

// Turns the flat list from the API into the nested tree InventoryView uses.
function buildTree(flat) {
  const nodes = new Map(flat.map(l => [l.id, { id: String(l.id), name: l.name, type: 'location', children: [], items: [] }]));
  const roots = [];
  flat.forEach(l => {
    const node = nodes.get(l.id);
    if (l.parentId === null) roots.push(node);
    else nodes.get(l.parentId)?.children.push(node);
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
    let res;
    try {
      res = await fetch('/api/locations');
    } catch {
      throw new Error('Could not reach the server');
    }
    if (!res.ok) throw new Error('Could not load locations');
    setInventory(buildTree(await res.json()));
  }, []);

  useEffect(() => {
    refreshLocations()
      .then(() => setLoadError(''))
      .catch(e => setLoadError(e.message));
  }, [refreshLocations]);

  return (
    <div>
      <Navbar isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} setCurrentView={setCurrentView} />
      <main style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {currentView === 'home' && (
          <div>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ background: '#d3d3d3', width: '400px', height: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>[Placeholder Image]</span>
              </div>
              <div>
                <h1 style={{ marginTop: '0' }}>Hey There!</h1>
                <p>Are you worried about not remembering where you put your favorite watch? Or do you need your tools to fix a bathroom pipe right now? This app can help you quickly find these items before you get stressed out.</p>
              </div>
            </div>

            <h2 style={{ textAlign: 'center', marginTop: '40px' }}>Start Now</h2>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: '20px' }}>
              <div>
                <div style={{ width: '100px', height: '100px', background: '#d3d3d3', borderRadius: '50%', margin: '0 auto 10px' }}></div>
                <p>Record the location of your items in each room.</p>
              </div>
              <div>
                <div style={{ width: '100px', height: '100px', background: '#d3d3d3', borderRadius: '50%', margin: '0 auto 10px' }}></div>
                <p>Find them in seconds.</p>
              </div>
              <div>
                <div style={{ width: '100px', height: '100px', background: '#d3d3d3', borderRadius: '50%', margin: '0 auto 10px' }}></div>
                <p>Organize your entire home easily.</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'inventory' && (
          <>
            {loadError && (
              <p role="alert" style={{ color: '#b00020', margin: '0 0 10px' }}>{loadError}</p>
            )}
            <InventoryView
              inventory={inventory}
              setInventory={setInventory}
              refreshLocations={refreshLocations}
            />
          </>
        )}

        {currentView === 'help' && <h1>Help View</h1>}
        {currentView === 'signup' && (
          <div>
            <h1>Sign Up</h1>
            <button onClick={() => { setIsLoggedIn(true); setCurrentView('inventory'); }}>Test Signup</button>
          </div>
        )}
        {currentView === 'login' && (
          <div>
            <h1>Log In</h1>
            <button onClick={() => { setIsLoggedIn(true); setCurrentView('inventory'); }}>Test Login</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;