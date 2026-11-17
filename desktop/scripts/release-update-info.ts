// The `files` list of `latest-mac.yml`: each indented line after `files:`.
const filesPattern = /^files:\r?\n((?:[ \t].*(?:\r?\n|$))+)/m

type Architecture = 'arm64' | 'x64'

function filesBlock(metadata: string, architecture: Architecture): string {
  const block = filesPattern.exec(metadata)?.[1] ?? ''
  const urls = Array.from(
    block.matchAll(/^ {2}- url:\s*(.+)$/gm),
    (match) => match[1],
  )
  // electron-updater, like the publish step, tells the architectures apart
  // by the `arm64` token in each name.
  if (
    urls.length !== 1 ||
    urls[0].includes('arm64') !== (architecture === 'arm64')
  )
    throw new Error(
      `The ${architecture} latest-mac.yml must list one ${architecture} ZIP file`,
    )
  return block.endsWith('\n') ? block : `${block}\n`
}

function declaredVersion(metadata: string): string | undefined {
  return /^version:\s*(.+)$/m.exec(metadata)?.[1]?.trim()
}

/**
 * Joins the `latest-mac.yml` files of the two signing jobs. Each job
 * packages one architecture, so electron-builder lists only its own ZIP
 * file. The result keeps the x64 file as the main entry: first in `files`,
 * and in `path` and `sha512`. One electron-builder run for both
 * architectures writes the same order. The x64 file also keeps its
 * `releaseDate`.
 */
export function mergeUpdateInfo(x64: string, arm64: string): string {
  const x64Files = filesBlock(x64, 'x64')
  const arm64Files = filesBlock(arm64, 'arm64')
  const version = declaredVersion(x64)
  if (!version || version !== declaredVersion(arm64))
    throw new Error('The two latest-mac.yml files must name the same version')
  return x64.replace(filesPattern, () => `files:\n${x64Files}${arm64Files}`)
}
