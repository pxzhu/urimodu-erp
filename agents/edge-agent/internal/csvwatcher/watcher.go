package csvwatcher

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/korean-self-hosted-erp/edge-agent/internal/mapping"
	"github.com/korean-self-hosted-erp/edge-agent/internal/sender"
)

type Watcher struct {
	path   string
	mapper *mapping.Mapper
	sender sender.EventSender
}

func NewWatcher(path string, mapper *mapping.Mapper, sender sender.EventSender) *Watcher {
	return &Watcher{path: path, mapper: mapper, sender: sender}
}

func (w *Watcher) RunOnce(ctx context.Context) error {
	file, err := os.Open(w.path)
	if err != nil {
		return fmt.Errorf("open csv: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	headerSkipped := false
	sent := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read csv: %w", err)
		}

		if !headerSkipped {
			headerSkipped = true
			continue
		}

		event, err := w.mapper.MapRecord(record)
		if err != nil {
			log.Printf("skip invalid record: %v", err)
			continue
		}

		if err := w.sender.Send(ctx, event); err != nil {
			return fmt.Errorf("send event: %w", err)
		}
		sent++
	}

	log.Printf("csv sync done. events_sent=%d", sent)
	return nil
}
