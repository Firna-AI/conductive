import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach } from 'vitest'

// React runs `act` without warnings only when this flag is set.
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

/** A tree that `mount` rendered into a container on `document.body`. */
export type Mounted = {
  container: HTMLElement
  /** Renders a new element, such as new props, into the same root. */
  rerender(element: ReactNode): Promise<void>
  /** Unmounts the tree and removes the container. */
  unmount(): Promise<void>
}

const mounted = new Set<Mounted>()

afterEach(async () => {
  for (const view of [...mounted]) await view.unmount()
})

/**
 * Mounts the element in a DOM test environment, such as happy-dom, inside
 * `act`. Each mounted tree unmounts after its test.
 */
export async function mount(element: ReactNode): Promise<Mounted> {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const view: Mounted = {
    container,
    async rerender(next) {
      await act(async () => root.render(next))
    },
    async unmount() {
      if (!mounted.delete(view)) return
      await act(async () => root.unmount())
      container.remove()
    },
  }
  mounted.add(view)
  await view.rerender(element)
  return view
}

/** A promise that the test settles, such as a fake reply that waits. */
export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T = void>(): Deferred<T> {
  const settle: {
    resolve?: (value: T) => void
    reject?: (reason: unknown) => void
  } = {}
  const promise = new Promise<T>((resolve, reject) => {
    settle.resolve = resolve
    settle.reject = reject
  })
  return {
    promise,
    resolve: (value) => settle.resolve?.(value),
    reject: (reason) => settle.reject?.(reason),
  }
}

/** How long `waitFor` waits for an expected state, in milliseconds. */
const WAIT_DEADLINE = 10_000

/**
 * The test timeout of a file that uses `waitFor`, in milliseconds. It is a
 * hang guard, longer than the deadline of `waitFor`, so a wait that fails
 * shows its named error first. A DOM test file sets it with
 * `vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })`.
 */
export const MOUNTED_TEST_TIMEOUT = 15_000

/**
 * Waits until `find` returns a value that is not null, undefined, or false.
 * Between tries, the event loop takes one turn inside `act`, so replies and
 * React updates go on. It fails after 10 seconds with `what` in the error.
 * It needs real timers.
 */
export async function waitFor<T>(
  find: () => T | null | undefined | false,
  what: string,
): Promise<T> {
  const deadline = Date.now() + WAIT_DEADLINE
  for (;;) {
    const value = find()
    if (value !== null && value !== undefined && value !== false) return value
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

/** Presses a control as a pointer user does: a DOM click, inside `act`. */
export async function press(element: Element): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error('No control to press')
  await act(async () => element.click())
}

/** Types text into a field as a user does, so React sees the change. */
export async function typeText(field: Element, text: string): Promise<void> {
  const prototype =
    field instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : null
  const setValue = prototype
    ? Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    : undefined
  if (!(field instanceof HTMLElement) || !setValue) {
    throw new Error('No text field to type into')
  }
  await act(async () => {
    field.focus()
    setValue.call(field, text)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Presses a key on the element with the focus: a keydown, then a keyup. */
export async function pressKey(key: string): Promise<void> {
  const target = document.activeElement
  if (!target) throw new Error('No element has the focus')
  await act(async () => {
    for (const type of ['keydown', 'keyup']) {
      const event = new KeyboardEvent(type, {
        key,
        bubbles: true,
        cancelable: true,
      })
      target.dispatchEvent(event)
    }
  })
}
