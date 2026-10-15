import json
import threading
from pathlib import Path

import numpy as np
import pytest
import requests
from inference_sdk.http.errors import HTTPCallErrorError, HTTPClientError

from garbage_detection import detector
from garbage_detection.detector import (
    GarbageDetector,
    Prediction,
    WorkflowConfigError,
    WorkflowRequestError,
    WorkflowResponseError,
    WorkflowTimeoutError,
    count_by_class,
    create_client,
    parse_workflow_outputs,
    run_disaster_workflow,
)

# Response recorded from a real run of the "Disaster new v2 Logic" workflow.
RECORDED_RESPONSE = json.loads((Path(__file__).parent / "fixtures" / "workflow_response.json").read_text())

BLANK = np.zeros((48, 64, 3), dtype=np.uint8)


class FakeClient:
    """Stands in for `InferenceHTTPClient`, replaying one outcome per call."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.calls = []

    def run_workflow(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


def http_error(status_code):
    return HTTPCallErrorError(description="error", status_code=status_code, api_message="message")


@pytest.fixture(autouse=True)
def no_backoff(monkeypatch):
    monkeypatch.setattr(detector.time, "sleep", lambda seconds: None)


def test_parse_recorded_response():
    result = parse_workflow_outputs(RECORDED_RESPONSE)

    assert result.predictions == (
        Prediction(
            class_name="Drink container", confidence=0.7782317399978638, x=323, y=406, width=30, height=42
        ),
    )


def test_parse_response_without_detections():
    outputs = [{"predictions": {"image": {"width": 1, "height": 1}, "predictions": []}}]

    result = parse_workflow_outputs(outputs)

    assert result.predictions == ()


@pytest.mark.parametrize(
    "outputs",
    [[], [{}], [{"predictions": None}], [{"predictions": {"predictions": [{"class": "Can"}]}}]],
)
def test_parse_rejects_unexpected_responses(outputs):
    with pytest.raises(WorkflowResponseError):
        parse_workflow_outputs(outputs)


def test_run_sends_image_to_the_workflow():
    client = FakeClient(RECORDED_RESPONSE)

    run_disaster_workflow(client, BLANK)

    (call,) = client.calls
    assert call["workspace_name"] == "disaster-ial0o"
    assert call["workflow_id"] == "disaster-new-v2-logic"
    assert call["images"]["image"] is BLANK


@pytest.mark.parametrize(
    "error",
    [
        http_error(503),
        http_error(429),
        HTTPClientError("connection reset"),
        requests.exceptions.ChunkedEncodingError("connection broken mid-response"),
    ],
)
def test_run_retries_transient_failures(error):
    client = FakeClient(error, RECORDED_RESPONSE)

    result = run_disaster_workflow(client, BLANK, retries=2)

    assert len(client.calls) == 2
    assert count_by_class(result) == {"Drink container": 1}


def test_run_gives_up_after_retries():
    client = FakeClient(http_error(503), http_error(503), http_error(503))

    with pytest.raises(WorkflowRequestError) as raised:
        run_disaster_workflow(client, BLANK, retries=2)

    assert raised.value.status_code == 503
    assert len(client.calls) == 3


def test_run_does_not_retry_client_errors():
    client = FakeClient(http_error(401), RECORDED_RESPONSE)

    with pytest.raises(WorkflowRequestError) as raised:
        run_disaster_workflow(client, BLANK)

    assert raised.value.status_code == 401
    assert len(client.calls) == 1


@pytest.mark.parametrize(
    "error",
    [
        requests.exceptions.JSONDecodeError("Expecting value", "<html>", 0),
        KeyError("outputs"),
    ],
)
def test_run_reports_undecodable_responses(error):
    client = FakeClient(error, RECORDED_RESPONSE)

    with pytest.raises(WorkflowResponseError):
        run_disaster_workflow(client, BLANK)

    assert len(client.calls) == 1


def test_run_times_out():
    client = FakeClient()
    client.run_workflow = lambda **kwargs: threading.Event().wait(1)

    with pytest.raises(WorkflowTimeoutError):
        run_disaster_workflow(client, BLANK, timeout=0.05, retries=0)


def test_detector_drops_low_confidence_predictions():
    result = GarbageDetector(FakeClient(RECORDED_RESPONSE), confidence=0.9).detect(BLANK)

    assert result.predictions == ()


def test_create_client_requires_api_key(monkeypatch):
    monkeypatch.delenv("ROBOFLOW_API_KEY", raising=False)

    with pytest.raises(WorkflowConfigError):
        create_client()
