import { vi } from 'vitest'
import type { FileResponse } from '../../shared/generated/FileResponse'
import type { FilesResult } from '../api/files-errors'
import { deferred } from '../files-test-kit'
import { createPictureReads } from './picture-reads'

export function pictureReply(path: string): FilesResult<FileResponse> {
  return {
    ok: true,
    value: {
      path,
      encoding: 'base64',
      mediaType: 'application/octet-stream',
      sizeBytes: 1,
      content: 'AA==',
    },
  }
}

export function controlledPictures() {
  const requests: {
    path: string
    signal: AbortSignal | undefined
    reply: ReturnType<typeof deferred<FilesResult<FileResponse>>>
  }[] = []
  const readFile = vi.fn((path: string, signal?: AbortSignal) => {
    const reply = deferred<FilesResult<FileResponse>>()
    requests.push({ path, signal, reply })
    return reply.promise
  })
  return {
    reader: createPictureReads({ readFile }),
    readFile,
    requests,
    paths: () => requests.map(({ path }) => path),
    answer: (index: number) => {
      const request = requests[index]
      request?.reply.resolve(pictureReply(request.path))
    },
  }
}

export function readSignal(): AbortSignal {
  return new AbortController().signal
}
