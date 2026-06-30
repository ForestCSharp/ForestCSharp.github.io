#!/usr/bin/env sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
RESUME_FILE="${SCRIPT_DIR}/resume/forest-sharp-resume.html"

if [ ! -f "$RESUME_FILE" ]; then
    echo "Resume file not found: $RESUME_FILE" >&2
    exit 1
fi

if command -v open >/dev/null 2>&1; then
    open "$RESUME_FILE"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$RESUME_FILE" >/dev/null 2>&1 &
elif command -v start >/dev/null 2>&1; then
    start "$RESUME_FILE"
else
    echo "Open this file in your browser:"
    echo "$RESUME_FILE"
fi
