import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../Images/hero.jpg';
import { backendEnabled } from '../config';

export default function HomePage() {
  return <main>
    <header className="text-white text-center d-flex align-items-center" style={{ minHeight: '65vh', background: `linear-gradient(rgba(0,0,0,.6),rgba(0,0,0,.5)),url(${heroImage}) center/cover` }}>
      <div className="container py-5">
        <h1 className="display-4 fw-bold">Make your city more accessible</h1>
        <p className="lead my-4">Explore walking routes in your area and report obstacles along the way.</p>
        <Link to="/map" className="btn btn-light btn-lg">Open the accessibility map</Link>
      </div>
    </header>
    <section className="container py-5" style={{ maxWidth: 850 }}>
      <h2>Try the walking map</h2>
      <p>Choose a start and destination up to 2 km apart. The app downloads the local walking network from OpenStreetMap. Add an obstacle to exclude nearby segments, then calculate your route again.</p>
      <p>{backendEnabled ? 'Reports are sent to the separately configured server.' : 'This demo calculates routes in your browser. Reports and optional photos are stored on this device; they are not shared with other visitors or sent to authorities. Clearing site data removes them.'}</p>
      <p>Cișmigiu, Bucharest is included for an instant demo. Other areas require downloading OSM data. Missing accessibility information means a route is not guaranteed suitable for a wheelchair. Map tiles and address search require internet.</p>
      <p>Walking data: <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors, ODbL</a>.</p>
    </section>
  </main>;
}
