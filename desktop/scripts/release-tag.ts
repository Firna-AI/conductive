export async function verifyReleaseTag(
  release: { tag: string; commit: string },
  run: (program: string, args: string[]) => Promise<{ stdout: string }>,
): Promise<void> {
  const reference = `refs/tags/${release.tag}`
  let stdout: string
  try {
    const result = await run('git', [
      'ls-remote',
      '--exit-code',
      'origin',
      reference,
      `${reference}^{}`,
    ])
    stdout = result.stdout
  } catch (cause) {
    throw new Error(`Could not read ${reference}`, { cause })
  }
  const targets = new Map<string, string>()
  for (const line of stdout.split('\n')) {
    const [sha, name] = line.trim().split(/\s+/)
    if (name === reference || name === `${reference}^{}`) targets.set(name, sha)
  }
  const commit = targets.get(`${reference}^{}`) ?? targets.get(reference)
  if (!commit) throw new Error(`Could not read ${reference}`)
  if (commit !== release.commit)
    throw new Error(
      `${reference} points to ${commit}, expected release commit ${release.commit}`,
    )
}
