package mapping

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/korean-self-hosted-erp/edge-agent/internal/models"
)

type SourceRow struct {
	Provider      string
	ExternalUser  string
	EmployeeNo    string
	EventType     string
	EventTime     string
	DeviceID      string
	SiteCode      string
	RawColumns    []string
	RawPayloadCSV string
}

type Mapper struct {
	identityMap map[string]string
	provider    string
	companyCode string
}

func NewMapper(identityMapPath, provider, companyCode string) (*Mapper, error) {
	identityMap := map[string]string{}
	if identityMapPath != "" {
		content, err := os.ReadFile(identityMapPath)
		if err == nil {
			if err := json.Unmarshal(content, &identityMap); err != nil {
				return nil, fmt.Errorf("parse identity map: %w", err)
			}
		}
	}

	return &Mapper{
		identityMap: identityMap,
		provider:    strings.ToUpper(strings.TrimSpace(provider)),
		companyCode: strings.TrimSpace(companyCode),
	}, nil
}

func (m *Mapper) resolveEmployeeNumber(externalUserID, provided string) string {
	trimmedProvided := strings.TrimSpace(provided)
	if trimmedProvided != "" {
		return trimmedProvided
	}

	mapped := m.identityMap[strings.TrimSpace(externalUserID)]
	return strings.TrimSpace(mapped)
}

// MapRecord keeps integration generic; vendor-specific behaviors should be implemented via adapters.
func (m *Mapper) MapRecord(row SourceRow) (models.AttendanceEvent, error) {
	externalUser := strings.TrimSpace(row.ExternalUser)
	if externalUser == "" {
		return models.AttendanceEvent{}, fmt.Errorf("externalUserId is required")
	}

	eventType := strings.TrimSpace(row.EventType)
	if eventType == "" {
		return models.AttendanceEvent{}, fmt.Errorf("eventType is required")
	}

	eventTime := strings.TrimSpace(row.EventTime)
	if eventTime == "" {
		return models.AttendanceEvent{}, fmt.Errorf("eventTimestamp is required")
	}

	employeeNumber := m.resolveEmployeeNumber(externalUser, row.EmployeeNo)
	if employeeNumber == "" {
		return models.AttendanceEvent{}, fmt.Errorf("employeeNumber mapping not found for externalUserId=%s", externalUser)
	}

	provider := strings.ToUpper(strings.TrimSpace(row.Provider))
	if provider == "" {
		provider = m.provider
	}

	hash := sha256.Sum256(
		[]byte(
			strings.Join(
				[]string{
					m.companyCode,
					provider,
					externalUser,
					eventType,
					eventTime,
					strings.TrimSpace(row.DeviceID),
					strings.TrimSpace(row.SiteCode),
					employeeNumber,
				},
				"|",
			),
		),
	)

	rawPayload := row.RawPayloadCSV
	if rawPayload == "" && len(row.RawColumns) > 0 {
		rawPayload = strings.Join(row.RawColumns, ",")
	}

	return models.AttendanceEvent{
		CompanyCode:   m.companyCode,
		Provider:      provider,
		Source:        "AGENT_CSV",
		ExternalUser:  externalUser,
		EmployeeNo:    employeeNumber,
		EventType:     eventType,
		EventTime:     eventTime,
		DeviceID:      strings.TrimSpace(row.DeviceID),
		SiteCode:      strings.TrimSpace(row.SiteCode),
		DedupeHash:    hex.EncodeToString(hash[:]),
		RawPayloadCSV: rawPayload,
	}, nil
}
