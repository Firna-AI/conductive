/** The memory folder of the terminal service in the sandbox. */
export const TERMINAL_RUNTIME = '/run/conductive-terminal'

/** The workspace's recorded repository variables, stored in memory. */
export const REPOSITORY_FOLDERS_FILE = '/run/conductive/repository-folders'

/**
 * The Worker writes this file when the sandbox provider reports the end of
 * the disk restore. The terminal and the agent runner both read it.
 */
export const TERMINAL_RESTORE_MARKER = `${TERMINAL_RUNTIME}/restore-ended`
