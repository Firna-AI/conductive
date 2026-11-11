export function shortCommit(sha: string): string {
  if (!/^[a-f0-9]{7,64}$/i.test(sha))
    throw new Error('Commit SHA must be hexadecimal text.')
  return sha.slice(0, 7)
}
