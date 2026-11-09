#!/bin/sh
set -eu
case ${1:-} in
  ''|--version|version|--help|-h|help|completion) exec /usr/bin/gh "$@" ;;
esac
if [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
  GH_TOKEN=$(/usr/local/bin/conductive-git-credential token)
  export GH_TOKEN
fi
exec /usr/bin/gh "$@"
