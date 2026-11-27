import { REPOSITORY_FOLDERS_FILE } from '../../src/shared/restore-marker'
import { shellQuote } from './commands'
import type { RepositoryLocation } from './repository-locations'

/** Replace the running computer's folder record with the saved locations. */
export function writeRepositoryFolderRecord(
  locations: readonly RepositoryLocation[],
): string {
  const rows = locations
    .map(({ variable, directory }) => `${variable}=${directory}\n`)
    .join('')
  const record = shellQuote(REPOSITORY_FOLDERS_FILE)
  const template = shellQuote(`${REPOSITORY_FOLDERS_FILE}.XXXXXX`)
  return `( set -eu
umask 077
temporary=$(mktemp ${template}) || exit 1
trap 'rm -f -- "$temporary"' EXIT
printf '%s' ${shellQuote(rows)} > "$temporary" || exit 1
mv -fT -- "$temporary" ${record} || exit 1
trap - EXIT
)`
}
