import { act } from 'react'
import { vi } from 'vitest'
import type { DraftFile } from '../../../app/draft-files'
import { fileMark } from '../../../app/draft-marks'
import { holdAnimationFrames, waitFor } from '../../../test-support/mount'
import { mountAttachedField } from './attached-field-test-kit'

// Mounts the message field with one attached file, and drives the name of
// its chip and a pointer over it, for the tests of the preview. Tests only.

/** A file of a draft whose upload runs, with these bytes. */
export function draftFile(id: string, file: File): DraftFile {
  return { state: 'uploading', id, file, sentBytes: null, upload: null }
}

/** Mounts the field with the chip of the file, whose spinner holds still. */
export async function mountWith(file: DraftFile) {
  holdAnimationFrames()
  const view = await mountAttachedField({
    value: `See ${fileMark(file.id)} `,
    files: [file],
  })
  await waitFor(() => view.chips().length === 1, 'the chip of the file')
  return view
}

/** The button of the name of the only chip of the field. */
export function nameButton(field: HTMLElement): HTMLElement {
  const button = field.querySelector<HTMLElement>(
    '[contenteditable="false"] button[tabindex="-1"]:not([aria-label])',
  )
  if (!button) throw new Error('The chip has no name button.')
  return button
}

export function hover(element: Element, type: 'pointerover' | 'pointerout') {
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }),
    )
  })
}

/**
 * Rests a pointer of `type` on the chip for `ms` on a fake clock, then
 * gives the page a few turns on the real clock. Gives the card, or null.
 */
export async function restOn(
  chip: HTMLElement,
  type: 'mouse' | 'touch',
  ms: number,
): Promise<Element | null> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    act(() => {
      chip.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, pointerType: type }),
      )
    })
    act(() => vi.advanceTimersByTime(ms))
  } finally {
    vi.useRealTimers()
  }
  for (let turn = 0; turn < 5; turn += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
  return document.querySelector('pre')
}
