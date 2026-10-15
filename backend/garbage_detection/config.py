"""Paths and defaults shared by the live-camera CLI and the HTTP API."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_DETECTIONS_CSV = PROJECT_ROOT / "data" / "detections.csv"

# Roboflow Workflow "Disaster new v2 Logic", which runs the `disaster-new/2` detection model.
ROBOFLOW_API_URL = "https://serverless.roboflow.com"
ROBOFLOW_WORKSPACE = "disaster-ial0o"
ROBOFLOW_WORKFLOW_ID = "disaster-new-v2-logic"
ROBOFLOW_API_KEY_ENV = "ROBOFLOW_API_KEY"

WORKFLOW_TIMEOUT_SECONDS = 30.0
WORKFLOW_RETRIES = 2

DEFAULT_CONFIDENCE = 0.25
