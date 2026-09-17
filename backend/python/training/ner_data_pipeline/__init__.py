"""Northeast India Data Pipeline & Regional Dataset Scaffold.

Provides typed interfaces and manifest validators for future regional data collection.
Scaffolded honestly without fabricating unavailable ground-truth inventories.
"""

from .interfaces import (
    ControlSampler,
    DrainageProximityProvider,
    ElevationProvider,
    LandslideEventInventory,
    LithologyProvider,
    RainfallProvider,
)
from .manifest import DatasetManifest, FeatureSpec

__all__ = [
    "DatasetManifest",
    "FeatureSpec",
    "LandslideEventInventory",
    "ControlSampler",
    "RainfallProvider",
    "ElevationProvider",
    "LithologyProvider",
    "DrainageProximityProvider",
]
