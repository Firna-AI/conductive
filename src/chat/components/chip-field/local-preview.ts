import { useEffect, useState } from 'react'
import type { PictureSize } from '../../../../docs/mockups/src/components/files/ImageView'
import { decodePicture } from '../../../files/page/decode-picture'

/**
 * The most bytes of a text file that the preview dialog shows. A larger
 * text file shows that it is too large, so the tab never decodes and draws
 * a large file.
 */
export const PREVIEW_TEXT_LIMIT = 1024 * 1024

/**
 * The most bytes of an image file that a preview draws. The picture loads
 * from a `data:` address, which holds all its bytes, because the content
 * security policy of the apps lets an image load from `data:`, but not
 * from `blob:`.
 */
const PREVIEW_PICTURE_LIMIT = 20 * 1024 * 1024

/** The bytes at the start of a file that tell text from other bytes. */
const SNIFF_BYTES = 8 * 1024

/** The lines of a text file that the card of the pointer shows. */
const PEEK_LINES = 6

/** The characters of one line that the card of the pointer keeps. */
const PEEK_LINE_LENGTH = 120

/**
 * What the browser can show of a file of the draft, from its own copy of
 * the file: a picture with its size, text, a text file over the limit, or
 * nothing. It is `loading` until the read ends.
 */
export type LocalPreview =
  | { kind: 'loading' }
  | { kind: 'picture'; address: string; size: PictureSize }
  | { kind: 'text'; text: string }
  | { kind: 'too-large' }
  | { kind: 'none' }

const loading: LocalPreview = { kind: 'loading' }

/**
 * The text of bytes that are UTF-8 without a NUL character, as git decides
 * for a text file, or null. `partial` says that more bytes follow, so a
 * character that the end of the bytes cuts in two still counts as text.
 */
export function textOf(bytes: Uint8Array, partial: boolean): string | null {
  if (bytes.includes(0)) return null
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(bytes, { stream: partial })
  } catch {
    return null
  }
}

async function bytesOf(file: Blob, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, end).arrayBuffer())
}

/**
 * The text preview of a file: its whole text up to the limit, or only its
 * first lines for the card of the pointer.
 */
export async function readTextPreview(
  file: Blob,
  mode: 'dialog' | 'peek',
): Promise<LocalPreview> {
  const sniff = await bytesOf(file, SNIFF_BYTES)
  const head = textOf(sniff, sniff.length < file.size)
  if (head === null) return { kind: 'none' }
  if (mode === 'peek') return { kind: 'text', text: peekLines(head) }
  if (file.size > PREVIEW_TEXT_LIMIT) return { kind: 'too-large' }
  const whole =
    sniff.length < file.size
      ? textOf(await bytesOf(file, file.size), false)
      : head
  return whole === null ? { kind: 'none' } : { kind: 'text', text: whole }
}

/** The first lines of a text for the card, each cut to a short length. */
export function peekLines(text: string): string {
  return text
    .split(/\r\n|\n|\r/)
    .slice(0, PEEK_LINES)
    .map((line) => line.slice(0, PEEK_LINE_LENGTH))
    .join('\n')
    .trimEnd()
}

/**
 * The `data:` address of the picture of an image file and its size, a
 * file over the picture limit, or nothing when the browser cannot draw its
 * bytes. `done` runs once, unless the returned function stops the read
 * first.
 */
function readPicture(
  file: Blob,
  done: (preview: LocalPreview) => void,
): () => void {
  if (file.size > PREVIEW_PICTURE_LIMIT) {
    done({ kind: 'too-large' })
    return () => undefined
  }
  const reader = new FileReader()
  let live = true
  let stopDecode: () => void = () => undefined
  reader.onload = () => {
    const address = reader.result
    if (!live) return
    if (typeof address !== 'string') {
      done({ kind: 'none' })
      return
    }
    stopDecode = decodePicture(address, (decoded) => {
      done(
        decoded.status === 'drawn'
          ? { kind: 'picture', address, size: decoded.size }
          : { kind: 'none' },
      )
    })
  }
  reader.onerror = () => {
    if (live) done({ kind: 'none' })
  }
  reader.readAsDataURL(file)
  return () => {
    live = false
    if (reader.readyState === FileReader.LOADING) reader.abort()
    stopDecode()
  }
}

/** The outcome of a read, with the file and the mode that it read. */
interface Outcome {
  file: Blob
  mode: 'dialog' | 'peek'
  preview: LocalPreview
}

/**
 * The preview of a file of the draft, which the browser reads from its own
 * copy of the file. An image file shows its picture, other files their
 * text. A read whose file or mode changed never shows.
 */
export function useLocalPreview(
  file: Blob,
  image: boolean,
  mode: 'dialog' | 'peek',
): LocalPreview {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  useEffect(() => {
    const show = (preview: LocalPreview) => setOutcome({ file, mode, preview })
    if (image) return readPicture(file, show)
    let live = true
    readTextPreview(file, mode).then(
      (preview) => live && show(preview),
      () => live && show({ kind: 'none' }),
    )
    return () => {
      live = false
    }
  }, [file, image, mode])
  if (outcome?.file !== file || outcome.mode !== mode) return loading
  return outcome.preview
}
