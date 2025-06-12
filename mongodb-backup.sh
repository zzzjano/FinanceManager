#!/bin/bash
# filepath: ./mongodb-backup.sh

set -e

TIMESTAMP=$(date +"%F-%H-%M")
BACKUP_DIR="/backup"
DUMP_DIR="$BACKUP_DIR/dump-$TIMESTAMP"

mkdir -p "$DUMP_DIR"
mongodump --host mongodb --port 27017 --out "$DUMP_DIR"

tar -czf "$BACKUP_DIR/mongodb-backup-$TIMESTAMP.tar.gz" -C "$DUMP_DIR" .
rm -rf "$DUMP_DIR"

# Usuwanie backupów starszych niż 7 dni
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +7 -exec rm {} \;