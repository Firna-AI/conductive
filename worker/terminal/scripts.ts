import { shellArgument } from './privileged'

export const TERMINAL_RUNTIME = '/run/conductive-terminal'
/**
 * The provider's file API reads only under /home/user or /tmp. The start hook
 * binds the memory folder here, so the password stays out of the disk.
 */
export const TERMINAL_RUNTIME_VIEW = '/home/user/.conductive-terminal'

export interface TerminalScriptOptions {
  runtimeDirectory: string
  environmentFile: string
  owner: string
  group: string
  entropyCommand: readonly string[]
  terminalCommand: readonly string[]
  multiplexerCommand: readonly string[]
}

export const terminalScriptDefaults: TerminalScriptOptions = {
  runtimeDirectory: TERMINAL_RUNTIME,
  environmentFile: '/run/ascii-secrets/env.sh',
  owner: 'user',
  group: 'user',
  entropyCommand: ['od', '-An', '-v', '-N32', '-tx1', '/dev/urandom'],
  terminalCommand: ['/usr/bin/ttyd'],
  multiplexerCommand: ['/usr/bin/tmux'],
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

/**
 * tmux gets the repository path, not the launcher's current folder. After a
 * start from a saved snapshot, the provider restores the disk in the
 * background. When the restore ends, the launcher's current folder can be an
 * old view of the disk at another path.
 */
export function launcherScript(
  options: TerminalScriptOptions = terminalScriptDefaults,
): string {
  return `#!/bin/sh
set -eu
set -a
. ${shellArgument(options.environmentFile)}
set +a
cd "$CONDUCTIVE_REPOSITORY_DIR"
password_file=${shellArgument(`${options.runtimeDirectory}/password`)}
${validation}
valid_password || exit 1
password=$(cat -- "$password_file")
[ -n "$password" ] || exit 1
exec ${options.terminalCommand.map(shellArgument).join(' ')} --interface 0.0.0.0 --port 7681 --writable --credential "conductive:$password" ${options.multiplexerCommand.map(shellArgument).join(' ')} -N -S ${shellArgument(`${options.runtimeDirectory}/tmux.sock`)} new-session -A -s workspace -c "$CONDUCTIVE_REPOSITORY_DIR" /bin/bash -l
`
}

export function sessionServerScript(
  options: TerminalScriptOptions = terminalScriptDefaults,
): string {
  return `#!/bin/sh
set -eu
set -a
. ${shellArgument(options.environmentFile)}
set +a
cd "$CONDUCTIVE_REPOSITORY_DIR"
exec ${options.multiplexerCommand.map(shellArgument).join(' ')} -S ${shellArgument(`${options.runtimeDirectory}/tmux.sock`)} -f /dev/null start-server ';' set-option -s exit-empty off
`
}
