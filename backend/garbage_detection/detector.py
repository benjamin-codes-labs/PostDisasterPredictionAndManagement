"""Thin wrapper around an Ultralytics YOLO model."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import numpy as np
from ultralytics import YOLO
from ultralytics.engine.results import Results

from .config import DEFAULT_CONFIDENCE


class GarbageDetector:
    """Detects garbage in BGR images using trained YOLO weights."""

    def __init__(self, weights: Path, confidence: float = DEFAULT_CONFIDENCE) -> None:
        if not weights.is_file():
            raise FileNotFoundError(f"Model weights not found: {weights}")
        self._model = YOLO(str(weights))
        self._confidence = confidence

    @property
    def class_names(self) -> list[str]:
        return list(self._model.names.values())

    def detect(self, image: np.ndarray) -> Results:
        return self._model.predict(image, conf=self._confidence, verbose=False)[0]


def count_by_class(result: Results) -> Counter[str]:
    """Number of detected objects per class name."""
    return Counter(result.names[int(class_id)] for class_id in result.boxes.cls.tolist())
