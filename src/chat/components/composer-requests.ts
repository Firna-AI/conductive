import { useEffect, useRef, type RefObject } from 'react'
import {
  focusStayed,
  type ComposerFocusRequest,
} from '../../app/composer-focus'
import type { MentionRequest } from '../state/chat-snapshot'
import type { FieldHandle } from './chip-field/focus-plugins'

// The requests that parts outside the composer make of its message field:
// the focus, and the chip of Add to chat.

/** A request that the message field takes the focus once. */
export interface ComposerFocus {
  readonly request: ComposerFocusRequest
  /** The composer took the request: it focused, or the focus had moved. */
  readonly done: () => void
}

/**
 * Gives the focus to the field once for each request, when the composer
 * shows it, unless the focus moved to another element since the request.
 */
export function useRequestedFocus(
  field: RefObject<FieldHandle | null>,
  focus: ComposerFocus | null,
) {
  const request = focus?.request ?? null
  const done = focus?.done
  useEffect(() => {
    if (request === null) return
    if (focusStayed(request)) field.current?.focus()
    done?.()
  }, [field, request, done])
}

/**
 * Puts the chip of each request of Add to chat into the field once, when the
 * composer shows it: at the caret, else at the end, as `insertMention` says.
 * A field that mounts again has no caret. While a focus request of the same
 * render still stands, the field takes the focus with the chip, and the
 * caret stands after it. `useRequestedFocus`, which comes next, then finds
 * the focus moved and only ends that request. Without a focus request, as on
 * a phone, the field takes no focus. A field keeps each request that it
 * took, so a second run of the effect, as in the strict mode of React, puts
 * no second chip.
 */
export function useRequestedMention(
  field: RefObject<FieldHandle | null>,
  mention: MentionRequest | null,
  taken: ((request: MentionRequest) => void) | undefined,
  focus: ComposerFocus | null,
) {
  const last = useRef<MentionRequest | null>(null)
  const request = focus?.request ?? null
  useEffect(() => {
    if (mention === null || last.current === mention) return
    last.current = mention
    const focusing = request !== null && focusStayed(request)
    field.current?.insertMention(mention.target, focusing)
    taken?.(mention)
  }, [field, mention, taken, request])
}
