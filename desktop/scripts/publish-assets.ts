import { productName } from '../../docs/mockups/src/brand.ts'

export function releaseFiles(version: string): string[] {
  const packages = ['arm64', 'x64'].flatMap((architecture) => {
    const base = `${productName}-${version}-mac-${architecture}`
    return [`${base}.dmg`, `${base}.zip`, `${base}.zip.blockmap`]
  })
  return [...packages, 'latest-mac.yml']
}

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

export function verifyUpdateMetadata(metadata: string, version: string): void {
  const declaredVersion = /^version:\s*(.+)$/m.exec(metadata)?.[1]
  if (!declaredVersion || scalar(declaredVersion) !== version)
    throw new Error(`latest-mac.yml must name version ${version}`)
  const files = /^files:\r?\n((?:[ \t].*\r?\n?)+)/m.exec(metadata)?.[1] ?? ''
  const urls = Array.from(files.matchAll(/^ {2}- url:\s*(.+)$/gm), (match) =>
    scalar(match[1]),
  )
  const expected = releaseFiles(version).filter((name) => name.endsWith('.zip'))
  if (
    urls.length !== expected.length ||
    expected.some((name) => !urls.includes(name))
  )
    throw new Error(
      'latest-mac.yml must list both release ZIP files and no other files',
    )
}
