import { chmod, lstat, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

export async function removeImportFixture(root: string): Promise<void> {
  async function writable(path: string): Promise<void> {
    const info = await lstat(path)
    if (!info.isDirectory()) return
    await chmod(path, 0o700)
    for (const entry of await readdir(path)) await writable(join(path, entry))
  }
  await writable(root)
  await rm(root, { recursive: true, force: true })
}
