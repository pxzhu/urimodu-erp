package models

type AttendanceEvent struct {
	CompanyCode   string `json:"companyCode"`
	Provider      string `json:"provider"`
	Source        string `json:"source"`
	ExternalUser  string `json:"externalUserId"`
	EmployeeNo    string `json:"employeeNumber"`
	EventType     string `json:"eventType"`
	EventTime     string `json:"eventTimestamp"`
	DeviceID      string `json:"deviceId,omitempty"`
	SiteCode      string `json:"siteCode,omitempty"`
	DedupeHash    string `json:"dedupeHash"`
	RawPayloadCSV string `json:"rawPayloadCsv"`
}
