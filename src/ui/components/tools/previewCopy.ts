/**
 * The words of the port form of the Preview tool, and the labels of the
 * servers that the runner detects. This module imports no fixture, so the
 * app can use it too. Each server is a `ListeningPort` of the runner's
 * report: its port, its program name, and its folder, each name and folder
 * null when the report has none.
 */

/** The most characters that a tab shows of a name, "…" included. */

import type { ListeningPort } from '../../../shared/generated/ListeningPort'
const tabNameLength = 10

/** A name as a tab shows it: at most 10 characters, or 9 and "…". */
function tabName(name: string): string {
  const characters = Array.from(name)
  if (characters.length <= tabNameLength) return name
  return `${characters.slice(0, tabNameLength - 1).join('')}…`
}

/**
 * The label of the tab of an open preview: the port and the cut name, such
 * as `6006 storybook…`. A port that the latest list does not name keeps
 * the label `Port 3000`.
 */
export function previewTabLabel(port: number, server?: ListeningPort): string {
  return server?.name ? `${port} ${tabName(server.name)}` : `Port ${port}`
}

/**
 * The tooltip and the spoken name of a server's tab or row: the port, the
 * full name, and the folder, such as `Port 6006, storybook dev in
 * packages/ui`.
 */
export function serverDescription(server: ListeningPort): string {
  const name = server.name === null ? '' : `, ${server.name}`
  const folder = server.folder === null ? '' : ` in ${server.folder}`
  return `Port ${server.port}${name}${folder}`
}

/** The words of the port form. */
export const portFormCopy = {
  title: 'Preview a port',
  /** Above the list of servers, and under the title without a report. */
  body: 'Open a web server that runs in this sandbox.',
  /** Under the title when the runner reports no server. */
  noServers:
    'Servers that run in this sandbox show here. Start one in the terminal, or ask the agent.',
  listLabel: 'Servers in this sandbox',
  otherPort: 'Other port',
  open: 'Open preview',
} as const

/**
 * The words of the page that shows while a preview opens, in a frame or in
 * a browser tab. The server sends this page, so it reads the same words.
 */
export const previewOpeningCopy = {
  opening: 'Opening preview',
  failedTitle: 'Preview not available',
  failedBody: 'Open it again from the workspace.',
} as const

/**
 * The words of a preview that the app could not open, in a Preview tab and
 * in the tab of an HTML file. The message of the server shows under the
 * title.
 */
export const previewOpenFailedCopy = {
  title: "The preview couldn't open",
  retry: 'Try again',
} as const

/**
 * The words of Expand, which shows the page of a Preview tab or of an HTML
 * file in a large window over the whole app, and of the window itself.
 */
export const expandedPreviewCopy = {
  expand: 'Expand',
  close: 'Close',
} as const
