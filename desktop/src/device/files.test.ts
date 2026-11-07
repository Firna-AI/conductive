import * as fs from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, expect, it, vi } from 'vitest'

import { memoryFiles } from '../../tests/device-support.js'
import { privateDeviceFiles, stableDeviceId } from './files.js'

vi.mock('node:fs', async (original) => {
  const actual = await original<typeof fs>()
  return {
    ...actual,
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
    lstatSync: vi.fn(),
    openSync: vi.fn(),
    fstatSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    fsyncSync: vi.fn(),
    closeSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  }
})

function fileInfo(directory = false, symlink = false): fs.Stats {
  return {
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 0,
    blksize: 0,
    blocks: 0,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: new Date(0),
    mtime: new Date(0),
    ctime: new Date(0),
    birthtime: new Date(0),
    isFile: () => !directory,
    isDirectory: () => directory,
    isSymbolicLink: () => symlink,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fs.lstatSync).mockReturnValue(fileInfo(true))
  vi.mocked(fs.fstatSync).mockReturnValue(fileInfo())
  vi.mocked(fs.openSync).mockReturnValue(12)
})

it('keeps one stable local device ID across launches and replaces a malformed file', () => {
  const { files } = memoryFiles()
  const random = vi.fn(() => 'first-stable-device-id')
  expect(stableDeviceId(files, random)).toBe('first-stable-device-id')
  expect(stableDeviceId(files, random)).toBe('first-stable-device-id')
  expect(random).toHaveBeenCalledOnce()
  files.write('device-id', '../untrusted path')
  expect(stableDeviceId(files, () => 'second-stable-device-id')).toBe(
    'second-stable-device-id',
  )
})

it('writes private files through fsync and atomic rename and reads without following symlinks', () => {
  const files = privateDeviceFiles('/profile/device')
  expect(fs.mkdirSync).toHaveBeenCalledWith('/profile/device', {
    recursive: true,
    mode: 0o700,
  })
  expect(fs.chmodSync).toHaveBeenCalledWith('/profile/device', 0o700)
  files.write('device-id', 'local-device')
  const temporary = vi.mocked(fs.openSync).mock.calls[0][0]
  expect(fs.openSync).toHaveBeenCalledWith(temporary, 'wx', 0o600)
  expect(fs.writeFileSync).toHaveBeenCalledWith(12, 'local-device', 'utf8')
  expect(fs.fsyncSync).toHaveBeenCalledWith(12)
  expect(fs.closeSync).toHaveBeenCalledWith(12)
  expect(fs.renameSync).toHaveBeenCalledWith(
    temporary,
    resolve('/profile/device/device-id'),
  )
  expect(vi.mocked(fs.fsyncSync).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(fs.renameSync).mock.invocationCallOrder[0],
  )
  vi.mocked(fs.readFileSync).mockReturnValue('local-device')
  expect(files.read('device-id')).toBe('local-device')
  expect(fs.openSync).toHaveBeenLastCalledWith(
    resolve('/profile/device/device-id'),
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  )
})

it('retains the old snapshot when writing fails and refuses a symlink directory', () => {
  const files = privateDeviceFiles('/profile/device')
  vi.mocked(fs.writeFileSync).mockImplementation(() => {
    throw new Error('disk full')
  })
  expect(() => files.write('device-id', 'new-device')).toThrow('disk full')
  expect(fs.renameSync).not.toHaveBeenCalled()
  expect(fs.unlinkSync).toHaveBeenCalledOnce()
  expect(fs.closeSync).toHaveBeenCalledWith(12)
  vi.mocked(fs.lstatSync).mockReturnValue(fileInfo(true, true))
  expect(() => privateDeviceFiles('/profile/device')).toThrow(
    'The local device directory is unavailable',
  )
})
