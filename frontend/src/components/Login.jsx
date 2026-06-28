import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'; // Import the keys

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Post your credentials to your Django simple_jwt endpoint
      const response = await api.post('/api/token/', { username, password });
      
      // Store the secure tokens in local storage
      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      
      setError('');
      alert('Logged in successfully!');
      navigate('/'); // Redirect to home/dashboard later
    } catch (err) {
      setError('Invalid username or password.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Sign In</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required 
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required 
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;