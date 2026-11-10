import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Alert, Button, Form } from 'react-bootstrap';
import 'leaflet/dist/leaflet.css';
import ReportForm from '../Form';
import { loadReports } from '../reports';
import { apiBase, backendEnabled } from '../config';
import { findRoute } from '../routing';
import graph from '../walking-graph.json';
import demoObstacles from '../demo-obstacles.json';
import './Map.css';
import { loadNetwork } from '../network';
import polyline from '@mapbox/polyline';

function MapEvents({ onPick, focus }) {
  const map = useMap();
  useMapEvents({ click: e => onPick([e.latlng.lat, e.latlng.lng]) });
  useEffect(() => { if (focus) map.setView(focus, 17); }, [focus, map]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function ReportPhotos({ report }) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const local = (report.images || []).map(file => URL.createObjectURL(file));
    const remote = (Array.isArray(report.image_saved_to) ? report.image_saved_to : []).map(p => `${apiBase}/uploads/${p.split(/[\\/]/).pop()}`);
    setUrls([...local, ...remote]);
    return () => local.forEach(url => URL.revokeObjectURL(url));
  }, [report]);
  return urls.map(url => <img key={url} src={url} alt="Reported obstacle" style={{ maxWidth: 180, maxHeight: 120 }} />);
}

export default function MapPage() {
  const [start, setStart] = useState(null), [end, setEnd] = useState(null);
  const [pick, setPick] = useState('start'), [focus, setFocus] = useState(null);
  const [reports, setReports] = useState([]), [showReports, setShowReports] = useState(true);
  const [reportLocation, setReportLocation] = useState(null);
  const [route, setRoute] = useState(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [query, setQuery] = useState('');
  const [network, setNetwork] = useState(graph);
  const [notice, setNotice] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const exit = event => { if (event.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', exit);
    return () => window.removeEventListener('keydown', exit);
  }, [fullscreen]);
  const refresh = useCallback(async () => {
    const items = await loadReports(); setReports(items.filter(item => !item.demo)); setRoute(null);
  }, []);
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);

  const onPick = point => {
    if (fullscreen || busy) return;
    setError(''); setRoute(null);
    if (pick === 'report') setReportLocation(point);
    else if (pick === 'start') { setStart(point); setPick('end'); }
    else setEnd(point);
  };
  const locate = () => {
    if (!navigator.geolocation) { setError('Geolocation is unavailable. Select your start on the map.'); return; }
    navigator.geolocation.getCurrentPosition(p => {
      const point = [p.coords.latitude, p.coords.longitude];
      setStart(point); setFocus(point); setPick('end'); setRoute(null); setError('');
    }, () => setError('Location unavailable. Select your start on the map.'));
  };
  const search = async e => {
    e.preventDefault(); if (!query.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search is unavailable. Choose a point directly on the map.');
      const items = await response.json();
      if (!items.length) throw new Error('Location not found.');
      setFocus([Number(items[0].lat), Number(items[0].lon)]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const navigate = async () => {
    setBusy(true); setError(''); setRoute(null);
    try {
      if (backendEnabled) {
        const response = await fetch(`${apiBase}/proxy/ors`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: [start, end].map(([lat, lon]) => [lon, lat]),
            include_demo_obstacles: showDemo,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Server routing failed.');
        setRoute({ coordinates: polyline.decode(data.routes[0].geometry), meters: data.routes[0].summary.distance });
      } else {
        const loaded = await loadNetwork(start, end);
        setNetwork(loaded);
        setRoute(findRoute(loaded, start, end, showDemo ? [...reports, ...demoObstacles] : reports));
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <main className={fullscreen ? 'cityguard-map-fullscreen' : undefined}>
    <section className="container py-3" hidden={fullscreen}>
      <h1 className="h3">Walking routes</h1>
      <p>{backendEnabled ? 'Connected server mode.' : 'Local demo: reports and photos stay in this browser. Routes are calculated on your device.'} Choose a start, then a destination on the map.</p>
      <p className="small">Choose points up to 2 km apart. Walking data is downloaded from OpenStreetMap for your area; routing runs on your device. Blue lines show the loaded network. Routes snap within 75 m and avoid reports by 15 m. Streets may lack sidewalks; wheelchair accessibility is not verified. Internet is needed for new areas, map tiles and search.</p>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <Button onClick={() => setPick('start')} variant={pick === 'start' ? 'primary' : 'outline-primary'}>Select start</Button>
        <Button onClick={() => setPick('end')} variant={pick === 'end' ? 'primary' : 'outline-primary'}>Select destination</Button>
        <Button onClick={locate} variant="outline-primary">Use my location</Button>
        <Button onClick={navigate} disabled={!start || !end || busy}>{busy ? 'Loading…' : 'Calculate route'}</Button>
        <Button onClick={() => setPick('report')} variant={pick === 'report' ? 'danger' : 'outline-danger'}>Report obstacle</Button>
        <Button variant="outline-secondary" onClick={() => setShowReports(!showReports)}>Toggle reports</Button>
        <Button variant={showDemo ? 'warning' : 'outline-secondary'} aria-pressed={showDemo} disabled={busy} onClick={() => {
          setShowDemo(enabled => !enabled);
          setRoute(null);
          setError('');
        }}>Test obstacles</Button>
        <Button variant="outline-secondary" onClick={() => setFocus([44.4375, 26.09])}>Show demo area</Button>
      </div>
      <Form onSubmit={search} className="d-flex gap-2 mb-2">
        <Form.Control aria-label="Search address" placeholder="Search address" value={query} onChange={e => setQuery(e.target.value)} />
        <Button type="submit" disabled={busy || !query.trim()}>Search</Button>
      </Form>
      <p role="status">Selecting: {pick === 'end' ? 'destination' : pick === 'report' ? 'obstacle location' : 'start'}. {reports.length} saved reports.</p>
      {route && <Alert variant="success" role="status">Route: {Math.round(route.meters)} m along the walking network. The green line starts and ends at the snapped network points.</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
    </section>
    <div className="cityguard-map-frame">
      <Button className="cityguard-fullscreen-button" variant="light" onClick={() => {
        setFullscreen(value => !value);
        if (!fullscreen) window.scrollTo(0, 0);
      }}>{fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</Button>
      <MapContainer center={[44.4375, 26.09]} zoom={16} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={network.edges.map(([a,b]) => [network.nodes[a], network.nodes[b]])} pathOptions={{ color: '#1976d2', weight: 2, opacity: .45 }} />
        <MapEvents onPick={onPick} focus={focus} />
        {start && <CircleMarker center={start} radius={9} pathOptions={{ color: 'blue' }}><Popup>Start</Popup></CircleMarker>}
        {end && <CircleMarker center={end} radius={9} pathOptions={{ color: 'purple' }}><Popup>Destination</Popup></CircleMarker>}
        {showReports && reports.map((r, i) => <Circle key={r.id || i} center={[r.latitude, r.longitude]} radius={15} pathOptions={{ color: 'red' }}><Popup><strong>{r.name}</strong><p>{r.description}</p><ReportPhotos report={r} /></Popup></Circle>)}
        {showDemo && demoObstacles.map(obstacle => <Circle
          key={obstacle.name}
          center={[obstacle.latitude, obstacle.longitude]}
          radius={15}
          className="cityguard-test-obstacle"
          pathOptions={{ color: '#ad6300', dashArray: '4 3' }}
        ><Popup><strong>{obstacle.name}</strong><p>Simulated obstacle</p></Popup></Circle>)}
        {route && <Polyline positions={route.coordinates} pathOptions={{ color: '#16803c', weight: 6 }} />}
      </MapContainer>
    </div>
    {reportLocation && <div role="dialog" aria-label="Report obstacle" aria-modal="true" className="position-fixed top-0 start-0 w-100 h-100 p-3" style={{ zIndex: 2000, overflowY: 'auto', background: 'rgba(0,0,0,.5)' }}>
      <div className="bg-white p-3 mx-auto rounded" style={{ maxWidth: 550 }}><ReportForm location={reportLocation} fetchReports={async () => { await refresh(); setNotice('Report saved. Calculate the route again to include this obstacle.'); }} onClose={() => setReportLocation(null)} /></div>
    </div>}
  </main>;
}
