import type { PictureSize } from '../../../docs/mockups/src/components/files/ImageView'

/** The outcome of one decode: the size of the picture, or a failure. */
export type DecodedPicture =
  { status: 'drawn'; size: PictureSize } | { status: 'failed' }

/**
 * Loads the picture of one address in the browser, apart from the page,
 * to learn its size before the page draws it. `done` runs once: with the
 * size, or with a failure when the browser cannot draw the bytes or finds
 * no size in them. The returned function stops the wait, and then `done`
 * never runs, so the outcome of an older address never shows.
 */
export function decodePicture(
  address: string,
  done: (decoded: DecodedPicture) => void,
): () => void {
  const image = new Image()
  const stop = () => {
    image.onload = null
    image.onerror = null
  }
  image.onload = () => {
    stop()
    const { naturalWidth: width, naturalHeight: height } = image
    done(
      width > 0 && height > 0
        ? { status: 'drawn', size: { width, height } }
        : { status: 'failed' },
    )
  }
  image.onerror = () => {
    stop()
    done({ status: 'failed' })
  }
  image.src = address
  return stop
}
