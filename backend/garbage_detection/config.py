"""Paths and defaults shared by the live-camera CLI and the HTTP API."""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_WEIGHTS = Path(os.environ.get("GARBAGE_MODEL_PATH", PROJECT_ROOT / "models" / "best.pt"))
DEFAULT_DETECTIONS_CSV = PROJECT_ROOT / "data" / "detections.csv"

DEFAULT_CONFIDENCE = 0.25
