package routing

import (
	"context"
	"encoding/json"
	"github.com/ner-connect-ai/backend-go/internal/memo"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

type CachedProvider struct {
	Upstream Provider
	Cache    memo.Cache[[]models.RouteCandidate]
}

func (p *CachedProvider) Healthy(ctx context.Context) bool { return p.Upstream.Healthy(ctx) }
func (p *CachedProvider) Routes(ctx context.Context, in models.AnalyzeRequest) ([]models.RouteCandidate, error) {
	b, _ := json.Marshal(in)
	return p.Cache.Do(ctx, string(b), func() ([]models.RouteCandidate, error) { return p.Upstream.Routes(ctx, in) })
}
