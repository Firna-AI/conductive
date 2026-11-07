import { shellQuote } from '../commands'
import type { RepositoryLocation } from '../repository-locations'

/** Stage every old folder before assigning any new name. Mark each move for retries. */
export function sourceLayoutCommand(
  buildId: string,
  locations: readonly RepositoryLocation[],
  previous: readonly RepositoryLocation[],
): string {
  const root = `/home/user/conductive/source-relocation/${encodeURIComponent(buildId)}`
  const changed = previous.filter(
    (location) =>
      locations.find((entry) => entry.repositoryId === location.repositoryId)
        ?.directory !== location.directory,
  )
  return [
    `mkdir -p /home/user/code ${shellQuote(root)}`,
    ...changed.map((location, index) => {
      const marker = shellQuote(`${root}/${index}.staged`)
      const staged = shellQuote(`${root}/${index}.repository`)
      const source = shellQuote(location.directory)
      return `if [ ! -f ${marker} ]; then\n  if [ -e ${source} ] && [ ! -e ${staged} ]; then mv -- ${source} ${staged}; fi\n  touch ${marker}\nfi`
    }),
    ...changed.map((location, index) => {
      const destination = locations.find(
        (entry) => entry.repositoryId === location.repositoryId,
      )
      const staged = shellQuote(`${root}/${index}.repository`)
      if (!destination) return `rm -rf -- ${staged}`
      const target = shellQuote(destination.directory)
      return `if [ -e ${staged} ]; then\n  test ! -e ${target}\n  mkdir -p ${shellQuote(destination.directory.slice(0, destination.directory.lastIndexOf('/')))}\n  mv -- ${staged} ${target}\nfi`
    }),
  ].join('\n')
}
