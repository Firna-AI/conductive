import type { FilesClient } from '../api/files-client'
import { fileView, pictureType } from './file-view'

/** The picture bytes of a file read, or a result that keeps the file link. */
export type PictureRead =
  { status: 'picture'; address: string } | { status: 'failed' }

/** One chat's picture reads. Paths are real file paths from its tree. */
export interface ChatPictures {
  read(path: string, signal: AbortSignal): Promise<PictureRead>
}

type PictureClient = Pick<FilesClient, 'readFile'>

interface PendingPicture {
  path: string
  controller: AbortController
  started: boolean
  waiters: Set<(result: PictureRead) => void>
}

const failed: PictureRead = { status: 'failed' }

async function readPicture(
  client: PictureClient,
  pending: PendingPicture,
): Promise<PictureRead> {
  try {
    const result = await client.readFile(
      pending.path,
      pending.controller.signal,
    )
    if (!result.ok || pending.controller.signal.aborted) return failed
    const view = fileView(pending.path, result.value)
    return view.kind === 'picture'
      ? { status: 'picture', address: view.address }
      : failed
  } catch {
    return failed
  }
}

/**
 * Reads at most two files at once, in queue order. Each started path keeps
 * its result, including a failure. Callers share a read but abort their own
 * wait. The last abort cancels the file read and keeps no result, so a later
 * caller reads the path again, such as after a switch of session tabs. The
 * cancelled read keeps its slot until it settles. A queued path with no
 * callers is removed without a result, so it can queue again.
 * The file client enforces the route's read limit. No read starts a sandbox.
 */
export function createPictureReads(client: PictureClient): ChatPictures {
  const results = new Map<string, PictureRead>()
  const pending = new Map<string, PendingPicture>()
  const queue: PendingPicture[] = []
  let running = 0

  function startWaiting(): void {
    while (running < 2 && queue.length > 0) {
      const next = queue.shift()
      if (!next) return
      next.started = true
      running += 1
      void readPicture(client, next).then((result) => {
        if (!next.controller.signal.aborted) results.set(next.path, result)
        if (pending.get(next.path) === next) pending.delete(next.path)
        running -= 1
        next.waiters.forEach((finish) => finish(result))
        startWaiting()
      })
    }
  }

  return {
    read(path, signal) {
      if (signal.aborted) return Promise.resolve(failed)
      const known = results.get(path)
      if (known) return Promise.resolve(known)
      if (!pictureType(path)) {
        results.set(path, failed)
        return Promise.resolve(failed)
      }
      let request = pending.get(path)
      if (!request) {
        request = {
          path,
          controller: new AbortController(),
          started: false,
          waiters: new Set(),
        }
        pending.set(path, request)
        queue.push(request)
      }
      const waiting = request
      return new Promise((resolve) => {
        const finish = (result: PictureRead) => {
          signal.removeEventListener('abort', abort)
          waiting.waiters.delete(finish)
          resolve(result)
        }
        const abort = () => {
          finish(failed)
          if (waiting.waiters.size > 0) return
          if (waiting.started) {
            pending.delete(path)
            waiting.controller.abort()
          } else {
            pending.delete(path)
            queue.splice(queue.indexOf(waiting), 1)
          }
        }
        waiting.waiters.add(finish)
        signal.addEventListener('abort', abort, { once: true })
        startWaiting()
      })
    },
  }
}
