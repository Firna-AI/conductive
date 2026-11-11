import { softwareInstallCommand } from '../software-image/install-command'
import { privilegedFileCommand } from '../terminal/privileged'
import {
  WORKSPACE_TOOLS_COMMAND,
  WORKSPACE_TOOLS_DIRECTORY,
} from '../tools/image'
import { shellQuote } from './commands'
import type { ImageSoftwareArtifact } from './image-software'

const APP_PATHS = [
  '/opt/conductive/software',
  WORKSPACE_TOOLS_DIRECTORY,
  '/opt/conductive/runner-start.sh',
  '/opt/conductive/preview-relay-start.sh',
  '/opt/conductive/git-credential-helper.mjs',
  WORKSPACE_TOOLS_COMMAND,
  '/usr/local/bin/conductive-git-credential',
  '/usr/local/bin/gh',
  '/usr/local/lib/conductive',
  '/etc/gitconfig',
  ...[
    'conductive-runner.service',
    'conductive-preview-relay.service',
    'conductive-preview-relay.socket',
    'conductive-terminal.service',
    'conductive-terminal-sessions.service',
    'ttyd.service',
  ].flatMap((unit) => [
    `/etc/systemd/system/${unit}`,
    `/etc/systemd/system/multi-user.target.wants/${unit}`,
    `/etc/systemd/system/sockets.target.wants/${unit}`,
  ]),
]

/** Preserve runnable app files when any later part of the install fails. */
export function workspaceSoftwareUpdateCommand(
  artifact: ImageSoftwareArtifact,
): string {
  const command = softwareInstallCommand(artifact)
  const delimiter = 'CONDUCTIVE_SOFTWARE_INSTALL'
  if (command.split('\n').includes(delimiter))
    throw new Error('The software install contains its heredoc delimiter.')
  return privilegedFileCommand(`set -eu
umask 077
backup_complete=false
recover() {
  result=$?
  trap - EXIT HUP INT TERM
  if [ "$result" -ne 0 ]; then
    if [ "$backup_complete" = true ]; then
      rm -rf -- "$@" || exit 125
      tar -xPf "$backup/files.tar" || exit 125
      systemctl daemon-reload || exit 125
    fi
    result=1
  fi
  rm -rf -- "$backup" || exit 125
  exit "$result"
}
backup=$(mktemp -d /tmp/conductive-software-backup.XXXXXX)
trap 'recover "$@"' EXIT
trap 'exit 1' HUP INT TERM
set -- ${APP_PATHS.map(shellQuote).join(' ')}
for path do
  if [ -e "$path" ] || [ -L "$path" ]; then
    printf '%s\\0' "$path" >> "$backup/present"
  fi
done
touch "$backup/present"
tar -cPf "$backup/files.tar" --null -T "$backup/present"
backup_complete=true
cat > "$backup/install.sh" <<'${delimiter}'
${command}
${delimiter}
bash "$backup/install.sh" </dev/null
systemctl start conductive-preview-relay.socket
systemctl restart conductive-preview-relay.service`)
}
