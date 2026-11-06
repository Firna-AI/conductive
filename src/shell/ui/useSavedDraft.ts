import { useState } from 'react'

interface DraftState<T> {
  /** The saved value that the draft last followed. */
  saved: T
  draft: T
  /** The draft that went out for a save, until the saved value changes. */
  sent: { value: T } | null
}

export interface SavedDraft<T> {
  /** The value that the field shows and the user edits. */
  draft: T
  change: (draft: T) => void
  /**
   * Saves the draft with `write`. A failed save keeps the draft, and it
   * rejects as `write` does.
   */
  save: (write: (draft: T) => Promise<void>) => Promise<void>
}

/**
 * The draft of a saved value in an editor that stays mounted through its
 * saves, so that Save and the field keep the focus. When the saved value
 * changes, from a save or from elsewhere, a draft that the user did not
 * change takes the new value, and an edited draft stays. A draft that
 * still equals the one that went out for a save takes the value of the
 * answer, which can differ from it, as a trimmed name does.
 */
export function useSavedDraft<T>(
  saved: T,
  same: (a: T, b: T) => boolean = Object.is,
): SavedDraft<T> {
  const [state, setState] = useState<DraftState<T>>(() => ({
    saved,
    draft: saved,
    sent: null,
  }))
  let current = state
  if (!same(state.saved, saved)) {
    const sent = state.sent !== null && same(state.draft, state.sent.value)
    const untouched = sent || same(state.draft, state.saved)
    current = { saved, draft: untouched ? saved : state.draft, sent: null }
    setState(current)
  }
  return {
    draft: current.draft,
    change: (draft) => setState((before) => ({ ...before, draft })),
    save: async (write) => {
      const sent = { value: current.draft }
      setState((before) => ({ ...before, sent }))
      try {
        await write(sent.value)
      } catch (error) {
        setState((before) =>
          before.sent === sent ? { ...before, sent: null } : before,
        )
        throw error
      }
    },
  }
}
