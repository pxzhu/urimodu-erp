package csvwatcher

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/korean-self-hosted-erp/edge-agent/internal/buffer"
	"github.com/korean-self-hosted-erp/edge-agent/internal/mapping"
	"github.com/korean-self-hosted-erp/edge-agent/internal/sender"
)

type Watcher struct {
	path      string
	mapper    *mapping.Mapper
	sender    sender.EventSender
	buffer    *buffer.Store
	processed map[string]time.Time
}

func NewWatcher(path string, mapper *mapping.Mapper, sender sender.EventSender, store *buffer.Store) *Watcher {
	return &Watcher{
		path:      path,
		mapper:    mapper,
		sender:    sender,
		buffer:    store,
		processed: map[string]time.Time{},
	}
}

func (w *Watcher) collectCSVFiles() ([]string, error) {
	info, err := os.Stat(w.path)
	if err != nil {
		return nil, fmt.Errorf("stat csv path: %w", err)
	}

	files := []string{}
	if !info.IsDir() {
		files = append(files, w.path)
		return files, nil
	}

	entries, err := os.ReadDir(w.path)
	if err != nil {
		return nil, fmt.Errorf("read csv directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		if strings.HasSuffix(strings.ToLower(entry.Name()), ".csv") {
			files = append(files, filepath.Join(w.path, entry.Name()))
		}
	}

	sort.Strings(files)
	return files, nil
}

func normalizeHeader(header []string) map[string]int {
	mapping := map[string]int{}
	for index, cell := range header {
		normalized := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(cell), "_", ""))
		mapping[normalized] = index
	}
	return mapping
}

func detectHeader(cells []string) bool {
	normalized := normalizeHeader(cells)
	_, hasExternal := normalized["externaluserid"]
	_, hasEventType := normalized["eventtype"]
	_, hasEventTimestamp := normalized["eventtimestamp"]
	return hasExternal && hasEventType && hasEventTimestamp
}

func fromIndexed(cells []string, index int) string {
	if index < 0 || index >= len(cells) {
		return ""
	}
	return strings.TrimSpace(cells[index])
}

func buildRowWithHeader(header []string, cells []string) mapping.SourceRow {
	indexed := normalizeHeader(header)
	providerIdx, providerOk := indexed["provider"]
	if !providerOk {
		providerIdx = -1
	}

	return mapping.SourceRow{
		Provider:      fromIndexed(cells, providerIdx),
		ExternalUser:  fromIndexed(cells, indexed["externaluserid"]),
		EmployeeNo:    fromIndexed(cells, indexed["employeenumber"]),
		EventType:     fromIndexed(cells, indexed["eventtype"]),
		EventTime:     fromIndexed(cells, indexed["eventtimestamp"]),
		DeviceID:      fromIndexed(cells, indexed["deviceid"]),
		SiteCode:      fromIndexed(cells, indexed["sitecode"]),
		RawColumns:    cells,
		RawPayloadCSV: strings.Join(cells, ","),
	}
}

func buildRowWithoutHeader(cells []string) mapping.SourceRow {
	if len(cells) >= 7 {
		return mapping.SourceRow{
			Provider:      fromIndexed(cells, 0),
			ExternalUser:  fromIndexed(cells, 1),
			EmployeeNo:    fromIndexed(cells, 2),
			EventType:     fromIndexed(cells, 3),
			EventTime:     fromIndexed(cells, 4),
			DeviceID:      fromIndexed(cells, 5),
			SiteCode:      fromIndexed(cells, 6),
			RawColumns:    cells,
			RawPayloadCSV: strings.Join(cells, ","),
		}
	}

	if len(cells) >= 6 {
		return mapping.SourceRow{
			Provider:      fromIndexed(cells, 0),
			ExternalUser:  fromIndexed(cells, 1),
			EmployeeNo:    "",
			EventType:     fromIndexed(cells, 2),
			EventTime:     fromIndexed(cells, 3),
			DeviceID:      fromIndexed(cells, 4),
			SiteCode:      fromIndexed(cells, 5),
			RawColumns:    cells,
			RawPayloadCSV: strings.Join(cells, ","),
		}
	}

	return mapping.SourceRow{
		Provider:      fromIndexed(cells, 0),
		ExternalUser:  fromIndexed(cells, 1),
		EmployeeNo:    "",
		EventType:     fromIndexed(cells, 2),
		EventTime:     fromIndexed(cells, 3),
		DeviceID:      fromIndexed(cells, 4),
		SiteCode:      "",
		RawColumns:    cells,
		RawPayloadCSV: strings.Join(cells, ","),
	}
}

func (w *Watcher) parseCSVFile(path string) ([]mapping.SourceRow, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open csv: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1

	rows := []mapping.SourceRow{}
	line := 0
	var header []string
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read csv: %w", err)
		}

		line++
		if len(record) == 0 {
			continue
		}

		trimmed := make([]string, len(record))
		for index, cell := range record {
			trimmed[index] = strings.TrimSpace(cell)
		}

		if line == 1 && detectHeader(trimmed) {
			header = trimmed
			continue
		}

		if header != nil {
			rows = append(rows, buildRowWithHeader(header, trimmed))
			continue
		}

		rows = append(rows, buildRowWithoutHeader(trimmed))
	}

	return rows, nil
}

func (w *Watcher) retryBuffered(ctx context.Context) error {
	entries, err := w.buffer.Load()
	if err != nil {
		return err
	}

	if len(entries) == 0 {
		return nil
	}

	remaining := []buffer.BufferedEvent{}
	for _, entry := range entries {
		if err := w.sender.Send(ctx, entry.Event); err != nil {
			entry.RetryCount += 1
			entry.LastError = err.Error()
			entry.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			remaining = append(remaining, entry)
			continue
		}
	}

	if err := w.buffer.Replace(remaining); err != nil {
		return err
	}

	if len(remaining) > 0 {
		log.Printf("buffer retry complete. remaining=%d", len(remaining))
	} else {
		log.Printf("buffer retry complete. remaining=0")
	}

	return nil
}

func (w *Watcher) shouldProcess(path string, modTime time.Time) bool {
	lastProcessed, ok := w.processed[path]
	if !ok {
		return true
	}

	return modTime.After(lastProcessed)
}

func (w *Watcher) RunOnce(ctx context.Context) error {
	if err := w.retryBuffered(ctx); err != nil {
		return fmt.Errorf("retry buffered: %w", err)
	}

	files, err := w.collectCSVFiles()
	if err != nil {
		return err
	}

	totalSent := 0
	buffered := 0

	for _, filePath := range files {
		stat, err := os.Stat(filePath)
		if err != nil {
			log.Printf("skip file stat error: %s (%v)", filePath, err)
			continue
		}

		if !w.shouldProcess(filePath, stat.ModTime()) {
			continue
		}

		sourceRows, err := w.parseCSVFile(filePath)
		if err != nil {
			log.Printf("skip file parse error: %s (%v)", filePath, err)
			continue
		}

		sentForFile := 0
		bufferedForFile := 0
		for _, sourceRow := range sourceRows {
			event, err := w.mapper.MapRecord(sourceRow)
			if err != nil {
				log.Printf("skip invalid record in %s: %v", filePath, err)
				continue
			}

			if err := w.sender.Send(ctx, event); err != nil {
				bufferedForFile++
				if appendErr := w.buffer.Append(event, err.Error()); appendErr != nil {
					log.Printf("buffer append error: %v", appendErr)
				}
				continue
			}

			sentForFile++
		}

		w.processed[filePath] = stat.ModTime()
		totalSent += sentForFile
		buffered += bufferedForFile

		log.Printf("csv sync file done. path=%s sent=%d buffered=%d", filePath, sentForFile, bufferedForFile)
	}

	log.Printf("csv sync done. events_sent=%d buffered=%d", totalSent, buffered)
	return nil
}
