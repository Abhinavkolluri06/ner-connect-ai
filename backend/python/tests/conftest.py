import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def payload():
    return {
        "route_id": "route-a",
        "segments": [
            {
                "latitude": 25.57,
                "longitude": 91.88,
                "rainfall_mm": 82,
                "slope_deg": 34,
                "elevation_m": 1300,
                "historical_landslides": 7,
                "road_condition_score": 55,
            }
        ],
    }


@pytest.fixture
def client():
    with TestClient(create_app(Settings())) as test_client:
        yield test_client
