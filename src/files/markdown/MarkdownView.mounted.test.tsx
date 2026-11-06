// @vitest-environment happy-dom

import { StrictMode } from 'react'
import { expect, it, vi } from 'vitest'
import { fakeWorkers, mountRoot, press } from '../mount-test-kit'
import { parseMarkdown } from './markdown-document'
import { MarkdownView } from './MarkdownView'

/** The task boxes of a rendered document, in document order. */
function boxes(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll('input')].filter(
    (input) => input.type === 'checkbox',
  )
}

function headings(container: HTMLElement): string[] {
  return [...container.querySelectorAll('h1')].map((h1) => h1.textContent ?? '')
}

/** The title of the error that the preview announces, or null. */
function errorTitle(container: HTMLElement): string | null {
  return container.querySelector('[role="alert"] h2')?.textContent ?? null
}

it('shows the current state of each task box after the text changes, also in a reused box', () => {
  const view = mountRoot()
  const show = (text: string) =>
    view.render(<MarkdownView parser={parseMarkdown} text={text} />)
  show('- [ ] Plan\n- [x] Build\n  - [ ] Check\n')
  const first = boxes(view.container)
  expect(first.map((box) => box.checked)).toEqual([false, true, false])

  // Each box toggles, and the nested list gains a task.
  show('- [x] Plan\n- [ ] Build\n  - [x] Check\n  - [x] Ship\n')
  const toggled = boxes(view.container)
  expect(toggled.map((box) => box.checked)).toEqual([true, false, true, true])
  expect(toggled.slice(0, 3).every((box, index) => box === first[index])).toBe(
    true,
  )

  // The first task goes, so the boxes of Plan and Build show Build and Ship.
  show('- [x] Build\n  - [ ] Check\n- [ ] Ship\n')
  const removed = boxes(view.container)
  expect(removed.map((box) => box.checked)).toEqual([true, false, false])
  expect(removed[0]).toBe(first[0])
  expect(removed[2]).toBe(first[1])
  expect(view.container.textContent).toBe('BuildCheckShip')
})

it('parses each text in its own module worker, and ends each worker that the view no longer needs', () => {
  const workers = fakeWorkers()
  const view = mountRoot()
  const show = (text: string) =>
    view.render(
      <StrictMode>
        <MarkdownView text={text} />
      </StrictMode>,
    )
  show('# First')
  expect(view.container.textContent).toBe('Opening the file')
  const types = new Set(workers.made.map((worker) => worker.options?.type))
  expect(types).toEqual(new Set(['module']))
  const [first] = workers.live()
  expect(workers.live()).toHaveLength(1)
  expect(first.posted).toEqual(['# First'])
  first.answer()
  expect(headings(view.container)).toEqual(['First'])
  expect(workers.live()).toHaveLength(0)

  // A new text keeps the last document on screen while it parses.
  show('# Second')
  const [second] = workers.live()
  expect(second.posted).toEqual(['# Second'])
  expect(headings(view.container)).toEqual(['First'])

  // A newer text ends the parse of the older one, and its reply never shows.
  show('# Third')
  expect(second.ended).toBe(true)
  second.answer()
  expect(headings(view.container)).toEqual(['First'])
  const [third] = workers.live()
  expect(third.posted).toEqual(['# Third'])
  third.answer()
  expect(headings(view.container)).toEqual(['Third'])

  show('# Fourth')
  expect(workers.live()).toHaveLength(1)
  view.unmount()
  expect(workers.live()).toHaveLength(0)
})

it('shows the file error with Try again when no worker can parse the text, and Try again parses it in a new worker', () => {
  const text = '# Notes\n\nThe agent writes here.'
  // A worker that fails, as when its script cannot load.
  const workers = fakeWorkers()
  const failed = mountRoot()
  failed.render(<MarkdownView text={text} />)
  workers.made[0].fail()
  expect(errorTitle(failed.container)).toBe("This file didn't open")
  expect(workers.live()).toHaveLength(0)
  press(failed.container, 'button', 'Try again')
  expect(failed.container.textContent).toBe('Opening the file')
  expect(workers.made.map((worker) => worker.posted)).toEqual([[text], [text]])
  workers.made[1].answer()
  expect(headings(failed.container)).toEqual(['Notes'])
  expect(errorTitle(failed.container)).toBeNull()
  failed.unmount()

  // A browser without workers, or a worker that cannot start.
  vi.stubGlobal('Worker', undefined)
  const none = mountRoot()
  none.render(<MarkdownView text={text} />)
  expect(errorTitle(none.container)).toBe("This file didn't open")
  const started = fakeWorkers()
  press(none.container, 'button', 'Try again')
  expect(started.made.map((worker) => worker.posted)).toEqual([[text]])
  started.made[0].answer()
  expect(headings(none.container)).toEqual(['Notes'])
})
