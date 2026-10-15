"""Garbage detection on a live camera, logging geotagged counts to CSV.

One frame every ``--log-interval`` seconds is sent to the Roboflow Workflow (``ROBOFLOW_API_KEY``
must be set); the preview shows the latest boxes on top of the live feed.

Example (run from the ``backend`` directory)::

    python -m garbage_detection.live --source 0 --gps-port COM3

Press ``q`` in the preview window to stop.
"""

from __future__ import annotations

import argparse
import contextlib
import logging
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from .config import DEFAULT_CONFIDENCE, DEFAULT_DETECTIONS_CSV
from .detector import DetectionResult, GarbageDetector, WorkflowError, count_by_class
from .geo import open_locator
from .records import DetectionLog

logger = logging.getLogger(__name__)

WINDOW_TITLE = "Garbage detection (press q to quit)"
QUIT_KEY = ord("q")
BOX_COLOR = (0, 0, 255)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Live-camera garbage detection with geotagged CSV logging.")
    parser.add_argument(
        "--source",
        default="0",
        help="camera index or video/stream URL, e.g. http://192.168.50.10:81/stream (default: %(default)s)",
    )
    parser.add_argument(
        "--gps-port",
        help="serial port of the GPS module, e.g. COM3 or /dev/ttyUSB0 (default: simulated positions)",
    )
    parser.add_argument("--baud-rate", type=int, default=115_200, help="GPS baud rate (default: %(default)s)")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DETECTIONS_CSV,
        help="CSV file to append to (default: %(default)s)",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=DEFAULT_CONFIDENCE,
        help="minimum confidence (default: %(default)s)",
    )
    parser.add_argument(
        "--log-interval",
        type=float,
        default=1.0,
        help="seconds between frames sent to the workflow and logged (default: %(default)s)",
    )
    return parser.parse_args(argv)


def open_capture(source: str) -> cv2.VideoCapture:
    capture = cv2.VideoCapture(int(source) if source.isdigit() else source)
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video source {source!r}")
    return capture


def draw_detections(frame: np.ndarray, result: DetectionResult) -> None:
    for prediction in result.predictions:
        half_width, half_height = prediction.width / 2, prediction.height / 2
        top_left = (round(prediction.x - half_width), round(prediction.y - half_height))
        bottom_right = (round(prediction.x + half_width), round(prediction.y + half_height))
        cv2.rectangle(frame, top_left, bottom_right, BOX_COLOR, 2)
        label = f"{prediction.class_name} {prediction.confidence:.2f}"
        cv2.putText(frame, label, (top_left[0], top_left[1] - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, BOX_COLOR, 1)


def run(args: argparse.Namespace) -> None:
    detector = GarbageDetector(confidence=args.confidence)
    log = DetectionLog(args.output)
    capture = open_capture(args.source)
    last_sampled_at = float("-inf")
    latest = DetectionResult(predictions=())
    logger.info("Sampling a frame every %g s; logging to %s", args.log_interval, log.path)

    with contextlib.closing(open_locator(args.gps_port, args.baud_rate)) as locator:
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    logger.info("Video source ended")
                    break

                now = time.monotonic()
                if now - last_sampled_at >= args.log_interval:
                    last_sampled_at = now
                    try:
                        latest = detector.detect(frame)
                    except WorkflowError as error:
                        logger.warning("Frame skipped: %s", error)
                        latest = DetectionResult(predictions=())
                    counts = count_by_class(latest)
                    location = locator.locate() if counts else None
                    if counts and location is None:
                        logger.warning("No position fix; detection not logged")
                    elif counts:
                        log.append(counts, location, datetime.now().astimezone())
                        logger.info(
                            "Logged %s at (%.6f, %.6f)", dict(counts), location.latitude, location.longitude
                        )

                draw_detections(frame, latest)
                cv2.imshow(WINDOW_TITLE, frame)
                if cv2.waitKey(1) & 0xFF == QUIT_KEY:
                    break
        finally:
            capture.release()
            cv2.destroyAllWindows()


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(parse_args(argv))


if __name__ == "__main__":
    main()
