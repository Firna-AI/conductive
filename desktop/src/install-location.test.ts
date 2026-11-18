import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, it, vi } from 'vitest'

import {
  type InstallLocationDependencies,
  offerApplicationsMove,
} from './install-location.js'
import {
  fileError,
  installLocationHarness,
} from './install-location.test-support.js'

vi.mock('node:fs/promises', async () => {
  const actual =
    await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {
    mkdtemp: vi.fn(),
    readFile: vi.fn(actual.readFile),
    rmdir: vi.fn(),
    writeFile: vi.fn(actual.writeFile),
  }
})

it('offers the native move after EROFS beside the running app bundle', async () => {
  const { dependencies } = installLocationHarness()
  vi.mocked(mkdtemp).mockRejectedValue(fileError('EROFS'))
  dependencies.choose.mockResolvedValue('move')

  await offerApplicationsMove(dependencies)

  expect(mkdtemp).toHaveBeenCalledTimes(1)
  const [[prefix]] = vi.mocked(mkdtemp).mock.calls
  expect(dirname(prefix)).toBe('/Volumes/Disk')
  expect(dependencies.choose).toHaveBeenCalledTimes(1)
  expect(dependencies.move).toHaveBeenCalledTimes(1)
  expect(rmdir).not.toHaveBeenCalled()
  expect(writeFile).not.toHaveBeenCalled()
  expect(dependencies.warn).not.toHaveBeenCalled()
})

it('cleans up a writable location probe without offering a move', async () => {
  const { dependencies, probe } = installLocationHarness()

  await offerApplicationsMove(dependencies)

  expect(mkdtemp).toHaveBeenCalledTimes(1)
  expect(rmdir).toHaveBeenCalledExactlyOnceWith(probe)
  expect(dependencies.choose).not.toHaveBeenCalled()
  expect(dependencies.move).not.toHaveBeenCalled()
  expect(writeFile).not.toHaveBeenCalled()
  expect(dependencies.warn).not.toHaveBeenCalled()
})

it('skips development, unpublished, non-Mac, and Applications copies', async () => {
  const { dependencies } = installLocationHarness()
  vi.mocked(mkdtemp).mockRejectedValue(fileError('EROFS'))
  const modes = [
    { name: 'development', packaged: false },
    { name: 'unpublished', enabled: false },
    { name: 'non-Mac', platform: 'linux' },
    { name: 'Applications', inApplications: () => true },
  ]

  for (const mode of modes) {
    await offerApplicationsMove({ ...dependencies, ...mode })

    expect(readFile, mode.name).not.toHaveBeenCalled()
    expect(mkdtemp, mode.name).not.toHaveBeenCalled()
    expect(dependencies.choose, mode.name).not.toHaveBeenCalled()
    expect(dependencies.move, mode.name).not.toHaveBeenCalled()
  }
})

it('saves Not now across launches and offers again for the next app version', async () => {
  const { dependencies } = installLocationHarness()
  vi.mocked(mkdtemp).mockRejectedValue(fileError('EROFS'))

  await offerApplicationsMove(dependencies)

  expect(dependencies.choose).toHaveBeenCalledTimes(1)
  expect(dependencies.move).not.toHaveBeenCalled()
  expect(writeFile).toHaveBeenCalledTimes(1)
  const [[path, contents]] = vi.mocked(writeFile).mock.calls
  expect(dirname(String(path))).toBe(dependencies.userData)
  expect(contents).toBe('0.25.0')

  const nextLaunch = {
    ...dependencies,
    choose: vi.fn<InstallLocationDependencies['choose']>(async () => 'move'),
    move: vi.fn(() => true),
  }
  await offerApplicationsMove(nextLaunch)
  expect(nextLaunch.choose).not.toHaveBeenCalled()
  expect(nextLaunch.move).not.toHaveBeenCalled()

  await offerApplicationsMove({ ...nextLaunch, version: '0.26.0' })
  expect(nextLaunch.choose).toHaveBeenCalledTimes(1)
  expect(nextLaunch.move).toHaveBeenCalledTimes(1)
})

it('warns for other IO failures without offering an invalid move or rejecting launch', async () => {
  const failures = [
    {
      name: 'dismissal read',
      operation: readFile,
      code: 'EROFS',
      readOnly: false,
      offers: 0,
    },
    {
      name: 'location probe',
      operation: mkdtemp,
      code: 'EACCES',
      readOnly: false,
      offers: 0,
    },
    {
      name: 'probe cleanup',
      operation: rmdir,
      code: 'EROFS',
      readOnly: false,
      offers: 0,
    },
    {
      name: 'dismissal write',
      operation: writeFile,
      code: 'EIO',
      readOnly: true,
      offers: 1,
    },
  ]

  for (const failure of failures) {
    const { dependencies } = installLocationHarness()
    const error = fileError(failure.code)
    if (failure.readOnly)
      vi.mocked(mkdtemp).mockRejectedValue(fileError('EROFS'))
    vi.mocked(failure.operation).mockRejectedValue(error)

    await expect(
      offerApplicationsMove(dependencies),
      failure.name,
    ).resolves.toBeUndefined()

    expect(dependencies.warn, failure.name).toHaveBeenCalledExactlyOnceWith(
      error,
    )
    expect(dependencies.choose, failure.name).toHaveBeenCalledTimes(
      failure.offers,
    )
    expect(dependencies.move, failure.name).not.toHaveBeenCalled()
  }
})

it('warns when the native move fails and keeps launch usable', async () => {
  const { dependencies } = installLocationHarness()
  const error = fileError('EIO')
  vi.mocked(mkdtemp).mockRejectedValue(fileError('EROFS'))
  dependencies.choose.mockResolvedValue('move')
  dependencies.move.mockImplementation(() => {
    throw error
  })

  await expect(offerApplicationsMove(dependencies)).resolves.toBeUndefined()

  expect(dependencies.warn).toHaveBeenCalledExactlyOnceWith(error)
  expect(writeFile).not.toHaveBeenCalled()
})
