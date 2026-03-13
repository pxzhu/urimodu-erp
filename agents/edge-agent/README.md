# Edge Agent (Go)

Generic edge agent scaffold for attendance ingestion.

## What it does now

- Polls a local CSV **file or directory** (`samples/attendance` by default)
- Maps external IDs to employee numbers using `identity-map.json`
- Builds generic attendance event payloads (ADT/S1-like adapter style)
- Sends payloads to Connector Gateway (`/ingestion/events`)
- Buffers failed sends to local JSONL file and retries on next poll

## Run locally

```bash
cd agents/edge-agent
go run ./cmd/agent
```

## Environment variables

- `EDGE_AGENT_CSV_PATH` (default: `samples/attendance`)
- `EDGE_AGENT_GATEWAY_URL` (default: `http://localhost:4200/ingestion/events`)
- `EDGE_AGENT_API_KEY` (default: `dev-edge-agent-key`)
- `EDGE_AGENT_POLL_SECONDS` (default: `30`)
- `EDGE_AGENT_IDENTITY_MAP_PATH` (default: `samples/attendance/identity-map.json`)
- `EDGE_AGENT_BUFFER_PATH` (default: `data/failed-events.jsonl`)
- `EDGE_AGENT_COMPANY_CODE` (default: `ACME_KR`)
- `EDGE_AGENT_PROVIDER` (default: `GENERIC`)
