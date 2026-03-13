package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"github.com/korean-self-hosted-erp/edge-agent/internal/buffer"
	"github.com/korean-self-hosted-erp/edge-agent/internal/config"
	"github.com/korean-self-hosted-erp/edge-agent/internal/csvwatcher"
	"github.com/korean-self-hosted-erp/edge-agent/internal/mapping"
	"github.com/korean-self-hosted-erp/edge-agent/internal/sender"
)

func main() {
	cfg := config.Load()

	mapper, err := mapping.NewMapper(cfg.IdentityMapPath, cfg.Provider, cfg.CompanyCode)
	if err != nil {
		log.Fatalf("failed to initialize mapper: %v", err)
	}

	store := buffer.NewStore(cfg.BufferPath)
	s := sender.NewHTTPEventSender(cfg.GatewayURL, cfg.APIKey)
	watcher := csvwatcher.NewWatcher(cfg.CSVPath, mapper, s, store)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Printf("edge-agent started. source=%s gateway=%s company=%s provider=%s", cfg.CSVPath, cfg.GatewayURL, cfg.CompanyCode, cfg.Provider)
	ticker := time.NewTicker(cfg.PollInterval)
	defer ticker.Stop()

	if err := watcher.RunOnce(ctx); err != nil {
		log.Printf("initial sync error: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("edge-agent shutting down")
			return
		case <-ticker.C:
			if err := watcher.RunOnce(ctx); err != nil {
				log.Printf("sync error: %v", err)
			}
		}
	}
}
