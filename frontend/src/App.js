import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import MapPage from './Pages/Map';
import HomePage from './Pages/Home';
import './App.css';

function App() {
  return (
    <Router>
      <div className="cityguard-shell">
      {/* Updated Navbar (only change) */}
      <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{
        backgroundColor: '#1B5E20', // Dark green
        backgroundImage: 'linear-gradient(to right, #1B5E20, #2E7D32)' // Green gradient
      }}>
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">CityGuard</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/map">Map</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Everything below remains EXACTLY the same */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
      </div>
    </Router>
  );
}

export default App;
