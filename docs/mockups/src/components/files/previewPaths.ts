import { paths } from '../../paths'

/** The screen that each kind of file preview opens. */
export const previewPaths = {
  code: paths.code,
  markdown: paths.markdown,
  diff: paths.diff,
} as const
