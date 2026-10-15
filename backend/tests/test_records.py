import csv
from collections import Counter
from datetime import datetime, timedelta, timezone

from garbage_detection.geo import Coordinate
from garbage_detection.records import CSV_COLUMNS, DetectionLog

MACAU_TIME = timezone(timedelta(hours=8))


def read_rows(path):
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.reader(file))


def test_new_log_starts_with_header(tmp_path):
    path = tmp_path / "nested" / "detections.csv"

    DetectionLog(path)

    assert read_rows(path) == [list(CSV_COLUMNS)]


def test_append_writes_one_row_per_type(tmp_path):
    log = DetectionLog(tmp_path / "detections.csv")

    log.append(
        Counter({"Plastic": 2, "Glass": 1}),
        Coordinate(latitude=22.1987, longitude=113.5439),
        datetime(2025, 9, 24, 10, 30, tzinfo=MACAU_TIME),
    )

    header, *rows = read_rows(log.path)
    assert header == list(CSV_COLUMNS)
    assert [row[1:] for row in rows] == [
        ["Plastic", "22.198700", "113.543900", "2", "2025-09-24T10:30:00+08:00"],
        ["Glass", "22.198700", "113.543900", "1", "2025-09-24T10:30:00+08:00"],
    ]
    assert len({row[0] for row in rows}) == len(rows)


def test_existing_log_is_appended_to(tmp_path):
    path = tmp_path / "detections.csv"
    location = Coordinate(latitude=22.2, longitude=113.55)
    now = datetime.now(MACAU_TIME)

    DetectionLog(path).append({"Metal": 1}, location, now)
    DetectionLog(path).append({"Trash": 3}, location, now)

    header, *rows = read_rows(path)
    assert header == list(CSV_COLUMNS)
    assert [row[1] for row in rows] == ["Metal", "Trash"]
