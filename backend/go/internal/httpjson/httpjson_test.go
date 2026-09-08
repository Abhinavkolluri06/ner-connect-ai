package httpjson

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRejectsTrailingAndOversizedProviderResponse(t *testing.T) {
	for _, body := range []string{`{} {}`, `{"value":"too long"}`, `{"missing":null} trailing`} {
		s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) }))
		var out any
		err := Do(context.Background(), s.Client(), "GET", s.URL, "", nil, &out, 10)
		s.Close()
		if err == nil {
			t.Fatalf("accepted %s", body)
		}
	}
}
