import { useState } from 'react'

/** Whether two values are the same. */
type Same<T> = (a: T, b: T) => boolean

/** The draft that went out for a save. */
type Sent<T> = { value: T } | null

interface DraftState<T> {
  /** The saved value that the draft last followed. */
  saved: T
  draft: T
  sent: Sent<T>
}

/**
 * How a draft follows the saved value. `same` says whether the saved value
 * changed. `follow` gives the state after the saved value changed from
 * `state.saved` to `saved`. `settle` gives the state after the save of
 * `state.sent` succeeded.
 */
export interface DraftMode<T> {
  same: Same<T>
  follow: (state: DraftState<T>, saved: T) => DraftState<T>
  settle: (state: DraftState<T>) => DraftState<T>
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

/**
 * The mode of a draft of one value, such as a script. The next newer saved
 * value after a save counts as its answer: a draft that still equals what
 * went out takes it.
 */
function wholeValue<T>(same: Same<T>): DraftMode<T> {
  return {
    same,
    follow: ({ draft, saved: before, sent }, saved) => ({
      saved,
      draft: untouched(same, draft, before, sent) ? saved : draft,
      sent: null,
    }),
    settle: (state) => state,
  }
}

/**
 * The mode of a draft with several fields, such as a form: each field
 * follows the saved value on its own. A field that the user did not change
 * takes the newer saved field, and an edited field keeps its edit, also
 * while its save waits. So a save sends only the edited fields, a field
 * that changed elsewhere shows its new value, and no newer saved value acts
 * as the answer of a save. When the save succeeds, each field that still
 * equals what went out takes the field of the latest saved value.
 */
export function eachField<T extends object>(
  fields: SameFields<T>,
): DraftMode<T> {
  const followFields = (draft: T, before: T, saved: T, sent: Sent<T>): T => {
    const next = { ...draft }
    for (const key in fields) {
      const field = sent === null ? null : { value: sent.value[key] }
      if (untouched(fields[key], draft[key], before[key], field)) {
        next[key] = saved[key]
      }
    }
    return next
  }
  return {
    same: (a, b) => {
      for (const key in fields) {
        if (!fields[key](a[key], b[key])) return false
      }
      return true
    },
    follow: (state, saved) => ({
      ...state,
      saved,
      draft: followFields(state.draft, state.saved, saved, null),
    }),
    settle: ({ draft, saved, sent }) => ({
      saved,
      draft: followFields(draft, saved, saved, sent),
      sent: null,
    }),
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
 * change takes the new value, and an edited draft stays. A failed save
 * keeps the draft.
 *
 * `mode` says when the draft that went out for a save takes the answer,
 * which can differ from it, as a trimmed name does. The default is the
 * equality of a draft of one value: a draft that still equals what went
 * out takes the next newer saved value. `eachField` is the mode of a draft
 * with several fields: each field follows the saved value on its own, and
 * a field that went out takes the latest saved value only when its save
 * succeeds.
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
  const { same, follow, settle } =
    typeof mode === 'function' ? wholeValue(mode) : mode
  let current = state
  if (!same(state.saved, saved)) {
    current = follow(state, saved)
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
      setState((before) => (before.sent === sent ? settle(before) : before))
    },
  }
}
