from fastapi import FastAPI, Form, UploadFile, File, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
import os
import random
import httpx

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
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_paths = []
    if image:  # handle if image is not provided
        for img in image:
            file_path = os.path.join(uploads_dir, img.filename)
            with open(file_path, "wb") as f:
                content = await img.read()
                f.write(content)
            file_paths.append(file_path)
    
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

# Seed 50 random reports on startup
@app.on_event("startup")
async def seed_reports():
    # Ensure the uploads directory exists
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Create a dummy image file if it doesn't exist
    dummy_image_path = os.path.join(uploads_dir, "dummy.png")
    if not os.path.exists(dummy_image_path):
        with open(dummy_image_path, "wb") as f:
            f.write(b"dummy image content")
    
    # Center point for Cismigiu Park, Bucharest
    center_lat = 44.4395
    center_lon = 26.0908
    categories = ['blocked_sidewalk', 'blocked_bike_lane', 'blocked_crosswalk', 'blocked_entrance']
    
    if not reports:
        for i in range(50):
            lat_offset = random.uniform(-0.004, 0.004)
            lon_offset = random.uniform(-0.004, 0.004)
            report = {
                "name": f"Test Report {i+1}",
                "category": random.choice(categories),
                "description": f"Randomly generated report {i+1} for testing purposes.",
                "latitude": center_lat + lat_offset,
                "longitude": center_lon + lon_offset,
                "image_saved_to": [dummy_image_path],
            }
            reports.append(report)

ORS_API_KEY = "" # Load the API key from environment variables

@app.post("/proxy/ors")
async def proxy_openrouteservice(request: Request):
    try:
        body = await request.json()
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
