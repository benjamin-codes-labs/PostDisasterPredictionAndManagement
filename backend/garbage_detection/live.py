"""Real-time garbage detection from a camera, logging geotagged counts to CSV.

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

from .config import DEFAULT_CONFIDENCE, DEFAULT_DETECTIONS_CSV, DEFAULT_WEIGHTS
from .detector import GarbageDetector, count_by_class
from .geo import open_locator
from .records import DetectionLog

logger = logging.getLogger(__name__)

WINDOW_TITLE = "Garbage detection (press q to quit)"
QUIT_KEY = ord("q")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Real-time garbage detection with geotagged CSV logging.")
    parser.add_argument(
        "--weights", type=Path, default=DEFAULT_WEIGHTS, help="YOLO weights file (default: %(default)s)"
    )
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
        help="minimum seconds between logged frames (default: %(default)s)",
    )
    return parser.parse_args(argv)


def open_capture(source: str) -> cv2.VideoCapture:
    capture = cv2.VideoCapture(int(source) if source.isdigit() else source)
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video source {source!r}")
    return capture


def run(args: argparse.Namespace) -> None:
    detector = GarbageDetector(args.weights, args.confidence)
    log = DetectionLog(args.output)
    capture = open_capture(args.source)
    last_logged_at = float("-inf")
    logger.info("Detecting %s; logging to %s", ", ".join(detector.class_names), log.path)

    with contextlib.closing(open_locator(args.gps_port, args.baud_rate)) as locator:
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    logger.info("Video source ended")
                    break

                result = detector.detect(frame)
                counts = count_by_class(result)
                now = time.monotonic()
                if counts and now - last_logged_at >= args.log_interval:
                    location = locator.locate()
                    if location is None:
                        logger.warning("No position fix; detection not logged")
                    else:
                        log.append(counts, location, datetime.now().astimezone())
                        last_logged_at = now
                        logger.info(
                            "Logged %s at (%.6f, %.6f)", dict(counts), location.latitude, location.longitude
                        )

                cv2.imshow(WINDOW_TITLE, result.plot())
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
