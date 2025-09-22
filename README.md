# CityGuard

CityGuard is a full-stack **web application** that integrates **OpenStreetMap (OSM)** and the **OpenRouteService (ORS)** API to generate accessibility maps for people with mobility impairments.  
It is built to be **inclusive for everyone**, not only for people with disabilities — users can report **blocked areas** (e.g., cars parked on sidewalks) and help improve the accessibility of cities.

---

## 🚀 Features
- **Crowdsourced Reports**: Anyone can report inaccessible areas, with optional **image uploads** as evidence.
- **Accessibility Map**: Visualize reports directly on an interactive **OpenStreetMap** interface.
- **Shortest Route Generator**: Compute safe and optimal paths between two points using **ORS**, automatically avoiding inaccessible spots.
- **Backend Connectivity**: Reports are stored and can be connected to a **network of reports for local authorities or police**.
- **Universal Use**: The app is useful for all citizens, from people with mobility impairments to parents with strollers.

---

## 📂 Project Structure
```
cafebabe/
├── backend/         # Python Flask backend (API, templates, uploads)
│   ├── main.py
│   ├── installer.sh
│   ├── requirements.txt
│   ├── templates/
│   │   ├── index.html
│   │   └── success.html
│   └── uploads/     # Image uploads from reports
│
├── frontend/        # React frontend (map, UI, forms)
│   ├── public/      # Static assets (icons, manifest, HTML entrypoint)
│   └── src/         # React components and logic
│       ├── App.js
│       ├── Map.js
│       ├── Form.js
│       ├── ViewSubmissions.js
│       └── Fonts/Images/
│
├── package.json     # Project metadata
└── README.md        # Documentation
```

---

## ⚙️ Installation

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
Backend runs by default on **http://localhost:5000**.

### Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on **http://localhost:3000**.

---

## 🖼️ Usage
1. Open the frontend in your browser.
2. Submit a report (location + description + optional image).
3. Reports are sent to the backend and displayed on the map.
4. Generate the shortest route between two points, avoiding blocked areas.

---

## 🛣️ Roadmap
- **Gamification**: reward users with badges/points for valid reports.
- **Community Ranking**: highlight top contributors in each area.
- **Authority Integration**: direct pipeline of verified reports to local police and municipalities.

---

## 🛠️ Tech Stack
- **Backend**: Python, Flask
- **Frontend**: React, OpenStreetMap, ORS API
- **Styling**: CSS, custom accessibility fonts (OpenDyslexic)
- **Other**: npm, pip

