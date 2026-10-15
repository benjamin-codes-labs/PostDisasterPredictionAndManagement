"""HTTP API used by the web dashboard's camera recognition mode.

Detection runs on the Roboflow Workflow, so ``ROBOFLOW_API_KEY`` must be set. Run from the
``backend`` directory::

    uvicorn garbage_detection.server:app --port 8000
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import ROBOFLOW_WORKFLOW_ID, ROBOFLOW_WORKSPACE
from .detector import GarbageDetector, WorkflowError, count_by_class

DEFAULT_CORS_ORIGINS = "http://localhost:8080,http://127.0.0.1:8080"


class Detection(BaseModel):
    type: str
    count: int


class DetectionResponse(BaseModel):
    detections: list[Detection]


class HealthResponse(BaseModel):
    status: str
    workflow: str


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.detector = GarbageDetector()
    yield


app = FastAPI(title="Garbage Detection API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ALLOW_ORIGINS", DEFAULT_CORS_ORIGINS).split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def get_detector(request: Request) -> GarbageDetector:
    return request.app.state.detector


def decode_image(data: bytes) -> np.ndarray | None:
    if not data:
        return None
    return cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok", workflow=f"{ROBOFLOW_WORKSPACE}/{ROBOFLOW_WORKFLOW_ID}")


@app.post("/detect-garbage")
def detect_garbage(request: Request, file: Annotated[UploadFile, File()]) -> DetectionResponse:
    image = decode_image(file.file.read())
    if image is None:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    try:
        counts = count_by_class(get_detector(request).detect(image))
    except WorkflowError as error:
        raise HTTPException(status_code=502, detail=f"Detection failed: {error}") from error
    return DetectionResponse(
        detections=[Detection(type=name, count=count) for name, count in counts.most_common()]
    )
