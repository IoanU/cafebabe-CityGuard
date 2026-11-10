from fastapi import FastAPI, Form, UploadFile, File, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
import os
import json
import httpx
import math
from pathlib import Path

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict origins if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from the "uploads" directory
UPLOADS = Path(__file__).resolve().parent / "uploads"
UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")

# In-memory store for reports
reports = []

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Accessibility Reporting API!",
        "endpoints": {
            "submit_report": "/submit",
            "get_reports": "/reports",
            "uploaded_files": "/uploads/{filename}"
        }
    }

@app.post("/submit")
async def submit_report(
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: Optional[List[UploadFile]] = File(None)  # changed to optional
):
    # Ensure the uploads directory exists
    uploads_dir = str(UPLOADS)
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_paths = []
    if image:  # handle if image is not provided
        for img in image:
            from uuid import uuid4
            file_path = os.path.join(uploads_dir, f"{uuid4().hex}{Path(img.filename or '').suffix}")
            with open(file_path, "wb") as f:
                content = await img.read()
                f.write(content)
            file_paths.append(f"uploads/{Path(file_path).name}")
    
    # Create a report dictionary and store it
    report = {
        "name": name,
        "category": category,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
        "image_saved_to": file_paths,
    }
    reports.append(report)
    
    return JSONResponse(content={"message": "Report submitted successfully", "report": report})

# New GET endpoint to retrieve all reports
@app.get("/reports")
async def get_reports():
    return JSONResponse(content={"reports": reports})

# The frontend and optional backend use the same repeatable demo set.
def demo_obstacles():
    dataset = Path(__file__).resolve().parents[1] / "frontend" / "src" / "demo-obstacles.json"
    return json.loads(dataset.read_text(encoding="utf-8"))


@app.on_event("startup")
async def seed_reports():
    # Ensure the uploads directory exists
    uploads_dir = str(UPLOADS)
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Create a dummy image file if it doesn't exist
    dummy_image_path = os.path.join(uploads_dir, "dummy.png")
    if not os.path.exists(dummy_image_path):
        with open(dummy_image_path, "wb") as f:
            f.write(b"dummy image content")
    
    if os.getenv("CITYGUARD_SEED_DEMO") == "true" and not reports:
        reports.extend(demo_obstacles())

ORS_API_KEY = os.getenv("ORS_API_KEY", "")

@app.post("/proxy/ors")
async def proxy_openrouteservice(request: Request):
    if not ORS_API_KEY:
        raise HTTPException(status_code=503, detail="Configure ORS_API_KEY on the backend to enable server routing.")
    try:
        body = await request.json()
        include_demo = body.pop("include_demo_obstacles", None)
        route_reports = reports
        if include_demo is not None:
            route_reports = [report for report in reports if not report.get("demo")]
            if include_demo is True:
                route_reports.extend(demo_obstacles())
        # Server mode also avoids saved reports, using the same 15 m radius.
        polygons = []
        for report in route_reports:
            lat, lon = report['latitude'], report['longitude']
            ring = []
            for i in range(17):
                angle = 2 * math.pi * (i % 16) / 16
                ring.append([lon + 15 * math.cos(angle) / (111195 * math.cos(math.radians(lat))), lat + 15 * math.sin(angle) / 111195])
            polygons.append([ring])
        if polygons:
            body.setdefault('options', {})['avoid_polygons'] = {'type': 'MultiPolygon', 'coordinates': polygons}
        headers = {
            "Content-Type": "application/json",
            "Authorization": ORS_API_KEY,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openrouteservice.org/v2/directions/foot-walking/json",
                json=body,
                headers=headers,
            )
        response.raise_for_status()  # Raise an exception for HTTP errors
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.HTTPStatusError as http_err:
        print(f"HTTP error occurred: {http_err.response.text}")
        raise HTTPException(status_code=http_err.response.status_code, detail=http_err.response.text)
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
