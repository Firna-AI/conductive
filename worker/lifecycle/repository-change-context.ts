import { BASE_CHANGE_GIT as GIT } from './base-change-commands'
import { shellQuote } from './commands'

/** Copy context files between real directories and keep each existing destination file. */
export function contextCopy(from: string, to: string, failure: number): string {
  const source = shellQuote(`${from}/.context`)
  const target = shellQuote(`${to}/.context`)
  return `if [ -d ${source} ] && [ ! -L ${source} ]; then
  if [ ! -e ${target} ] && [ ! -L ${target} ]; then mkdir -- ${target} || exit ${failure}; fi
  if [ ! -d ${target} ] || [ -L ${target} ]; then exit ${failure}; fi
  /usr/bin/cp -R --no-dereference --preserve=mode,timestamps --update=none -- ${shellQuote(`${from}/.context/.`)} ${shellQuote(`${to}/.context/`)} || exit ${failure}
fi`
}

/** Add the rule for the top-level context folder to the local exclude file. */
export function excludeContext(): string {
  return `conductive_exclude=$(${GIT} rev-parse --git-path info/exclude)
mkdir -p -- "$(dirname -- "$conductive_exclude")"
touch -- "$conductive_exclude"
if ! grep -qxF '/.context/' "$conductive_exclude"; then
  if [ -s "$conductive_exclude" ] && [ -n "$(tail -c 1 -- "$conductive_exclude")" ]; then printf '\\n' >> "$conductive_exclude"; fi
  printf '%s\\n' '/.context/' >> "$conductive_exclude"
fi`
}
