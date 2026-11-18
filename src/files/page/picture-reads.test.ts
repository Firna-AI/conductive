import { expect, it, vi } from 'vitest'
import type { FileResponse } from '../../shared/generated/FileResponse'
import type { FilesResult } from '../api/files-errors'
import { createPictureReads } from './picture-reads'
import {
  controlledPictures,
  pictureReply,
  readSignal,
} from './picture-reads.test-support'

it('runs at most two reads and starts waiting paths in order', async () => {
  const { reader, paths, answer } = controlledPictures()
  const first = reader.read('first.png', readSignal())
  const second = reader.read('second.png', readSignal())
  const third = reader.read('third.png', readSignal())
  const fourth = reader.read('fourth.png', readSignal())
  expect(paths()).toEqual(['first.png', 'second.png'])

  answer(1)
  await second
  expect(paths()).toEqual(['first.png', 'second.png', 'third.png'])
  answer(2)
  await third
  expect(paths()).toEqual([
    'first.png',
    'second.png',
    'third.png',
    'fourth.png',
  ])
  answer(0)
  answer(3)
  expect(await Promise.all([first, second, third, fourth])).toEqual(
    Array.from({ length: 4 }, () => ({
      status: 'picture',
      address: 'data:image/png;base64,AA==',
    })),
  )
})

it('shares an in-flight read and keeps one result for each path', async () => {
  const { reader, readFile, answer } = controlledPictures()
  const first = reader.read('one.png', readSignal())
  const shared = reader.read('one.png', readSignal())
  expect(readFile).toHaveBeenCalledTimes(1)
  answer(0)
  const expected = { status: 'picture', address: 'data:image/png;base64,AA==' }
  expect(await first).toEqual(expected)
  expect(await shared).toEqual(expected)
  expect(await reader.read('one.png', readSignal())).toEqual(expected)
  expect(readFile).toHaveBeenCalledTimes(1)

  const other = reader.read('two.jpg', readSignal())
  answer(1)
  expect(await other).toEqual({
    status: 'picture',
    address: 'data:image/jpeg;base64,AA==',
  })
  expect(readFile).toHaveBeenCalledTimes(2)
})

const failures: { name: string; result: FilesResult<FileResponse> }[] = [
  {
    name: 'a failed file read',
    result: {
      ok: false,
      error: { kind: 'failed', status: 503, code: 'file_unavailable' },
    },
  },
  {
    name: 'a file over the read limit',
    result: {
      ok: false,
      error: { kind: 'too-large', sizeBytes: 5_242_881, limitBytes: 5_242_880 },
    },
  },
  {
    name: 'an empty picture file',
    result: {
      ok: true,
      value: {
        path: 'empty.png',
        mediaType: 'image/png',
        sizeBytes: 0,
        encoding: 'base64',
        content: '',
      },
    },
  },
]

it.each(failures)('keeps a failure for $name', async ({ result }) => {
  const readFile = vi.fn().mockResolvedValue(result)
  const reader = createPictureReads({ readFile })
  expect(await reader.read('shot.png', readSignal())).toEqual({
    status: 'failed',
  })
  expect(await reader.read('shot.png', readSignal())).toEqual({
    status: 'failed',
  })
  expect(readFile).toHaveBeenCalledTimes(1)
})

it('maps a thrown read error to a kept failure and releases the queue', async () => {
  const readFile = vi
    .fn()
    .mockImplementationOnce(() => {
      throw new Error('Read failed')
    })
    .mockRejectedValueOnce(new TypeError('Connection lost'))
    .mockResolvedValue(pictureReply('third.png'))
  const reader = createPictureReads({ readFile })
  const reads = ['first.png', 'second.png', 'third.png'].map((path) =>
    reader.read(path, readSignal()),
  )
  expect(await Promise.all(reads)).toEqual([
    { status: 'failed' },
    { status: 'failed' },
    { status: 'picture', address: 'data:image/png;base64,AA==' },
  ])
  expect(await reader.read('second.png', readSignal())).toEqual({
    status: 'failed',
  })
  expect(readFile).toHaveBeenCalledTimes(3)
})

it('fails a non-picture path without reading the file', async () => {
  const { reader, readFile } = controlledPictures()
  expect(await reader.read('diagram.svg', readSignal())).toEqual({
    status: 'failed',
  })
  expect(readFile).toHaveBeenCalledTimes(0)
})
