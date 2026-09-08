// Package httpjson bounds and validates responses from external providers.
package httpjson

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func Do(ctx context.Context, client *http.Client, method, endpoint, key string, body any, out any, limit int64) error {
	var data []byte
	var err error
	if body != nil {
		data, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("invalid provider URL")
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "NER-Connect-AI/1.0")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if key != "" {
		req.Header.Set("Authorization", key)
	}
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return fmt.Errorf("provider transport failed: %T", err)
	} // URLs can contain secrets.
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("provider HTTP %d", resp.StatusCode)
	}
	if limit <= 0 {
		limit = 2 << 20
	}
	data, err = io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return fmt.Errorf("read provider response: %w", err)
	}
	if int64(len(data)) > limit {
		return fmt.Errorf("provider response exceeds size limit")
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("invalid provider JSON: %w", err)
	}
	return nil
}
