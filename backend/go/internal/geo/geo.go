package geo

import "math"

func Valid(lat, lon float64) bool {
	return !math.IsNaN(lat) && !math.IsNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

func DistanceKM(lat1, lon1, lat2, lon2 float64) float64 {
	r := math.Pi / 180
	dlat, dlon := (lat2-lat1)*r, (lon2-lon1)*r
	a := math.Sin(dlat/2)*math.Sin(dlat/2) + math.Cos(lat1*r)*math.Cos(lat2*r)*math.Sin(dlon/2)*math.Sin(dlon/2)
	return 6371 * 2 * math.Asin(math.Sqrt(math.Min(1, a)))
}

// PointLineKM uses a local equirectangular projection. Suitable for short NER
// road edges; this is advisory matching, not a survey-grade geofence.
func PointLineKM(lat, lon float64, coordinates [][]float64) float64 {
	best := math.Inf(1)
	kx, ky := 111.195*math.Cos(lat*math.Pi/180), 111.195
	for i, p := range coordinates {
		best = math.Min(best, DistanceKM(lat, lon, p[1], p[0]))
		if i == 0 {
			continue
		}
		q := coordinates[i-1]
		ax, ay, bx, by := (q[0]-lon)*kx, (q[1]-lat)*ky, (p[0]-lon)*kx, (p[1]-lat)*ky
		dx, dy := bx-ax, by-ay
		if dx*dx+dy*dy == 0 {
			continue
		}
		t := math.Max(0, math.Min(1, -(ax*dx+ay*dy)/(dx*dx+dy*dy)))
		best = math.Min(best, math.Hypot(ax+t*dx, ay+t*dy))
	}
	return best
}
