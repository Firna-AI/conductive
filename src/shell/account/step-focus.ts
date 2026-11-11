import { useEffect, type RefObject } from 'react'
import type { SignInStage } from './codex-sign-in'

/**
 * Moves the focus to the first line of each step of the ChatGPT sign-in
 * that shows, so that the keyboard keeps its place when a step takes away
 * the button that the user pressed, or gives that button another action.
 * `steps` holds every step, and `line` is the first line of the step that
 * shows, with a tabindex of -1 and the class `line` of
 * `step-focus.module.css`.
 *
 * The focus moves only from the steps, or from nowhere, as after a press of
 * a button that leaves, such as Sign in again. So a control outside the
 * steps, such as the switch of the form, keeps the focus at the first step,
 * and a step that comes while the focus is elsewhere on the page, as when a
 * code expires, leaves the focus there. The page does not scroll.
 */
export function useStepFocus(
  stage: SignInStage,
  steps: RefObject<HTMLElement | null>,
  line: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const active = document.activeElement
    const lost = active === null || active === document.body
    if (lost || steps.current?.contains(active)) {
      line.current?.focus({ preventScroll: true })
    }
  }, [stage, steps, line])
}
