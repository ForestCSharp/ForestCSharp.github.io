#!/usr/bin/env sh

set -eu

HOST="${HOST:-127.0.0.1}"
START_PORT="${PORT:-8000}"

cd "$(dirname "$0")"

PORT="$(python3 - "$HOST" "$START_PORT" <<'PY'
import errno
import socket
import sys

host = sys.argv[1]
start_port = int(sys.argv[2])

for port in range(start_port, start_port + 100):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError as exc:
            if exc.errno == errno.EADDRINUSE:
                continue
            raise

        print(port)
        break
else:
    raise SystemExit(f"No available port found from {start_port} to {start_port + 99}")
PY
)"

if [ "$PORT" != "$START_PORT" ]; then
	echo "Port ${START_PORT} is in use; using ${PORT} instead."
fi

URL="http://${HOST}:${PORT}/"

echo "Serving site at ${URL}"

if command -v open >/dev/null 2>&1; then
	open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
	xdg-open "$URL" >/dev/null 2>&1 &
elif command -v start >/dev/null 2>&1; then
	start "$URL"
else
	echo "Open ${URL} in your browser."
fi

python3 -m http.server "$PORT" --bind "$HOST"
