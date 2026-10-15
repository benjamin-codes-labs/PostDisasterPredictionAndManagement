"""CSV log of geotagged detections, in the format imported by the web dashboard."""

from __future__ import annotations

import csv
import uuid
from collections.abc import Iterable, Mapping
from datetime import datetime
from pathlib import Path

from .geo import Coordinate

CSV_COLUMNS = ("id", "type", "latitude", "longitude", "count", "timestamp")


class DetectionLog:
    """Appends one row per garbage type each time a frame is logged."""

    def __init__(self, path: Path) -> None:
        self.path = path
        if not path.exists() or path.stat().st_size == 0:
            path.parent.mkdir(parents=True, exist_ok=True)
            self._write_rows([CSV_COLUMNS], mode="w")

    def append(self, counts: Mapping[str, int], location: Coordinate, recorded_at: datetime) -> None:
        timestamp = recorded_at.isoformat(timespec="seconds")
        self._write_rows(
            (
                uuid.uuid4().hex,
                garbage_type,
                f"{location.latitude:.6f}",
                f"{location.longitude:.6f}",
                count,
                timestamp,
            )
            for garbage_type, count in counts.items()
        )

    def _write_rows(self, rows: Iterable[Iterable[object]], mode: str = "a") -> None:
        with self.path.open(mode, newline="", encoding="utf-8") as file:
            csv.writer(file).writerows(rows)
