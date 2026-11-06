import { act, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onTestFinished, vi } from 'vitest'
import type { AppModel } from '../app/app-model'
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

/** Presses a key on an element, as the keyboard does. */
export function press(
  target: EventTarget,
  key: string,
  options: { shift?: boolean } = {},
): void {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
}

/** Clicks an element, as a press of the pointer does. */
export function click(target: HTMLElement): void {
  act(() => {
    target.focus()
    target.click()
  })
}
