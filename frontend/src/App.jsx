import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from "./pages/Home";
import Add from "./pages/Add";
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem(ACCESS_TOKEN));
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem(ACCESS_TOKEN));
    window.addEventListener('storage', sync);
    const interval = setInterval(sync, 500);
    return () => {
      window.removeEventListener('storage', sync);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
      <Link to="/" style={{ marginRight: '15px', textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Dashboard</Link>
      <Link to="/add" style={{ marginRight: '15px', textDecoration: 'none', color: '#666' }}>Add Syllabus</Link>
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      ) : (
        <>
          <Link to="/login" style={{ marginRight: '15px', textDecoration: 'none', color: '#007BFF' }}>Login</Link>
          <Link to="/register" style={{ textDecoration: 'none', color: '#28A745' }}>Register</Link>
        </>
      )}
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <NavBar />
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/add" element={
            <ProtectedRoute>
              <Add />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
