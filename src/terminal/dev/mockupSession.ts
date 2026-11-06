import {
  workspaceSession,
  type TerminalTone,
} from '../../../docs/mockups/src/fixtures/terminal'

/** The ANSI colour of each tone of the mockup terminal. */
const toneCodes: Readonly<Record<TerminalTone, string>> = {
  prompt: '\x1b[1;36m',
  plain: '',
  muted: '\x1b[90m',
  success: '\x1b[32m',
  accent: '\x1b[1;33m',
  error: '\x1b[31m',
}

/**
 * The dev server log of the mockup as terminal output, after a clear of the
 * screen. The development page draws it to compare the terminal with the
 * mockup. The app never shows it.
 */
export const mockupSessionOutput = `\x1b[H\x1b[2J${workspaceSession
  .map((line) =>
    line
      .map((segment) => {
        const code = toneCodes[segment.tone]
        return code ? `${code}${segment.text}\x1b[0m` : segment.text
      })
      .join(''),
  )
  .join('\r\n')}\r\n`
