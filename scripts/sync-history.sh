#!/usr/bin/env bash
# Keeps the Development History tab current: regenerates lib/history.ts from
# scripts/milestones.json + the gekko memory files, and — if it changed — commits
# and pushes just that file. quantstrategic is git-connected to Vercel, so the push
# auto-deploys app.gordongekko.uk. Run from cron (see crontab: daily after memory sync).
#
# NOTE: this only DEPLOYS what the manifest already describes. Authoring a NEW
# milestone (a new week's title + items) is still a manual edit to milestones.json —
# this script picks it up automatically on the next run.
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/bin:/bin:$PATH"   # cron has a minimal PATH; node/npm live in homebrew
REPO="/Users/gordongekko/quantstrategic"
cd "$REPO"

ts() { date "+%Y-%m-%d %H:%M:%S"; }

# Regenerate the timeline from the manifest + memory files.
npm run --silent gen:history

# Nothing to do if the generated file is unchanged.
if git diff --quiet -- lib/history.ts; then
  echo "$(ts) sync-history: lib/history.ts already current — no push"
  exit 0
fi

# Deploy: commit ONLY the generated file (never sweep in unrelated working changes), then push.
git add lib/history.ts
git commit -m "history: auto-sync Development History timeline

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" >/dev/null
git push origin main >/dev/null 2>&1

echo "$(ts) sync-history: pushed updated lib/history.ts → Vercel will redeploy"
