"""Client for the Roboflow Workflow that detects post-disaster garbage."""

from __future__ import annotations

import logging
import os
import threading
import time
from collections import Counter
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TypeVar, Union

import numpy as np
import requests
from inference_sdk import InferenceConfiguration, InferenceHTTPClient
from inference_sdk.http.errors import HTTPCallErrorError, HTTPClientError

from .config import (
    DEFAULT_CONFIDENCE,
    ROBOFLOW_API_KEY_ENV,
    ROBOFLOW_API_URL,
    ROBOFLOW_WORKFLOW_ID,
    ROBOFLOW_WORKSPACE,
    WORKFLOW_RETRIES,
    WORKFLOW_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)

# Name of the workflow's only output, a JsonField holding the model's object-detection predictions.
PREDICTIONS_OUTPUT = "predictions"

RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})
RETRY_BACKOFF_SECONDS = 1.0

# A BGR image, a local path, an https URL or a base64 string, as accepted by `InferenceHTTPClient`.
ImageInput = Union[np.ndarray, str, Path]

T = TypeVar("T")


class WorkflowError(RuntimeError):
    """Base class for failures running the Roboflow Workflow."""


class WorkflowConfigError(WorkflowError):
    """The client is not configured, e.g. the API key is missing."""


class WorkflowRequestError(WorkflowError):
    """The workflow call failed; ``status_code`` is set when the server answered."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class WorkflowTimeoutError(WorkflowRequestError):
    """The workflow did not answer within the timeout."""


class WorkflowResponseError(WorkflowError):
    """The workflow answered with an unexpected payload."""


@dataclass(frozen=True)
class Prediction:
    """One detected object; ``x`` and ``y`` are the box centre, all in pixels."""

    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float


@dataclass(frozen=True)
class DetectionResult:
    predictions: tuple[Prediction, ...]


def create_client(api_key: str | None = None) -> InferenceHTTPClient:
    """Serverless client that sends the API key (default: ``$ROBOFLOW_API_KEY``) in a header."""
    api_key = api_key or os.environ.get(ROBOFLOW_API_KEY_ENV)
    if not api_key:
        raise WorkflowConfigError(
            f"Set the {ROBOFLOW_API_KEY_ENV} environment variable to your Roboflow API key "
            "(https://app.roboflow.com/settings/api)"
        )
    client = InferenceHTTPClient(api_url=ROBOFLOW_API_URL, api_key=api_key)
    # Retries are handled by `fetch_workflow_outputs`, which also retries timeouts.
    client.configure(InferenceConfiguration(api_key_transport="header", workflow_run_retries_enabled=False))
    return client


def fetch_workflow_outputs(
    client: InferenceHTTPClient,
    image: ImageInput,
    timeout: float = WORKFLOW_TIMEOUT_SECONDS,
    retries: int = WORKFLOW_RETRIES,
) -> list[dict[str, Any]]:
    """Raw workflow outputs for one image: one dict per input image, keyed by output name."""
    attempt = 0
    while True:
        try:
            return _call_with_timeout(
                lambda: client.run_workflow(
                    workspace_name=ROBOFLOW_WORKSPACE,
                    workflow_id=ROBOFLOW_WORKFLOW_ID,
                    images={"image": image},
                ),
                timeout,
            )
        except (KeyError, ValueError) as error:
            # Raised by the SDK while decoding a 200 response that is not workflow output JSON.
            raise WorkflowResponseError(f"Unexpected workflow response: {error!r}") from error
        except (HTTPClientError, TimeoutError, requests.RequestException) as error:
            failure = _as_request_error(error)
            if attempt == retries or not _is_retryable(error):
                raise failure from error

        delay = RETRY_BACKOFF_SECONDS * 2**attempt
        logger.warning("%s; retrying in %.0f s", failure, delay)
        time.sleep(delay)
        attempt += 1


def run_disaster_workflow(
    client: InferenceHTTPClient,
    image: ImageInput,
    timeout: float = WORKFLOW_TIMEOUT_SECONDS,
    retries: int = WORKFLOW_RETRIES,
) -> DetectionResult:
    """Run the "Disaster new v2 Logic" workflow on one image, retrying transient failures."""
    return parse_workflow_outputs(fetch_workflow_outputs(client, image, timeout, retries))


def parse_workflow_outputs(outputs: Sequence[Mapping[str, Any]]) -> DetectionResult:
    """Read the predictions of the first (and only) image from the workflow's raw outputs."""
    try:
        detections = outputs[0][PREDICTIONS_OUTPUT]["predictions"]
        predictions = tuple(
            Prediction(
                class_name=str(item["class"]),
                confidence=float(item["confidence"]),
                x=float(item["x"]),
                y=float(item["y"]),
                width=float(item["width"]),
                height=float(item["height"]),
            )
            for item in detections
        )
    except (IndexError, KeyError, TypeError, ValueError) as error:
        raise WorkflowResponseError(f"Unexpected workflow response: missing or invalid {error}") from error
    return DetectionResult(predictions)


def _call_with_timeout(function: Callable[[], T], timeout: float) -> T:
    """Run ``function`` in a daemon thread, since the SDK's HTTP requests have no timeout of their own."""
    outcome: dict[str, Any] = {}

    def target() -> None:
        try:
            outcome["value"] = function()
        except BaseException as error:
            outcome["error"] = error

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise TimeoutError(f"Workflow did not answer within {timeout:g} s")
    if "error" in outcome:
        raise outcome["error"]
    return outcome["value"]


def _is_retryable(error: Exception) -> bool:
    """Timeouts, lost connections and transient server errors are worth retrying."""
    if isinstance(error, HTTPCallErrorError):
        return error.status_code in RETRYABLE_STATUS_CODES
    return isinstance(error, (TimeoutError, requests.RequestException)) or type(error) is HTTPClientError


def _as_request_error(error: Exception) -> WorkflowRequestError:
    if isinstance(error, TimeoutError):
        return WorkflowTimeoutError(str(error))
    if isinstance(error, HTTPCallErrorError):
        return WorkflowRequestError(
            f"Workflow call failed with HTTP {error.status_code}: {error.api_message or error.description}",
            status_code=error.status_code,
        )
    return WorkflowRequestError(f"Workflow call failed: {error}")


class GarbageDetector:
    """Detects garbage in BGR images with the Roboflow Workflow."""

    def __init__(
        self,
        client: InferenceHTTPClient | None = None,
        confidence: float = DEFAULT_CONFIDENCE,
        timeout: float = WORKFLOW_TIMEOUT_SECONDS,
        retries: int = WORKFLOW_RETRIES,
    ) -> None:
        self._client = client or create_client()
        self._confidence = confidence
        self._timeout = timeout
        self._retries = retries

    def detect(self, image: ImageInput) -> DetectionResult:
        result = run_disaster_workflow(self._client, image, self._timeout, self._retries)
        return DetectionResult(tuple(p for p in result.predictions if p.confidence >= self._confidence))


def count_by_class(result: DetectionResult) -> Counter[str]:
    """Number of detected objects per class name."""
    return Counter(prediction.class_name for prediction in result.predictions)
