import { useEffect, type RefObject } from 'react'
import type { SignInStage } from './codex-sign-in'

/**
 * Moves the focus to the first line of each later step of the ChatGPT
 * sign-in that shows, so that the keyboard keeps its place when a step takes
 * away the button that the user pressed, or gives that button another
 * action. `steps` holds every step, in a wrapper without a box, and `line`
 * is the first line of the step that shows, with a tabindex of -1 and the
 * class `focusTarget` of `ui.module.css`, which shows no focus ring.
 *
 * The start step shows only as the sign-in shows, so the inline form places
 * that focus, as `useInlineFormFocus` says: only after a press, such as of
 * Sign in again. A later step takes the focus only from the steps, or from
 * nowhere, as after a press of Get a code. So a step that comes while the
 * focus is elsewhere on the page, as when a code expires, leaves the focus
 * there. The page does not scroll.
 */
export function useStepFocus(
  stage: SignInStage,
  steps: RefObject<HTMLElement | null>,
  line: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (stage.step === 'start') return
    const active = document.activeElement
    const lost = active === null || active === document.body
    if (lost || steps.current?.contains(active)) {
      line.current?.focus({ preventScroll: true })
    }
  }, [stage, steps, line])
}
