import React, { useState } from 'react';
import Navbar from './components/Navbar';
import InventoryView from './components/InventoryView';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [inventory, setInventory] = useState([]);

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
          <InventoryView inventory={inventory} setInventory={setInventory} />
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