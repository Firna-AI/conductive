import { TERMINAL_PORT } from '../../src/shared/terminal'
import { shellArgument } from './privileged'

export const TERMINAL_RUNTIME = '/run/conductive-terminal'
export const TERMINAL_RESTORE_MARKER = `${TERMINAL_RUNTIME}/restore-ended`
/**
 * The provider's file API reads only under /home/user or /tmp. The start hook
 * binds the memory folder here, so the password stays out of the disk.
 */
export const TERMINAL_RUNTIME_VIEW = '/home/user/.conductive-terminal'

export interface TerminalScriptOptions {
  runtimeDirectory: string
  restoreMarker: string
  environmentFile: string
  owner: string
  group: string
  entropyCommand: readonly string[]
  terminalCommand: readonly string[]
  multiplexerCommand: readonly string[]
}

/**
 * Bash shows only the current folder name in the prompt.
 * Bash checks once, at the first prompt after the restore marker exists.
 * If the real folder differs from `$PWD`, it moves there and keeps `OLDPWD`.
 * The check flag stays local to this shell, so new shells check for themselves.
 */
export function terminalPromptCommand(
  restoreMarker = TERMINAL_RESTORE_MARKER,
): string {
  return `PS1=\${PS1//\\\\w/\\\\W}
builtin test -n "\${__conductive_restore_checked-}" || ! builtin test -f ${shellArgument(restoreMarker)} || { __conductive_restore_checked=1; [ -z "\${PWD-}" ] || builtin test . -ef "$PWD" || { __conductive_oldpwd=\${OLDPWD-}; builtin cd -- "$PWD" 2>/dev/null && OLDPWD=$__conductive_oldpwd; unset __conductive_oldpwd; }; }`
}

const terminalScriptDefaults: TerminalScriptOptions = {
  runtimeDirectory: TERMINAL_RUNTIME,
  restoreMarker: TERMINAL_RESTORE_MARKER,
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
exec ${options.terminalCommand.map(shellArgument).join(' ')} --interface 0.0.0.0 --port ${TERMINAL_PORT} --writable --credential "conductive:$password" ${options.multiplexerCommand.map(shellArgument).join(' ')} -N -S ${shellArgument(`${options.runtimeDirectory}/tmux.sock`)} new-session -A -s workspace -c "$CONDUCTIVE_REPOSITORY_DIR" /bin/bash -l
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
exec ${options.multiplexerCommand.map(shellArgument).join(' ')} -S ${shellArgument(`${options.runtimeDirectory}/tmux.sock`)} -f /dev/null start-server ';' set-option -s exit-empty off ';' set-option -g mouse on ';' set-environment -g PROMPT_COMMAND ${shellArgument(terminalPromptCommand(options.restoreMarker))}
`
}
