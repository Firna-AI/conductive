import { mkdtemp, realpath } from 'node:fs/promises'
import { join } from 'node:path'

export async function importTemporaryDirectory(parent: string, prefix: string) {
  return realpath(await mkdtemp(join(parent, prefix)))
}
