import type { ReactNode } from 'react'

/**
 * What the Preview of an HTML file shows in place of its text, as the shell
 * gives it to the file page.
 */
export type HtmlPageView =
  /**
   * The app opens the files preview. The page shows the look of the launch
   * page, so the wait looks the same before and after the frame exists.
   */
  | { kind: 'opening' }
  /**
   * The page of the file in its frame, from the files preview. `frame` is
   * null while the shell shows the frame under the file page, where it
   * keeps it loaded while another tab shows. The file page then keeps only
   * its header.
   */
  | { kind: 'page'; frame: ReactNode | null }
  /** The open failed: the message of the server, and Try again. */
  | { kind: 'failed'; message: string }
  /**
   * The runner of the workspace announced no file server: the notice that
   * asks for Restart in the workspace header, with no button of its own.
   */
  | { kind: 'older-software' }

/**
 * The preview of an HTML file, which the shell gives the file page. The
 * file page draws each view, and the shell owns the files preview: its
 * open, its frame, and its link. So the Files code sends no preview
 * request.
 */
export interface HtmlPreview {
  view: HtmlPageView
  /**
   * Open, the link to the page in a new browser tab, or null before the
   * files preview exists.
   */
  open: ReactNode | null
  /**
   * Reload, and Try again after a failure: loads the page again, or opens
   * the files preview again when it has none.
   */
  reload: () => void
  /**
   * Runs while the page shows the Preview of the file, from a layout effect,
   * and its result runs when the page stops showing it: at Source, at
   * another tab, or at a state that takes its place. Keep it stable. The
   * shell opens the files preview and shows a kept frame only while a show
   * runs.
   */
  show: () => () => void
}
