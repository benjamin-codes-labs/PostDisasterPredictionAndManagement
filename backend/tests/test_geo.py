from __future__ import annotations

import queue
import random
import time

import pytest

from garbage_detection import geo
from garbage_detection.geo import (
    BoundingBox,
    Coordinate,
    FallbackLocator,
    Locator,
    SerialGpsLocator,
    SimulatedLocator,
    open_locator,
    parse_position,
)


class FixedLocator(Locator):
    def __init__(self, position: Coordinate | None) -> None:
        self.position = position
        self.closed = False

    def locate(self) -> Coordinate | None:
        return self.position

    def close(self) -> None:
        self.closed = True


def test_parse_position_reads_longitude_then_latitude():
    assert parse_position("113.5439,22.1987\r\r\n") == Coordinate(latitude=22.1987, longitude=113.5439)


@pytest.mark.parametrize("line", ["", "\r\n", "113.5439", "abc,def", "113.5,"])
def test_parse_position_rejects_malformed_lines(line):
    assert parse_position(line) is None


def test_simulated_locator_stays_inside_bounds():
    bounds = BoundingBox(south=22.1, west=113.5, north=22.3, east=113.6)
    locator = SimulatedLocator(bounds, rng=random.Random(0))

    for _ in range(100):
        position = locator.locate()
        assert bounds.south <= position.latitude <= bounds.north
        assert bounds.west <= position.longitude <= bounds.east


def test_fallback_locator_prefers_primary_fix():
    primary = Coordinate(latitude=1.0, longitude=2.0)
    locator = FallbackLocator(FixedLocator(primary), FixedLocator(Coordinate(latitude=3.0, longitude=4.0)))

    assert locator.locate() == primary


def test_fallback_locator_uses_fallback_without_primary_fix():
    fallback = Coordinate(latitude=3.0, longitude=4.0)
    locator = FallbackLocator(FixedLocator(None), FixedLocator(fallback))

    assert locator.locate() == fallback


def test_fallback_locator_closes_both_sources():
    primary, fallback = FixedLocator(None), FixedLocator(None)

    FallbackLocator(primary, fallback).close()

    assert primary.closed and fallback.closed


def test_open_locator_without_port_simulates_positions():
    assert isinstance(open_locator(None, 115_200), SimulatedLocator)


def test_open_locator_with_unavailable_port_simulates_positions():
    assert isinstance(open_locator("/dev/does-not-exist", 115_200), SimulatedLocator)


class FakeSerial:
    """Stands in for `serial.Serial`; `readline` returns queued lines, or b"" after a short wait."""

    def __init__(self, port, baud_rate, timeout):
        self.lines = queue.Queue()
        self.closed = False

    def readline(self):
        try:
            return self.lines.get(timeout=0.01)
        except queue.Empty:
            return b""

    def close(self):
        self.closed = True


@pytest.fixture
def fake_serial(monkeypatch):
    ports = []

    def open_port(*args, **kwargs):
        ports.append(FakeSerial(*args, **kwargs))
        return ports[-1]

    monkeypatch.setattr(geo.serial, "Serial", open_port)
    return ports


def wait_until(condition):
    for _ in range(500):
        if condition():
            return
        time.sleep(0.01)
    raise AssertionError("condition not met")


def test_serial_locator_returns_newest_fix(fake_serial):
    locator = SerialGpsLocator("COM3", 115_200)
    (port,) = fake_serial
    for second in range(60):
        port.lines.put(f"113.5{second:03d},22.1{second:03d}\r\n".encode())

    wait_until(port.lines.empty)
    wait_until(lambda: locator.locate() == Coordinate(latitude=22.1059, longitude=113.5059))
    locator.close()


def test_serial_locator_ignores_malformed_lines(fake_serial):
    locator = SerialGpsLocator("COM3", 115_200)
    (port,) = fake_serial
    port.lines.put(b"113.5439,22.1987\r\n")
    port.lines.put(b"garbled\r\n")

    wait_until(port.lines.empty)
    wait_until(lambda: locator.locate() == Coordinate(latitude=22.1987, longitude=113.5439))
    locator.close()


def test_serial_locator_has_no_fix_before_first_line_or_when_stale(fake_serial):
    locator = SerialGpsLocator("COM3", 115_200, max_fix_age=0.05)
    (port,) = fake_serial
    assert locator.locate() is None

    port.lines.put(b"113.5439,22.1987\r\n")
    wait_until(lambda: locator.locate() is not None)
    wait_until(lambda: locator.locate() is None)
    locator.close()


def test_serial_locator_close_stops_reading_and_closes_port(fake_serial):
    locator = SerialGpsLocator("COM3", 115_200)

    locator.close()

    assert fake_serial[0].closed
    assert not locator._reader.is_alive()
