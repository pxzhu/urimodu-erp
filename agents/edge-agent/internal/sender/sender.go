package sender

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/korean-self-hosted-erp/edge-agent/internal/models"
)

type EventSender interface {
	Send(ctx context.Context, event models.AttendanceEvent) error
}

type HTTPEventSender struct {
	gatewayURL string
	apiKey     string
	client     *http.Client
}

func NewHTTPEventSender(gatewayURL, apiKey string) *HTTPEventSender {
	return &HTTPEventSender{
		gatewayURL: gatewayURL,
		apiKey:     apiKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *HTTPEventSender) Send(ctx context.Context, event models.AttendanceEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.gatewayURL, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	if s.apiKey != "" {
		req.Header.Set("X-Edge-Agent-Key", s.apiKey)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("send event: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("gateway status %d", resp.StatusCode)
	}
	return nil
}
