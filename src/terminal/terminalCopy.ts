import { TERMINAL_LIMIT, type TerminalEntry } from '../shared/terminal'

/** The name of a terminal, as its tab shows it, such as "Terminal 2". */
export function terminalName(terminal: Pick<TerminalEntry, 'number'>): string {
  return `Terminal ${terminal.number}`
}

/** The words of the terminal tabs, as the Terminal protocol gives them. */
export const terminalCopy = {
  /** The label of the + at the end of the row. */
  newTerminal: 'New terminal',
  /** The line under the row at the limit. It is text, so a phone shows it. */
  limit: `A workspace holds up to ${TERMINAL_LIMIT} terminals. Close one to open another.`,
  closeTitle: (name: string) => `Close ${name}?`,
  closeText:
    'Its shell and any running commands end for everyone in this workspace.',
  closeConfirm: 'Close terminal',
  openFailed: "The new terminal didn't open.",
  closeFailed: (name: string) => `${name} didn't close.`,
} as const
