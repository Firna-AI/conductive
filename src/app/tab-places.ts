import { useEffect } from 'react'

/**
 * The places of the tabs of one workspace, such as the reader's place in a
 * session tab or the scroll offset of a file tab, by tab and by view. They
 * live in memory, as long as their owner, so a reload forgets them.
 *
 * A tab that leaves the open tabs forgets its places, so it starts afresh
 * when it opens again. `follow` compares each list of the open tabs with the
 * last list that it knew. Only a tab that this list had and the new list
 * lacks forgets its places. So a tab that shows before the list names it,
 * such as a file that an address opens while the view loads, keeps the
 * place that the reader made meanwhile. An unknown list changes nothing.
 */
export class TabPlaces<Place> {
  private readonly places = new Map<string, Map<string, Place>>()
  /** The open tabs of the last known list, or null before the first. */
  private listed: ReadonlySet<string> | null = null

  get(tab: string, view = ''): Place | undefined {
    return this.places.get(tab)?.get(view)
  }

  set(tab: string, place: Place, view = ''): void {
    const views = this.places.get(tab) ?? new Map<string, Place>()
    views.set(view, place)
    this.places.set(tab, views)
  }

  /** Takes a list of the open tabs, or null while it is not known. */
  follow(open: readonly string[] | null): void {
    if (open === null) return
    const next = new Set(open)
    for (const tab of this.listed ?? []) {
      if (!next.has(tab)) this.places.delete(tab)
    }
    this.listed = next
  }
}

/**
 * Gives `places` each list of the open tabs, after the render that shows
 * it. `open` is null while the tabs are not known, such as while they load.
 */
export function useFollowTabs<Place>(
  places: TabPlaces<Place> | null,
  open: readonly string[] | null,
): void {
  const key = open === null ? null : JSON.stringify(open)
  useEffect(() => {
    if (places && key !== null) places.follow(JSON.parse(key) as string[])
  }, [places, key])
}
