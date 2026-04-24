from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from typing import List
from app.models.schemas import DesignAnalysisRequest, PatternGenerationRequest
from app.services.ai_pipeline import analyze_design, generate_pattern_geometry
import uuid
import os

router = APIRouter()

@router.post("/upload-images")
async def upload_design_images(files: List[UploadFile] = File(...)):
    """Async upload and store images for fusion analysis"""
    upload_ids = []
    for file in files:
        file_id = str(uuid.uuid4())
        path = f"static/uploads/{file_id}.jpg"
        with open(path, "wb") as f:
            f.write(await file.read())
        upload_ids.append(file_id)
    return {"message": "Upload successful", "image_ids": upload_ids}

@router.post("/analyze-design")
async def analyze_design_endpoint(request: DesignAnalysisRequest):
    """Trigger multi-angle vision fusion and structural extraction"""
    try:
        analysis_result = await analyze_design(request.image_ids)
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-pattern")
async def generate_pattern_endpoint(request: PatternGenerationRequest, background_tasks: BackgroundTasks):
    """Generate professional tailoring pattern PDFs and SVG previews"""
    # Background task for heavy pattern math
    task_id = str(uuid.uuid4())
    background_tasks.add_task(generate_pattern_geometry, request, task_id)
    return {"status": "processing", "task_id": task_id, "message": "Pattern generation initiated in background."}

@router.get("/download-pdf/{pattern_id}")
async def download_pattern_pdf(pattern_id: str):
    """Retrieve generated pattern asset"""
    path = f"static/pdfs/{pattern_id}.pdf"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Pattern file not found or still processing.")
    return {"url": f"/static/pdfs/{pattern_id}.pdf"}
