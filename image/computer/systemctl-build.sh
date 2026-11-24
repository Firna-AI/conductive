#!/bin/sh

skip_value=false
for argument do
  if "$skip_value"; then
    skip_value=false
    continue
  fi
  case "$argument" in
    -H|-M|-t|-p|-P|-s|-n|-o|--host|--machine|--type|--state|--property|\
    --job-mode|--check-inhibitors|--kill-who|--kill-whom|--kill-value|--signal|\
    --what|--legend|--preset-mode|--root|--image|--image-policy|--lines|--output|\
    --boot-loader-menu|--boot-loader-entry|--timestamp|--drop-in|--when)
      skip_value=true ;;
    -*) ;;
    daemon-reload|daemon-reexec|start|restart|try-restart|reload|stop|kill|reset-failed)
      exit 0 ;;
    *) break ;;
  esac
done
exec /usr/bin/systemctl "$@"
