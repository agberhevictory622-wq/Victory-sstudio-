from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class DesignAnalysisRequest(BaseModel):
    image_ids: List[str]

class Measurements(BaseModel):
    neck: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    shoulder: Optional[float] = None
    sleeve: Optional[float] = None
    length: Optional[float] = None
    bust: Optional[float] = None
    inseam: Optional[float] = None

class PatternGenerationRequest(BaseModel):
    projectName: str
    gender: str = Field(..., pattern="^(male|female|unisex)$")
    style: str = Field(..., pattern="^(shirt|gown|senator|trousers)$")
    measurements: Measurements
