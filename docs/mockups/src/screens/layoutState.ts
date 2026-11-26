/**
 * The parts of the workspace state that choose the layout of the desktop
 * columns. `workspaceState.ts` adds them to the state of the screen.
 */
export const layoutStateProperties = {
  /**
   * The user drags the handle of the right column to widen it, or the
   * handle between the file lists and the tools to raise the split.
   */
  resize: { enum: ['none', 'right', 'split'] },
  /**
   * The right column of the desktop: shown, or hidden with the toggle at
   * the end of the header. A phone has no right column.
   */
  rightColumn: { enum: ['shown', 'hidden'] },
  /**
   * The sidebar of the desktop: shown, hidden with its toggle, or hidden
   * with the workspace list open as a popover of the tile of the org.
   */
  sidebar: { enum: ['shown', 'hidden', 'popover'] },
} as const

export const layoutStateKeys = ['resize', 'rightColumn', 'sidebar'] as const

/** No drag, and the right column and the sidebar shown. */
export const layoutStateDefaults = {
  resize: 'none',
  rightColumn: 'shown',
  sidebar: 'shown',
} as const

/** The right column in the middle of a drag that widens it, in px. */
const widenedRight = 560

/** The share of the file lists in the middle of a drag that raises the split. */
const raisedSplit = 35

type Resize = (typeof layoutStateProperties.resize.enum)[number]

/**
 * The sizes of the desktop columns in the middle of the drag of `resize`:
 * the share of the file lists, and the width of the right column.
 */
export function resizedColumns(resize: Resize): {
  filesShare: number | undefined
  rightWidth: number | undefined
} {
  return {
    filesShare: resize === 'split' ? raisedSplit : undefined,
    rightWidth: resize === 'right' ? widenedRight : undefined,
  }
}
