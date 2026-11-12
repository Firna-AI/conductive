import { paths } from '../../paths'

/** The tab that each kind of file opens in the centre column. */
export const previewPaths = {
  code: paths.code,
  markdown: paths.markdown,
  image: paths.image,
  'image-not-drawn': paths.imageNotDrawn,
} as const
