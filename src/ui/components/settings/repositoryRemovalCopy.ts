/**
 * The words of Remove in the row menu of a chosen repository, and of the
 * question that it opens. The app and the mockups share them.
 */

/** Where the repository that the question removes stands in the order. */
export type RemovedPlace =
  /** The only chosen repository, so no repository is left. */
  | { kind: 'only' }
  /** The first one, the default. `next` becomes the default. */
  | { kind: 'default'; next: string }
  /** Any other place, which changes no default. */
  | { kind: 'other' }

/**
 * The place of the repository at `place` of the chosen repositories,
 * whose full names `names` gives in the order.
 */
export function removedPlaceOf(
  names: readonly string[],
  place: number,
): RemovedPlace {
  if (names.length <= 1) return { kind: 'only' }
  if (place === 0) return { kind: 'default', next: names[1] }
  return { kind: 'other' }
}

export const repositoryRemoval = {
  /** The item of the row menu, with the label of Remove in Edit. */
  item: 'Remove',
  title: (name: string) => `Remove ${name}?`,
  confirm: 'Remove',
  cancel: 'Cancel',
  /** The toast after a removal that failed. The row stays. */
  failed: "The repository wasn't removed.",
  /** What a screen reader hears after a removal. */
  removed: (name: string) => `${name} is removed`,
} as const

/** What New workspace does after the removal, and the new default. */
function offerText(place: RemovedPlace): string {
  switch (place.kind) {
    case 'only':
      return 'New workspace no longer offers it, and no new workspace can start until you add a repository.'
    case 'default':
      return `New workspace no longer offers it, and ${place.next} becomes the default.`
    case 'other':
      return 'New workspace no longer offers it.'
  }
}

/**
 * What happens to the active automations of the repository: `count` of
 * them, or `null` while the number is not known, which states the rule.
 * No sentence when it has none.
 */
function automationText(count: number | null): string | null {
  if (count === null) {
    return 'Each of its automations turns off, and only its owner can turn it on again.'
  }
  if (count === 0) return null
  if (count === 1) {
    return 'Its automation turns off, and only its owner can turn it on again.'
  }
  return `Its ${count} automations turn off, and only their owners can turn them on again.`
}

/**
 * The text of the question: what adding the repository again does not
 * bring back. `automations` is the number of its active automations, or
 * `null` while it is not known.
 */
export function removalText(
  place: RemovedPlace,
  automations: number | null,
): string {
  const lost = automationText(automations)
  return lost === null ? offerText(place) : `${offerText(place)} ${lost}`
}
