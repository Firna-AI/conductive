/**
 * The banner of a workspace with the label of the base that GitHub
 * deleted, while it names one. The label hides each secret value, as the
 * labels of the branch and of its base do. `baseMoved` keeps the real name.
 */
export function movedBaseLabel<
  T extends { baseMoved?: string; displayBaseMoved?: string },
>(value: T, text: (value: string) => string): T {
  if (value.baseMoved === undefined) return value
  const displayBaseMoved = text(value.displayBaseMoved || value.baseMoved)
  return displayBaseMoved === value.baseMoved &&
    value.displayBaseMoved === undefined
    ? value
    : { ...value, displayBaseMoved }
}
