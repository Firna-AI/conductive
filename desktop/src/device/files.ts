import { randomUUID } from 'node:crypto'
import {
  chmodSync,
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  fsyncSync,
} from 'node:fs'
import { resolve } from 'node:path'

export interface DeviceFiles {
  read(name: string): string | undefined
  write(name: string, value: string): void
}

/** This directory holds local rules, never a cookie or another credential. */
export function privateDeviceFiles(directory: string): DeviceFiles {
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const info = lstatSync(directory)
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error('The local device directory is unavailable')
  chmodSync(directory, 0o700)
  const path = (name: string) => {
    if (!/^[a-z0-9.-]+$/.test(name))
      throw new Error('Invalid local device file')
    return resolve(directory, name)
  }
  return {
    read(name) {
      let descriptor: number
      try {
        descriptor = openSync(
          path(name),
          constants.O_RDONLY | constants.O_NOFOLLOW,
        )
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return undefined
        throw error
      }
      try {
        if (!fstatSync(descriptor).isFile())
          throw new Error('Invalid local device file')
        return readFileSync(descriptor, 'utf8')
      } finally {
        closeSync(descriptor)
      }
    },
    write(name, value) {
      const temporary = path(`${name}.${randomUUID()}.tmp`)
      const descriptor = openSync(temporary, 'wx', 0o600)
      try {
        writeFileSync(descriptor, value, 'utf8')
        fsyncSync(descriptor)
      } catch (error) {
        unlinkSync(temporary)
        throw error
      } finally {
        closeSync(descriptor)
      }
      try {
        renameSync(temporary, path(name))
      } catch (error) {
        unlinkSync(temporary)
        throw error
      }
    },
  }
}

export function stableDeviceId(
  files: DeviceFiles,
  random: () => string = randomUUID,
): string {
  const existing = files.read('device-id')
  if (existing && /^[a-zA-Z0-9_-]{16,128}$/.test(existing)) return existing
  const id = random()
  files.write('device-id', id)
  return id
}
