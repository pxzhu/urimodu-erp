# Backup and Restore Notes

This project stores core state in PostgreSQL and object payloads in MinIO.

## 1) PostgreSQL Backup

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup/erp-$(date +%Y%m%d-%H%M%S).dump
```

## 2) PostgreSQL Restore

```bash
createdb erp_restore
pg_restore --clean --if-exists --no-owner --dbname=postgresql://postgres:postgres@localhost:5432/erp_restore backup/erp-YYYYMMDD-HHMMSS.dump
```

## 3) MinIO Object Backup

Using `mc` (MinIO client):

```bash
mc alias set local http://localhost:9000 minio minio123
mc mirror --overwrite local/erp-files backup/minio-erp-files
```

## 4) MinIO Object Restore

```bash
mc alias set local http://localhost:9000 minio minio123
mc mirror --overwrite backup/minio-erp-files local/erp-files
```

## 5) Backup Scope Checklist

- PostgreSQL database dump
- MinIO object bucket mirror
- `.env` and deployment manifests (without secrets in git)
- App image tags / release metadata

## 6) Restore Validation

After restore:

1. Run API and open `/health`
2. Open `/swagger` and verify schema loads
3. Run seed only if required for missing bootstrap data
4. Verify document PDF download and file attachment paths
