#!/bin/bash
# filepath: ./postgres-backup.sh

set -e

TIMESTAMP=$(date +"%F-%H-%M")
BACKUP_DIR="/backup"

PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER -F c -b -v -f "$BACKUP_DIR/postgres-backup-$TIMESTAMP.dump" $POSTGRES_DB

# Kompresja
tar -czf "$BACKUP_DIR/postgres-backup-$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "postgres-backup-$TIMESTAMP.dump"
rm "$BACKUP_DIR/postgres-backup-$TIMESTAMP.dump"

# Usuwanie backupów starszych niż 7 dni
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +7 -exec rm {} \;