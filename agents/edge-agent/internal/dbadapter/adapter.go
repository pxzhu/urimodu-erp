package dbadapter

import (
	"context"

	"github.com/korean-self-hosted-erp/edge-agent/internal/models"
)

// AttendanceDBAdapter defines a generic source contract for attendance collectors.
// Vendor-specific DB logic should be implemented in separate adapters.
type AttendanceDBAdapter interface {
	FetchEvents(ctx context.Context) ([]models.AttendanceEvent, error)
}

// MockAdapter is a starter implementation used for integration tests and local wiring.
// Real adapters can replace this for ADT/S1-like DB sources.
type MockAdapter struct{}

func (m *MockAdapter) FetchEvents(ctx context.Context) ([]models.AttendanceEvent, error) {
	_ = ctx
	return []models.AttendanceEvent{}, nil
}
