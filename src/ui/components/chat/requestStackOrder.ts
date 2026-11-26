/**
 * What the order of the stack of requests above the composer reads of an
 * open request. The app and the mockups each give their own reader, so
 * both follow one rule.
 */
export interface StackReader<T> {
  /**
   * The set of secrets of a request for secrets, as one key from
   * `secretSetKey`, or null for a command on a Mac, which never hides
   * another request, because each Allow runs one exact command.
   */
  secrets: (request: T) => string | null
  /** The tool call of the request waits for its answer. A late one has none. */
  callWaits: (request: T) => boolean
  /** This view can answer the request. */
  answers: (request: T) => boolean
}

/**
 * One card of the stack: an open request, and the older open requests of
 * the same session for the same set of secrets that it hides. Only the
 * newest of them shows, and one answer of the card settles each of them.
 */
export interface StackEntry<T> {
  item: T
  /** The requests that the card hides, in the order that they joined it. */
  hidden: readonly T[]
}

/**
 * The names of the secrets of a request as one key for the whole set. The
 * order of the names does not count.
 */
export function secretSetKey(names: readonly string[]): string {
  return JSON.stringify([...names].sort())
}

/**
 * The cards of the stack, in their order. `requests` holds the open
 * requests of one session, the oldest first. The requests whose tool calls
 * wait come first, then the late requests, each group oldest first: a
 * waiting call has a time limit, and a late request has none. A newer
 * request for the same set of secrets joins the card of an older one and
 * shows in its place, so the card keeps the place of the oldest request
 * that it holds, and a new ask of the agent does not move a card that
 * already waits. A card whose newest request has a call that waits goes
 * with the requests whose calls wait. Last, the cards that this view
 * cannot answer go after the cards that it can answer, and each part keeps
 * its order. So the card on top is one that the member can answer,
 * whenever such a card exists.
 */
export function stackEntries<T>(
  requests: readonly T[],
  read: StackReader<T>,
): StackEntry<T>[] {
  const ordered = [
    ...requests.filter((request) => read.callWaits(request)),
    ...requests.filter((request) => !read.callWaits(request)),
  ]
  const entries: StackEntry<T>[] = []
  for (const request of ordered) {
    const set = read.secrets(request)
    const at =
      set === null
        ? -1
        : entries.findIndex((entry) => read.secrets(entry.item) === set)
    if (at === -1) {
      entries.push({ item: request, hidden: [] })
      continue
    }
    const { item: shown, hidden } = entries[at]
    entries[at] =
      requests.indexOf(request) > requests.indexOf(shown)
        ? { item: request, hidden: [...hidden, shown] }
        : { item: shown, hidden: [...hidden, request] }
  }
  return [
    ...entries.filter((entry) => read.answers(entry.item)),
    ...entries.filter((entry) => !read.answers(entry.item)),
  ]
}
