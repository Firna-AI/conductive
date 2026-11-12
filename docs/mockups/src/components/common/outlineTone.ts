import type { ButtonStateStyleArgs } from '@firna/ui/button'

/**
 * The fill of an outline button: none at rest, so the tint of a bar shows
 * through, and a light wash of the ink on hover and press, so the tint still
 * shows. Firna has no outline tone, so the button takes the secondary tone
 * for its border and label, and this fill replaces the secondary fill.
 */
function outlineFill(state: ButtonStateStyleArgs) {
  if (state.disabled || state.busy) return 'transparent'
  if (state.pressed) return 'color-mix(in srgb, var(--ui-ink) 12%, transparent)'
  if (state.hovered) return 'color-mix(in srgb, var(--ui-ink) 7%, transparent)'
  return 'transparent'
}

/**
 * The box of a compact action button, `height` high. An outline button
 * also takes the fill of `outlineFill`.
 */
export function actionStyle(height: number, outline: boolean) {
  const box = { height, paddingHorizontal: 10 }
  if (!outline) return box
  return (state: ButtonStateStyleArgs) => ({
    ...box,
    backgroundColor: outlineFill(state),
  })
}
