import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach } from 'vitest'
import { accessibleName, whyInoperable } from './dom-queries'

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
const restores: (() => void)[] = []

afterEach(async () => {
  for (const view of [...mounted]) await view.unmount()
  for (const restore of restores.splice(0)) restore()
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

/** Fails with a named error when a person cannot use the element now. */
function mustOperate(element: Element, action: string): void {
  const why = whyInoperable(element)
  if (why === null) return
  const name = accessibleName(element)
  const role = element.getAttribute('role') ?? element.tagName.toLowerCase()
  throw new Error(`Cannot ${action} the ${role} "${name}": ${why}`)
}

/** Presses a control as a pointer user does: a DOM click, inside `act`. */
export async function press(element: Element): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error('No control to press')
  mustOperate(element, 'press')
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
  mustOperate(field, 'type into')
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
  mustOperate(target, `press ${key} on`)
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

/**
 * Sends a close request to an open dialog, as a browser does when a person
 * presses Escape: a `cancel` event, then a close unless a listener prevents
 * it. Without a press since the last request, such as for a second Escape,
 * a browser sends a `cancel` that no listener can prevent, so the dialog
 * closes. Pass `cancelable: false` for that. happy-dom sends no close
 * requests of its own.
 */
export async function requestDialogClose(
  dialog: HTMLDialogElement,
  options: { cancelable: boolean } = { cancelable: true },
): Promise<void> {
  if (!dialog.open) throw new Error('The dialog is not open')
  await act(async () => {
    const cancel = new Event('cancel', { cancelable: options.cancelable })
    dialog.dispatchEvent(cancel)
    if (!cancel.defaultPrevented) dialog.close()
  })
}

/**
 * Holds the animation frames of the page until the test ends: a callback
 * of `requestAnimationFrame` never runs. An endless animation, such as the
 * spinner of `@firna/ui`, then stays on its first frame and does not keep
 * `act` from settling. Timers, replies, and `waitFor` go on.
 */
export function holdAnimationFrames(): void {
  let frames = 0
  const standIns = {
    // The frame never comes, so its callback never runs.
    requestAnimationFrame: () => ++frames,
    cancelAnimationFrame: () => undefined,
  }
  for (const [name, value] of Object.entries(standIns)) {
    const saved = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    })
    restores.push(() => {
      if (saved) Object.defineProperty(globalThis, name, saved)
      else Reflect.deleteProperty(globalThis, name)
    })
  }
}
