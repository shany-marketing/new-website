#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-deploy}"

git add -A
git commit -m "$MSG"
git push origin master
