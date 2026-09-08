from app.risk.parameters import PARAMETERS, HeuristicParameters, clamp
from app.schemas import Driver, Segment, SegmentRisk


def segment_risk(segment: Segment, p: HeuristicParameters = PARAMETERS) -> SegmentRisk:
    rain = clamp(segment.rainfall_mm / p.rainfall_scale_mm)
    slope = clamp(segment.slope_deg / p.slope_scale_deg)
    history = clamp(segment.historical_landslides / p.history_scale)
    road = clamp(segment.road_condition_score / p.road_scale)
    low_elevation = 1 - clamp(segment.elevation_m / p.elevation_scale_m)
    landslide = [
        Driver(factor=name, contribution=weight * value)
        for name, weight, value in zip(
            ("rainfall_mm", "slope_deg", "historical_landslides", "poor_road_condition"),
            p.landslide_weights,
            (rain, slope, history, 1 - road),
            strict=True,
        )
    ]
    flood = [
        Driver(factor=name, contribution=weight * value)
        for name, weight, value in zip(
            ("rainfall_mm", "low_elevation_proxy", "flat_terrain_proxy"),
            p.flood_weights,
            (rain, low_elevation, 1 - slope),
            strict=True,
        )
    ]
    land_score = clamp(sum(d.contribution for d in landslide))
    flood_score = clamp(sum(d.contribution for d in flood))
    a = p.accessibility_weights
    accessibility = clamp(
        a[0] * road
        + a[1] * (1 - slope)
        + a[2] * (1 - rain)
        + a[3] * (1 - max(land_score, flood_score))
    )
    return SegmentRisk(
        landslide_risk=land_score,
        flood_risk=flood_score,
        weather_risk=rain,
        accessibility_score=accessibility,
        landslide_drivers=landslide,
        flood_drivers=flood,
    )
