import { useEffect, useState } from 'react'
import type { PictureSize } from '../../ui/components/files/ImageView'
import { decodePicture } from '../../files/page/decode-picture'
import type { ChatPictures, PictureRead } from '../../files/page/picture-reads'

/**
 * What the read of a picture gave: its address with the size that the
 * browser drew, or a failure. A failed read, a file over the read limit,
 * and bytes that the browser cannot draw all fail.
 */
export type PictureOutcome =
  { kind: 'drawn'; address: string; size: PictureSize } | { kind: 'failed' }

/** An outcome, with the path and the message that it belongs to. */
interface Kept {
  path: string
  message: string
  outcome: PictureOutcome
}

const failed: PictureRead = { status: 'failed' }

/**
 * The outcome of the picture at `path` in the agent message `message`, or
 * null while it is not known. The read starts once `start` is true, with
 * the reader of the chat, and the browser then decodes the bytes to learn
 * their size. The reader keeps the result of each path for each message,
 * so a newer answer reads a reused file name again. An unmount, or a change
 * of the reader, the path, or the message, aborts the read and stops the
 * decode, so no older outcome shows.
 */
export function usePictureRead(
  reader: ChatPictures | undefined,
  path: string,
  message: string,
  start: boolean,
): PictureOutcome | null {
  const [kept, setKept] = useState<Kept | null>(null)
  useEffect(() => {
    if (!reader || !start) return
    const controller = new AbortController()
    let stopDecode: (() => void) | undefined
    const keep = (outcome: PictureOutcome) =>
      setKept({ path, message, outcome })
    const settle = (read: PictureRead) => {
      if (controller.signal.aborted) return
      if (read.status === 'failed') {
        keep({ kind: 'failed' })
        return
      }
      const { address } = read
      stopDecode = decodePicture(address, (decoded) =>
        keep(
          decoded.status === 'drawn'
            ? { kind: 'drawn', address, size: decoded.size }
            : { kind: 'failed' },
        ),
      )
    }
    reader
      .read(path, controller.signal, message)
      .then(settle, () => settle(failed))
    return () => {
      controller.abort()
      stopDecode?.()
    }
  }, [reader, path, message, start])
  return kept?.path === path && kept.message === message ? kept.outcome : null
}
