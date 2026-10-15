import threading

import numpy as np
import pytest

from garbage_detection.detector import DetectionResult, WorkflowRequestError
from garbage_detection.live import BackgroundDetection

FRAME = np.zeros((48, 64, 3), dtype=np.uint8)


class BlockingDetector:
    """Answers each `detect` call with `outcome` once `release` is set."""

    def __init__(self, outcome):
        self.outcome = outcome
        self.release = threading.Event()

    def detect(self, image):
        assert self.release.wait(5)
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


def wait_for_outcome(detection):
    for _ in range(500):
        outcome = detection.poll()
        if outcome is not None:
            return outcome
        threading.Event().wait(0.01)
    raise AssertionError("detection did not finish")


def test_poll_returns_nothing_while_detection_runs():
    detector = BlockingDetector(DetectionResult(predictions=()))
    detection = BackgroundDetection(detector)

    detection.start(FRAME)

    assert detection.busy
    assert detection.poll() is None
    detector.release.set()
    assert wait_for_outcome(detection) == DetectionResult(predictions=())
    assert not detection.busy


def test_poll_returns_workflow_errors():
    error = WorkflowRequestError("Workflow call failed with HTTP 503", status_code=503)
    detector = BlockingDetector(error)
    detector.release.set()
    detection = BackgroundDetection(detector)

    detection.start(FRAME)

    assert wait_for_outcome(detection) is error


def test_only_one_detection_runs_at_a_time():
    detector = BlockingDetector(DetectionResult(predictions=()))
    detection = BackgroundDetection(detector)
    detection.start(FRAME)

    with pytest.raises(RuntimeError):
        detection.start(FRAME)
    detector.release.set()


def test_idle_detection_polls_nothing():
    assert BackgroundDetection(BlockingDetector(None)).poll() is None
