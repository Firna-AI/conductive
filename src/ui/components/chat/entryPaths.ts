/** An entry of the file tree, by its path inside the repository. */
type PathEntry = { path: string }

/** The last part of a path: the name of the file or the folder. */
export function entryName(entry: PathEntry): string {
  return entry.path.slice(entry.path.lastIndexOf('/') + 1)
}

/** The folder that holds an entry, with a final `/`, or '' at the root. */
export function entryFolder(entry: PathEntry): string {
  const end = entry.path.lastIndexOf('/')
  return end < 0 ? '' : entry.path.slice(0, end + 1)
}
