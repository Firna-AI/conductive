import type { WorkspaceState } from './workspaceState'

type ComposerKey = WorkspaceState['composer']

/** The states that draw the pointer over the icon of the first chip. */
const iconPointerStates: ReadonlySet<ComposerKey> = new Set([
  'file-chip-pointer',
  'skill-chip-pointer',
  'workspace-link-pointer',
  'attachment-pointer',
])

/**
 * Where a composer state draws the pointer over the first chip of the
 * text, as a view cannot hover: over its icon, where a × takes the place
 * of the icon, or over the name of the skill chip, which a press opens in
 * the skill tab. A new session draws no pointer. Only the state with the
 * pointer over the name gives `namePointer`, so the composer of each other
 * state keeps the props that it had.
 */
export function chipPointerOf(
  composer: ComposerKey,
  fresh: boolean,
): { pointer: boolean; namePointer?: true } {
  if (fresh) return { pointer: false }
  if (composer === 'skill-chip-name') {
    return { pointer: false, namePointer: true }
  }
  return { pointer: iconPointerStates.has(composer) }
}
