"""Abstract dataset collection and feature engineering interfaces for Northeast India."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence


@dataclass
class GroundTruthEvent:
    event_id: str
    latitude: float
    longitude: float
    timestamp: str
    hazard_type: str
    severity: str
    source_agency: str
    verified_by_field_team: bool


@dataclass
class ControlSample:
    sample_id: str
    latitude: float
    longitude: float
    timestamp: str
    buffer_distance_from_event_m: float
    slope_match_tolerance_deg: float


class LandslideEventInventory(ABC):
    """Interface for querying official verified landslide event inventories."""

    @abstractmethod
    def get_events(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        start_date: str,
        end_date: str,
    ) -> Sequence[GroundTruthEvent]:
        """Fetch ground-truth events within a spatiotemporal window."""
        pass


class ControlSampler(ABC):
    """Interface for generating matched negative/control samples along road buffers."""

    @abstractmethod
    def sample_controls(
        self,
        events: Sequence[GroundTruthEvent],
        road_buffer_coords: Sequence[tuple[float, float]],
        ratio_neg_to_pos: int = 4,
    ) -> Sequence[ControlSample]:
        """Sample unfailed road segments matched on slope/aspect distributions."""
        pass


class RainfallProvider(ABC):
    """Interface for extracting cumulative precipitation preceding event timestamps."""

    @abstractmethod
    def get_antecedent_rainfall(
        self,
        coords: Sequence[tuple[float, float]],
        timestamps: Sequence[str],
        window_hours: int = 72,
    ) -> Sequence[float]:
        """Fetch mm of rainfall in the specified time window preceding timestamp."""
        pass


class ElevationProvider(ABC):
    """Interface for digital elevation model (DEM) derivatives."""

    @abstractmethod
    def get_topography(
        self,
        coords: Sequence[tuple[float, float]],
    ) -> Sequence[dict[str, float]]:
        """Return elevation (m), slope (deg), and aspect (deg)."""
        pass


class LithologyProvider(ABC):
    """Interface for geological and soil classification."""

    @abstractmethod
    def get_lithology(
        self,
        coords: Sequence[tuple[float, float]],
    ) -> Sequence[dict[str, str]]:
        """Return geological unit, rock strength class, and soil texture."""
        pass


class DrainageProximityProvider(ABC):
    """Interface for river network and drainage proximity."""

    @abstractmethod
    def get_distance_to_drainage_m(
        self,
        coords: Sequence[tuple[float, float]],
    ) -> Sequence[float]:
        """Return distance to nearest perennial or seasonal stream channel in meters."""
        pass
