import { shellArgument } from './privileged'

export const TERMINAL_RUNTIME = '/run/conductive-terminal'

export interface TerminalScriptOptions {
  runtimeDirectory: string
  owner: string
  group: string
  entropyCommand: readonly string[]
  terminalCommand: readonly string[]
}

export const terminalScriptDefaults: TerminalScriptOptions = {
  runtimeDirectory: TERMINAL_RUNTIME,
  owner: 'user',
  group: 'user',
  entropyCommand: ['od', '-An', '-v', '-N32', '-tx1', '/dev/urandom'],
  terminalCommand: ['/usr/bin/ttyd'],
}

const validation = `valid_password() {
  [ -f "$password_file" ] && [ -r "$password_file" ] || return 1
  bytes=$(wc -c < "$password_file") || return 1
  [ "$bytes" -eq 64 ] || return 1
  grep -Eq '^[a-f0-9]{64}$' "$password_file"
}`

/** The trusted image builder controls paths and executable arguments. */
export function credentialScript(
  options: TerminalScriptOptions = terminalScriptDefaults,
): string {
  return `#!/bin/sh
set -eu
umask 077
runtime=${shellArgument(options.runtimeDirectory)}
password_file="$runtime/password"
install -d -m 700 -o ${shellArgument(options.owner)} -g ${shellArgument(options.group)} "$runtime"
${validation}
if ! valid_password; then
  raw=$(${options.entropyCommand.map(shellArgument).join(' ')})
  value=$(printf '%s' "$raw" | tr -d ' \\n')
  [ "\${#value}" -eq 64 ] || exit 1
  case "$value" in *[!a-f0-9]*) exit 1 ;; esac
  temporary=$(mktemp "$runtime/password.XXXXXX")
  trap 'rm -f -- "$temporary"' EXIT
  printf '%s' "$value" > "$temporary"
  chown ${shellArgument(`${options.owner}:${options.group}`)} "$temporary"
  chmod 600 "$temporary"
  mv -f -- "$temporary" "$password_file"
  trap - EXIT
fi
chown ${shellArgument(`${options.owner}:${options.group}`)} "$password_file"
chmod 600 "$password_file"
`
}

export function launcherScript(
  options: TerminalScriptOptions = terminalScriptDefaults,
): string {
  return `#!/bin/sh
set -eu
password_file=${shellArgument(`${options.runtimeDirectory}/password`)}
${validation}
valid_password || exit 1
password=$(cat -- "$password_file")
[ -n "$password" ] || exit 1
exec ${options.terminalCommand.map(shellArgument).join(' ')} --interface 0.0.0.0 --port 7681 --writable --credential "conductive:$password" /bin/bash -l
`
}
