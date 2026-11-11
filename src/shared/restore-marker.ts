/** The memory folder of the terminal service in the sandbox. */
export const TERMINAL_RUNTIME = '/run/conductive-terminal'

/**
 * The Worker writes this file when the sandbox provider reports the end of
 * the disk restore. The terminal and the agent runner both read it.
 */
export const TERMINAL_RESTORE_MARKER = `${TERMINAL_RUNTIME}/restore-ended`
