from __future__ import annotations

import random

import pytest

from garbage_detection.geo import (
    BoundingBox,
    Coordinate,
    FallbackLocator,
    Locator,
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
