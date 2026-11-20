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
   * The page of the file in its frame, from the files preview. The file
   * page renders `frame` only while it shows this view, so a frame starts
   * only for a file whose page may show. With `kept`, `frame` draws nothing
   * in place: it puts the page into the frames that the shell keeps under
   * the file page, loaded while another tab shows. The file page then keeps
   * only its header.
   */
  | { kind: 'page'; frame: ReactNode; kept: boolean }
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
   * Expand: shows the page in a large window over the whole app, or null
   * when the page has no window, as before the files preview exists and
   * on a phone.
   */
  expand: (() => void) | null
  /**
   * Runs while the page shows the Preview of the file, from a layout effect,
   * and its result runs when the page stops showing it: at Source, at
   * another tab, or at a state that takes its place. Keep it stable. The
   * shell opens the files preview only while a show runs.
   */
  show: () => () => void
}
