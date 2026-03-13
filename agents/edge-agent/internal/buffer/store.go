package buffer

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/korean-self-hosted-erp/edge-agent/internal/models"
)

type BufferedEvent struct {
	Event      models.AttendanceEvent `json:"event"`
	LastError  string                 `json:"lastError"`
	RetryCount int                    `json:"retryCount"`
	UpdatedAt  string                 `json:"updatedAt"`
}

type Store struct {
	path string
}

func NewStore(path string) *Store {
	return &Store{path: path}
}

func (s *Store) ensureDir() error {
	dir := filepath.Dir(s.path)
	if dir == "" || dir == "." {
		return nil
	}

	return os.MkdirAll(dir, 0o755)
}

func (s *Store) Append(event models.AttendanceEvent, lastErr string) error {
	if err := s.ensureDir(); err != nil {
		return err
	}

	file, err := os.OpenFile(s.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open buffer file: %w", err)
	}
	defer file.Close()

	entry := BufferedEvent{
		Event:      event,
		LastError:  lastErr,
		RetryCount: 1,
		UpdatedAt:  time.Now().UTC().Format(time.RFC3339),
	}

	encoded, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal buffer entry: %w", err)
	}

	if _, err := file.Write(append(encoded, '\n')); err != nil {
		return fmt.Errorf("write buffer entry: %w", err)
	}

	return nil
}

func (s *Store) Load() ([]BufferedEvent, error) {
	file, err := os.Open(s.path)
	if os.IsNotExist(err) {
		return []BufferedEvent{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("open buffer file: %w", err)
	}
	defer file.Close()

	entries := []BufferedEvent{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var entry BufferedEvent
		if err := json.Unmarshal(line, &entry); err != nil {
			continue
		}
		entries = append(entries, entry)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan buffer file: %w", err)
	}

	return entries, nil
}

func (s *Store) Replace(entries []BufferedEvent) error {
	if err := s.ensureDir(); err != nil {
		return err
	}

	file, err := os.OpenFile(s.path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open buffer file: %w", err)
	}
	defer file.Close()

	for _, entry := range entries {
		encoded, err := json.Marshal(entry)
		if err != nil {
			continue
		}

		if _, err := file.Write(append(encoded, '\n')); err != nil {
			return fmt.Errorf("write buffer file: %w", err)
		}
	}

	return nil
}
