package weather

import (
	"context"
	"encoding/json"
	"github.com/ner-connect-ai/backend-go/internal/memo"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type CachedProvider struct {
	Upstream Provider
	Cache    memo.Cache[models.Weather]
}

func (p *CachedProvider) Healthy(ctx context.Context) bool { return p.Upstream.Healthy(ctx) }
func (p *CachedProvider) Weather(ctx context.Context, in models.RouteCandidate) (models.Weather, error) {
	points := [][2]float64{}
	for _, s := range in.Segments {
		points = append(points, [2]float64{s.Latitude, s.Longitude})
	}
	b, _ := json.Marshal(points)
	return p.Cache.Do(ctx, in.RouteID+string(b), func() (models.Weather, error) { return p.Upstream.Weather(ctx, in) })
}
