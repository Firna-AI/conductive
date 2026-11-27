import type { ChangesDelta } from './generated/ChangesDelta'

export function readChangesDeltaPaths({
  removes,
  upserts,
}: ChangesDelta): ReadonlySet<string> | null {
  const paths = new Set(removes)
  if (paths.size !== removes.length) return null
  let lastIndex = -1
  for (const { index, file } of upserts) {
    if (index <= lastIndex || paths.has(file.path)) return null
    paths.add(file.path)
    lastIndex = index
  }
  return paths
}
