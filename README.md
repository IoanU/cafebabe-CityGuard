# CityGuard

React + Leaflet walking map. The default build runs on GitHub Pages without a backend or routing key. The separate FastAPI backend is opt-in.

## Run the frontend

```sh
cd frontend
npm ci
npm start
```

Open `http://localhost:3000/#/map`. Click to select a start and destination, or use your location as the start. Address search moves the map so you can pick points in other areas. Choose **Calculate route**. To add an obstacle, select **Report obstacle**, then click its location. Reports and optional photos (5 MB total per report) persist in IndexedDB in this browser. Calculate the route again to include the new report. Clearing site data deletes local reports. Local and server reports are separate.

### Local routing

- You can choose points up to **2 km apart in a straight line**. A detour can be longer; paths leaving the downloaded area may be unavailable.
- The app downloads nearby walking data from the read-only [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), builds a graph and runs A* in the browser. Default data providers are the [European Overpass instance](https://ovp.dresel.systems/) for covered European coordinates and [Private.coffee Overpass](https://overpass.private.coffee/) elsewhere. Set `REACT_APP_OVERPASS_URL` at build time to use another compatible data endpoint. Public instances can be slow or unavailable. Cișmigiu has a bundled graph and needs no graph download.
- Points snap to graph nodes within 75 m. The green line begins and ends at those nodes. Segments within 15 m of a report are excluded, even when markers are hidden. If the remaining graph is disconnected, CityGuard says there is no route.
- This is pedestrian routing. Stairs, explicit `wheelchair=no` and private access are filtered, but roads may lack sidewalks and some accessibility or access tags may be missing. Turn restrictions are not modelled. The route is not verified for wheelchairs.
- Map tiles, address search and routing in a new area need internet. The data provider receives a bounding box; local report details and photos are not sent to it.

Data: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). The bundled graph includes source and extraction metadata. Regenerate it from OSM JSON with `node scripts/prepare-graph.cjs path/to/osm.json`, run from `frontend/`.

## GitHub Pages

In repository **Settings → Pages**, select **GitHub Actions** as the source. Push to `main` or run `.github/workflows/pages.yml` manually. The workflow tests and builds only `frontend/` in standalone mode. Hash routing and relative assets support `/cafebabe-CityGuard/#/map`, including direct refresh. The workflow has not been deployed from this workspace.

## Opt in to the optional backend

Create `frontend/.env.local` (see `frontend/.env.example`):

```env
REACT_APP_ENABLE_BACKEND=true
REACT_APP_API_URL=http://localhost:8000
```

Restart or rebuild the frontend. This is a build setting, not a toggle in the public site. The Pages workflow explicitly sets it to `false`.

Run the backend separately:

```sh
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Set ORS_API_KEY in the server environment, never REACT_APP_*.
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Server mode uses `/reports`, `/submit` and `/proxy/ors`. It requires a valid server-side ORS key for routing. A published HTTPS frontend needs a backend reachable over HTTPS. The backend remains a development prototype with in-memory reports, open CORS and no authentication. Do not expose it as a production service without hardening. For demo seed reports, explicitly set `CITYGUARD_SEED_DEMO=true`. Live ORS routing is not covered by the frontend tests.

## Test

```sh
cd frontend
npm test -- --watchAll=false --runInBand
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright serves the production build at the same subpath used on GitHub Pages. It tests map selection, obstacle detours, photo persistence after reload, the distance limit, mobile overflow and routing outside Cișmigiu. Public network responses are stubbed by default; set `CITYGUARD_LIVE_OSM=1` to test graph download from the European Overpass instance.
