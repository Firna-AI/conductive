import { ATTACHMENTS_DIRECTORY } from '../../src/shared/attachment-paths'
import { shellQuote } from '../lifecycle/commands'
import { ATTACHMENT_DOWNLOAD_PATH } from './attachment-download'

export function attachmentDownloadCommand(input: {
  directory: string
  relativePath: string
  origin: string
  token: string
  sizeBytes: number
}): string {
  const path = `${input.directory}/${input.relativePath}`
  const parent = path.slice(0, path.lastIndexOf('/'))
  const temporaryPrefix = `${path}.download-`
  const temporary = `${temporaryPrefix}${crypto.randomUUID()}`
  const body = [
    'set -eu',
    'umask 077',
    `/bin/mkdir -p -- ${shellQuote(parent)}`,
    `printf %s '*' > ${shellQuote(`${input.directory}/${ATTACHMENTS_DIRECTORY}/.gitignore`)}`,
    `/bin/rm -f -- ${shellQuote(temporaryPrefix)}*`,
    `temporary=${shellQuote(temporary)}`,
    `trap '/bin/rm -f -- "$temporary"' EXIT`,
    `/usr/bin/curl --disable --proto '=https' --tlsv1.2 --max-redirs 0 --connect-timeout 10 --speed-limit 1024 --speed-time 60 --max-time 3600 --silent --fail --request POST --header ${shellQuote(`Authorization: Bearer ${input.token}`)} --output "$temporary" ${shellQuote(`${input.origin}${ATTACHMENT_DOWNLOAD_PATH}`)}`,
    `test "$(/usr/bin/wc -c < "$temporary")" -eq ${input.sizeBytes}`,
    `/bin/mv -f -- "$temporary" ${shellQuote(path)}`,
  ].join('\n')
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC /bin/sh -c ${shellQuote(body)} > /dev/null 2>&1`
}
