# Edge Agent (Go)

Generic edge agent scaffold for attendance ingestion.

## What it does now

- Polls a CSV file from `samples/attendance/attendance-events.csv`
- Maps rows to a generic attendance event payload
- Sends payloads to Connector Gateway (`/ingestion/events`)

## Run locally

```bash
cd agents/edge-agent
go run ./cmd/agent
```

## Environment variables

- `EDGE_AGENT_CSV_PATH` (default: `samples/attendance/attendance-events.csv`)
- `EDGE_AGENT_GATEWAY_URL` (default: `http://localhost:4200/ingestion/events`)
- `EDGE_AGENT_API_KEY` (default: `dev-edge-agent-key`)
- `EDGE_AGENT_POLL_SECONDS` (default: `30`)
