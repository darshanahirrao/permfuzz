#!/usr/bin/env bash
# Deploy one Labs app to Vercel production.
#
# Usage: scripts/deploy.sh <app-directory-name>
# Example: scripts/deploy.sh permfuzz
#
# The token is read from ~/.config/vercel/token and never printed or written
# into the repository.
set -euo pipefail

APP="${1:?usage: deploy.sh <app-name>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN_FILE="$HOME/.config/vercel/token"
SCOPE="darshanahirraos-projects"

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "Missing $TOKEN_FILE. Create a Vercel token and store it there." >&2
  exit 1
fi

TOKEN="$(cat "$TOKEN_FILE")"
APP_DIR="$ROOT/apps/$APP"

if [[ ! -d "$APP_DIR" ]]; then
  echo "No such app: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"
vercel deploy --prod --yes --scope "$SCOPE" --name "$APP" --token "$TOKEN"
