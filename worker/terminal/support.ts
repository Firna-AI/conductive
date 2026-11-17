import { privilegedCommand, shellArgument } from './privileged'
import {
  TERMINAL_ATTACH_PROGRAM,
  TERMINAL_ATTACH_NAME,
  TERMINAL_EXECUTABLE,
  TERMINAL_RUNTIME,
  TERMINAL_SUPPORT_FILE,
} from './scripts'

const marker = shellArgument(`${TERMINAL_RUNTIME}/${TERMINAL_SUPPORT_FILE}`)

/** Type=exec can report the launcher before it execs ttyd. Read each new PID. */
export function terminalSupportProbe(): string {
  return `several=0
probe_ok=1
if [ -x ${shellArgument(TERMINAL_ATTACH_PROGRAM)} ]; then
  probe_ok=0
  attempts=0
  while [ "$attempts" -lt 50 ]; do
    pid=$(systemctl show --property=MainPID --value conductive-terminal.service) || pid=
    case "$pid" in
      ''|*[!0-9]*) ;;
      *)
        executable=$(readlink "/proc/$pid/exe" 2>/dev/null) || executable=
        if [ "$executable" = ${shellArgument(TERMINAL_EXECUTABLE)} ]; then
          url_arg_status=0
          attach_status=0
          grep -zFxq -- --url-arg "/proc/$pid/cmdline" 2>/dev/null || url_arg_status=$?
          grep -zFxq -- ${shellArgument(TERMINAL_ATTACH_NAME)} "/proc/$pid/cmdline" 2>/dev/null || attach_status=$?
          if [ "$url_arg_status" -le 1 ] && [ "$attach_status" -le 1 ]; then
            probe_ok=1
            if [ "$url_arg_status" -eq 0 ] && [ "$attach_status" -eq 0 ]; then
              several=1
            fi
          fi
          break
        fi
        ;;
    esac
    attempts=$((attempts + 1))
    [ "$attempts" -ge 50 ] || sleep 0.1
  done
fi
if [ "$probe_ok" -eq 1 ]; then
  printf '%s\\n' "$several" > ${marker}
  chmod 644 ${marker}
fi`
}

/** Restart ttyd alone. The sessions unit keeps every shell and its password. */
export function terminalRestartCommand(): string {
  const probe = `${terminalSupportProbe()}\n[ "$probe_ok" -eq 1 ]`
  return privilegedCommand(`set -eu
if rm -f -- ${marker} &&
  systemctl restart conductive-terminal.service &&
  systemctl is-active --quiet conductive-terminal.service &&
  /bin/sh -ec ${shellArgument(probe)}; then
  :
else
  echo 'conductive: the terminal service did not restart or its support check failed' >&2
fi`)
}
