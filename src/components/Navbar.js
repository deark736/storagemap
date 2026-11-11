import React from 'react';

function Navbar({ isLoggedIn, onLogout, setCurrentView }) {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #ccc' }}>
      <div>
        {isLoggedIn ? (
          <>
            <span style={{ marginRight: '15px' }}>Hello, User</span>
            <button onClick={() => { onLogout(); setCurrentView('home'); }} style={{cursor: 'pointer', color: 'blue' }}>Log Out</button>
          </>
        ) : (
          <>
            <button onClick={() => setCurrentView('signup')} style={{ marginRight: '15px', cursor: 'pointer', color: 'blue' }}>Sign up</button>
            <button onClick={() => setCurrentView('login')} style={{ cursor: 'pointer', color: 'blue' }}>Log In</button>
          </>
        )}
      </div>
      <div style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setCurrentView('home')}>StorageMap</div>
      <div>
        {isLoggedIn && (
            <button onClick={() => setCurrentView('inventory')} style={{ marginRight: '15px', cursor: 'pointer', color: 'blue' }}>Inventory</button>
        )}
          <>
            <button onClick={() => setCurrentView('home')} style={{ marginRight: '15px', cursor: 'pointer', color: 'blue' }}>Home</button>
            <button onClick={() => setCurrentView('help')} style={{ cursor: 'pointer', color: 'blue' }}>Help</button>
          </>
      </div>
    </nav>
  );
}

export default Navbar;