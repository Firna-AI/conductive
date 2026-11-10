#!/bin/sh
set -eu
credential_free() {
  case ${1:-} in
    ''|--version|version|--help|help|completion) return 0 ;;
    -h) [ "$#" -eq 1 ]; return ;;
    extension|extensions|ext)
      [ "${2:-}" != exec ] || return 1
      ;;
  esac
  previous=
  for argument do
    case $argument in
      --) return 1 ;;
      --help)
        case $previous in
          -*=*|[!-]*) return 0 ;;
        esac
        ;;
    esac
    previous=$argument
  done
  return 1
}

if ! credential_free "$@" && [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
  GH_TOKEN=$(/usr/local/bin/conductive-git-credential token)
  export GH_TOKEN
fi
exec /usr/bin/gh "$@"
