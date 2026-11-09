import { act, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onTestFinished, vi } from 'vitest'
import type { AppModel } from '../app/app-model'
import { flushMicrotasks } from '../app/test-kit'
import { AppProviders, type ScreenOptions } from './test-render'

/**
 * Mounts a screen in the DOM of a happy-dom test, with every provider of
 * the app, so that its effects and its events run. The screen unmounts at
 * the end of the test.
 */
export function mountScreen(
  app: AppModel,
  screen: ReactElement,
  options: ScreenOptions = {},
): HTMLElement {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  onTestFinished(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })
  act(() => {
    root.render(
      <AppProviders app={app} {...options}>
        {screen}
      </AppProviders>,
    )
  })
  return container
}

/**
 * Presses a key on an element, as the keyboard does. The result is the
 * event, whose `defaultPrevented` says whether the browser's own action
 * of the key was stopped.
 */
export function press(
  target: EventTarget,
  key: string,
  options: {
    shift?: boolean
    alt?: boolean
    ctrl?: boolean
    meta?: boolean
  } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options.shift ?? false,
    altKey: options.alt ?? false,
    ctrlKey: options.ctrl ?? false,
    metaKey: options.meta ?? false,
    bubbles: true,
    cancelable: true,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/** Clicks an element, as a press of the pointer does. */
export function click(target: HTMLElement): void {
  act(() => {
    target.focus()
    target.click()
  })
}

/**
 * Types text into a field, as the keyboard does: the field takes the focus,
 * and its value becomes `text`, so that React sees the change.
 */
export function typeText(
  field: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): void {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setValue) throw new Error('The field takes no text.')
  act(() => {
    field.focus()
    setValue.call(field, text)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/**
 * Lets the answers of the fake API, and the renders that they start, run
 * to their end. It waits for microtasks only, inside `act`.
 */
export async function settle(): Promise<void> {
  await act(async () => {
    await flushMicrotasks()
  })
}
