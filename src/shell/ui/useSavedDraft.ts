import { useState } from 'react'

/** Whether two values are the same. */
type Same<T> = (a: T, b: T) => boolean

/** The draft that went out for a save, until the saved value changes. */
type Sent<T> = { value: T } | null

interface DraftState<T> {
  /** The saved value that the draft last followed. */
  saved: T
  draft: T
  sent: Sent<T>
}

/**
 * How a draft follows a newer saved value. `same` says whether the saved
 * value changed. `follow` gives the draft after the saved value changed
 * from `before` to `saved`, with `sent`, the draft that went out for a
 * save, if one did.
 */
export interface DraftMode<T> {
  same: Same<T>
  follow: (draft: T, before: T, saved: T, sent: Sent<T>) => T
}

/** The equality of each field of a draft with several fields. */
export type SameFields<T extends object> = {
  readonly [K in keyof T]-?: Same<T[K]>
}

/**
 * Whether a value of the draft takes the newer saved value: the user did
 * not change it since `before`, or it still equals what went out for a
 * save.
 */
function untouched<V>(
  same: Same<V>,
  draft: V,
  before: V,
  sent: Sent<V>,
): boolean {
  return (sent !== null && same(draft, sent.value)) || same(draft, before)
}

/** The mode of a draft of one value, such as a script. */
function wholeValue<T>(same: Same<T>): DraftMode<T> {
  return {
    same,
    follow: (draft, before, saved, sent) =>
      untouched(same, draft, before, sent) ? saved : draft,
  }
}

/**
 * The mode of a draft with several fields, such as a form: each field
 * follows the saved value on its own. A field that the user did not change
 * takes the newer saved field, and an edited field keeps its edit. So a
 * save sends only the edited fields, and a field that changed elsewhere
 * shows its new value.
 */
export function eachField<T extends object>(
  fields: SameFields<T>,
): DraftMode<T> {
  return {
    same: (a, b) => {
      for (const key in fields) {
        if (!fields[key](a[key], b[key])) return false
      }
      return true
    },
    follow: (draft, before, saved, sent) => {
      const next = { ...draft }
      for (const key in fields) {
        const field = sent === null ? null : { value: sent.value[key] }
        if (untouched(fields[key], draft[key], before[key], field)) {
          next[key] = saved[key]
        }
      }
      return next
    },
  }
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
 *
 * `mode` is the equality of a draft of one value, which is the default, or
 * `eachField` for a draft with several fields, where each field follows
 * the saved value on its own by these rules.
 */
export function useSavedDraft<T>(
  saved: T,
  mode: Same<T> | DraftMode<T> = Object.is,
): SavedDraft<T> {
  const [state, setState] = useState<DraftState<T>>(() => ({
    saved,
    draft: saved,
    sent: null,
  }))
  const { same, follow } = typeof mode === 'function' ? wholeValue(mode) : mode
  let current = state
  if (!same(state.saved, saved)) {
    const draft = follow(state.draft, state.saved, saved, state.sent)
    current = { saved, draft, sent: null }
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
