# Buffer Store

The edge-agent persists failed outbound events as JSONL in a local buffer path.

- Failed sends are appended with retry metadata.
- Buffered events are retried before reading new CSV rows.
- Remaining failures stay in the buffer file for the next poll cycle.
