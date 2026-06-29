import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Home from "./pages/Home";
import Add from "./pages/Add";
import ImportSyllabus from "./pages/ImportSyllabus";
import StudyLog from "./pages/StudyLog";
import StudyPlan from "./pages/StudyPlan";
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const AUTH_PATHS = ['/login', '/register'];

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const username = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem('username');
    navigate('/login');
    onClose();
  };

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">PrepTracker</div>
        <div className="sidebar-logo-sub">Study Dashboard</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon">📊</span>
          Dashboard
        </NavLink>
        <NavLink
          to="/add"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon">➕</span>
          Add Syllabus
        </NavLink>
        <NavLink
          to="/import"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon">📥</span>
          Import PDF
        </NavLink>
        <NavLink
          to="/study-log"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon">📅</span>
          Study Log
        </NavLink>
        <NavLink
          to="/study-plan"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon">🗓</span>
          Study Plan
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{username[0]?.toUpperCase() || 'U'}</div>
          <span className="sidebar-username">{username}</span>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function AppShell({ children }) {
  const location = useLocation();
  const isAuth = AUTH_PATHS.includes(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isAuth) return <>{children}</>;

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <span className="mobile-header-title">PrepTracker</span>
      </div>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="content-area">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><Add /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportSyllabus /></ProtectedRoute>} />
          <Route path="/study-log" element={<ProtectedRoute><StudyLog /></ProtectedRoute>} />
          <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;
