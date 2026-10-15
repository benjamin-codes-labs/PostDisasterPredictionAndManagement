"""Calls the live Roboflow Workflow; skipped unless ROBOFLOW_API_KEY is set."""

import os

import pytest

from garbage_detection.detector import (
    PREDICTIONS_OUTPUT,
    create_client,
    fetch_workflow_outputs,
    parse_workflow_outputs,
)

# Validation image from the public `disaster-new` dataset that the workflow's model was trained on.
SAMPLE_IMAGE_URL = (
    "https://source.roboflow.com/RYZzhp2TXsUsesBvFFiCHWu0Qc43/79KEznyqBCv5Jc9exFrp/original.jpg"
)

pytestmark = pytest.mark.skipif(not os.environ.get("ROBOFLOW_API_KEY"), reason="ROBOFLOW_API_KEY not set")


def test_workflow_returns_predictions():
    outputs = fetch_workflow_outputs(create_client(), SAMPLE_IMAGE_URL)

    assert len(outputs) == 1
    assert PREDICTIONS_OUTPUT in outputs[0]
    assert {"image", "predictions"} <= outputs[0][PREDICTIONS_OUTPUT].keys()
    assert parse_workflow_outputs(outputs).predictions
