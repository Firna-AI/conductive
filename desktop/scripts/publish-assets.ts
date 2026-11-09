function scalar(value: string): string {
  const text = value.trim()
  if (text.startsWith('"')) {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed === 'string') return parsed
  }
  if (text.startsWith("'") && text.endsWith("'"))
    return text.slice(1, -1).replaceAll("''", "'")
  return text
}

function listedZipFiles(metadata: string, version: string): string[] {
  const declaredVersion = /^version:\s*(.+)$/m.exec(metadata)?.[1]
  if (!declaredVersion || scalar(declaredVersion) !== version)
    throw new Error(`latest-mac.yml must name version ${version}`)
  const files = /^files:\r?\n((?:[ \t].*\r?\n?)+)/m.exec(metadata)?.[1] ?? ''
  return Array.from(files.matchAll(/^ {2}- url:\s*(.+)$/gm), (match) =>
    scalar(match[1]),
  )
}

/**
 * Selects the files of one release from what packaging produced. The names
 * come from `latest-mac.yml` and the signed files, so this module holds no
 * copy of the package naming rule. electron-updater, like this selection,
 * tells the architectures apart by the `arm64` token in each name.
 */
export function selectReleaseFiles(
  metadata: string,
  version: string,
  localNames: readonly string[],
): string[] {
  const zips = listedZipFiles(metadata, version)
  const arm64 = zips.filter((name) => name.includes('arm64'))
  const x64 = zips.filter((name) => !name.includes('arm64'))
  if (
    zips.length !== 2 ||
    arm64.length !== 1 ||
    x64.length !== 1 ||
    zips.some((name) => !name.endsWith('.zip'))
  )
    throw new Error(
      'latest-mac.yml must list one arm64 ZIP file and one x64 ZIP file',
    )
  const present = new Set(localNames)
  const requireFile = (name: string) => {
    if (!present.has(name)) throw new Error(`Missing release file: ${name}`)
    return name
  }
  const selected: string[] = []
  for (const [architecture, zip] of [
    ['arm64', arm64[0]],
    ['x64', x64[0]],
  ] as const) {
    const images = localNames
      .filter(
        (name) =>
          name.endsWith('.dmg') &&
          name.includes('arm64') === (architecture === 'arm64'),
      )
      .toSorted()
    if (images.length === 0)
      throw new Error(`Missing the ${architecture} DMG file`)
    selected.push(...images, requireFile(zip), requireFile(`${zip}.blockmap`))
  }
  return [...selected, requireFile('latest-mac.yml')]
}
