import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from garbage_detection import server
from garbage_detection.detector import DetectionResult, Prediction, WorkflowRequestError


class FakeDetector:
    def __init__(self):
        self.result = DetectionResult(predictions=())
        self.error = None

    def detect(self, image):
        if self.error:
            raise self.error
        return self.result


def prediction(class_name):
    return Prediction(class_name=class_name, confidence=0.9, x=10, y=10, width=5, height=5)


@pytest.fixture
def detector(monkeypatch):
    fake = FakeDetector()
    monkeypatch.setattr(server, "GarbageDetector", lambda: fake)
    return fake


@pytest.fixture
def client(detector):
    with TestClient(server.app) as test_client:
        yield test_client


def encode_jpeg(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image)
    assert ok
    return buffer.tobytes()


def post_frame(client, payload=None):
    if payload is None:
        payload = encode_jpeg(np.zeros((480, 640, 3), dtype=np.uint8))
    return client.post("/detect-garbage", files={"file": ("frame.jpg", payload, "image/jpeg")})


def test_health_names_the_workflow(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "workflow": "disaster-ial0o/disaster-new-v2-logic"}


def test_detect_returns_per_class_counts(client, detector):
    detector.result = DetectionResult(
        predictions=(prediction("Can"), prediction("Cardboard"), prediction("Can"))
    )

    response = post_frame(client)

    assert response.status_code == 200
    assert response.json() == {"detections": [{"type": "Can", "count": 2}, {"type": "Cardboard", "count": 1}]}


def test_detect_without_garbage_returns_no_detections(client):
    response = post_frame(client)

    assert response.status_code == 200
    assert response.json() == {"detections": []}


def test_detect_reports_workflow_failures(client, detector):
    detector.error = WorkflowRequestError("Workflow call failed with HTTP 503", status_code=503)

    response = post_frame(client)

    assert response.status_code == 502


@pytest.mark.parametrize("payload", [b"", b"not an image"])
def test_detect_rejects_invalid_images(client, payload):
    response = post_frame(client, payload)

    assert response.status_code == 400
