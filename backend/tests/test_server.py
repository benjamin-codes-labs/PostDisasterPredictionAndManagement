import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from garbage_detection.config import DEFAULT_WEIGHTS
from garbage_detection.server import app

pytestmark = pytest.mark.skipif(not DEFAULT_WEIGHTS.is_file(), reason="model weights not available")


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def encode_jpeg(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image)
    assert ok
    return buffer.tobytes()


def test_health_lists_model_classes(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["classes"]


def test_detect_returns_per_class_counts(client):
    blank = np.zeros((480, 640, 3), dtype=np.uint8)

    response = client.post("/detect-garbage", files={"file": ("frame.jpg", encode_jpeg(blank), "image/jpeg")})

    assert response.status_code == 200
    assert response.json() == {"detections": []}


@pytest.mark.parametrize("payload", [b"", b"not an image"])
def test_detect_rejects_invalid_images(client, payload):
    response = client.post("/detect-garbage", files={"file": ("frame.jpg", payload, "image/jpeg")})

    assert response.status_code == 400
