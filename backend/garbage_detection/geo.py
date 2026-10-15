"""Location sources used to geotag detections."""

from __future__ import annotations

import abc
import logging
import random
import threading
import time
from dataclasses import dataclass

import serial

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Coordinate:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class BoundingBox:
    south: float
    west: float
    north: float
    east: float


# Covers the Macau Peninsula, Taipa, Cotai and Coloane.
MACAU_BOUNDS = BoundingBox(south=22.1, west=113.5, north=22.3, east=113.6)

# A GPS fix older than this is treated as lost.
MAX_FIX_AGE_SECONDS = 10.0


class Locator(abc.ABC):
    """A source of the device's current position."""

    @abc.abstractmethod
    def locate(self) -> Coordinate | None:
        """Return the current position, or ``None`` if no fix is available."""

    def close(self) -> None:  # noqa: B027 - optional hook; most locators hold no resources
        """Release any underlying resources."""


class SimulatedLocator(Locator):
    """Uniformly random positions inside a bounding box, for demos without GPS hardware."""

    def __init__(self, bounds: BoundingBox = MACAU_BOUNDS, rng: random.Random | None = None) -> None:
        self._bounds = bounds
        self._rng = rng or random.Random()

    def locate(self) -> Coordinate:
        return Coordinate(
            latitude=self._rng.uniform(self._bounds.south, self._bounds.north),
            longitude=self._rng.uniform(self._bounds.west, self._bounds.east),
        )


class SerialGpsLocator(Locator):
    """Reads positions from a GPS module that prints ``<longitude>,<latitude>`` lines over serial.

    A background thread reads every line as it arrives, so ``locate`` returns the newest fix instead of
    the oldest line waiting in the serial buffer.
    """

    def __init__(
        self, port: str, baud_rate: int, timeout: float = 1.0, max_fix_age: float = MAX_FIX_AGE_SECONDS
    ) -> None:
        self._serial = serial.Serial(port, baud_rate, timeout=timeout)
        self._max_fix_age = max_fix_age
        self._latest: tuple[float, Coordinate] | None = None
        self._closed = threading.Event()
        self._reader = threading.Thread(target=self._read_lines, daemon=True)
        self._reader.start()

    def locate(self) -> Coordinate | None:
        latest = self._latest
        if latest is None or time.monotonic() - latest[0] > self._max_fix_age:
            return None
        return latest[1]

    def close(self) -> None:
        self._closed.set()
        self._reader.join(timeout=5)
        self._serial.close()

    def _read_lines(self) -> None:
        while not self._closed.is_set():
            try:
                line = self._serial.readline()
            except serial.SerialException as error:
                logger.warning("Lost the GPS connection (%s); using simulated positions", error)
                return
            position = parse_position(line.decode("ascii", errors="ignore"))
            if position is not None:
                self._latest = (time.monotonic(), position)


class FallbackLocator(Locator):
    """Uses ``primary`` whenever it has a fix and ``fallback`` otherwise."""

    def __init__(self, primary: Locator, fallback: Locator) -> None:
        self._primary = primary
        self._fallback = fallback

    def locate(self) -> Coordinate | None:
        return self._primary.locate() or self._fallback.locate()

    def close(self) -> None:
        self._primary.close()
        self._fallback.close()


def parse_position(line: str) -> Coordinate | None:
    """Parse a ``<longitude>,<latitude>`` line, returning ``None`` if it is malformed."""
    try:
        longitude, latitude = (float(value) for value in line.strip().split(",")[:2])
    except ValueError:
        return None
    return Coordinate(latitude=latitude, longitude=longitude)


def open_locator(gps_port: str | None, baud_rate: int) -> Locator:
    """Connect to the GPS module on ``gps_port``, falling back to simulated positions."""
    simulated = SimulatedLocator()
    if gps_port is None:
        logger.info("No GPS port given; using simulated positions")
        return simulated

    try:
        gps = SerialGpsLocator(gps_port, baud_rate)
    except serial.SerialException as error:
        logger.warning("Cannot open GPS on %s (%s); using simulated positions", gps_port, error)
        return simulated

    logger.info("Reading positions from GPS on %s", gps_port)
    return FallbackLocator(gps, simulated)
