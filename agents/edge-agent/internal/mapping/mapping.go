package mapping

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/korean-self-hosted-erp/edge-agent/internal/models"
)

type Mapper struct{}

func NewMapper() *Mapper {
	return &Mapper{}
}

// MapRecord keeps integration generic; vendor-specific behaviors should be implemented via adapters.
func (m *Mapper) MapRecord(row []string) (models.AttendanceEvent, error) {
	if len(row) < 6 {
		return models.AttendanceEvent{}, fmt.Errorf("invalid row: expected at least 6 columns, got %d", len(row))
	}

	provider := strings.TrimSpace(row[0])
	externalUser := strings.TrimSpace(row[1])
	employeeNumber := strings.TrimSpace(row[2])
	eventType := strings.TrimSpace(row[3])
	eventTime := strings.TrimSpace(row[4])
	deviceID := strings.TrimSpace(row[5])
	siteCode := ""
	if len(row) > 6 {
		siteCode = strings.TrimSpace(row[6])
	}

	hash := sha256.Sum256([]byte(strings.Join(row, "|")))

	return models.AttendanceEvent{
		Provider:      provider,
		Source:        "AGENT_CSV",
		ExternalUser:  externalUser,
		EmployeeNo:    employeeNumber,
		EventType:     eventType,
		EventTime:     eventTime,
		DeviceID:      deviceID,
		SiteCode:      siteCode,
		DedupeHash:    hex.EncodeToString(hash[:]),
		RawPayloadCSV: strings.Join(row, ","),
	}, nil
}
