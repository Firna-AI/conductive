import { act } from 'react'
import type { AppModel } from '../../app/app-model'
import { screenshotIntake } from '../../app/screenshots/screenshot-intake'
import { FEEDBACK_PATH, type SendFeedbackRequest } from '../../shared/feedback'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { asMessageField } from '../../test-support/message-field'
import { searchField } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { press, settle, typeText } from '../test-mount'

// The helpers of the tests of the Feedback dialog in the whole app.

/** The reply address of the person, and a send that the server takes. */
export function serveFeedback(
  server: FakeApiServer,
  replyEmail: string | null = 'mira@example.com',
): void {
  server.json('GET', FEEDBACK_PATH, { replyEmail })
  server.empty('POST', FEEDBACK_PATH)
}

/** The Feedback dialog, or null while it is closed. */
export function feedbackDialog(): HTMLElement | null {
  return queryByRole('dialog', 'Send feedback')
}

/**
 * Opens the Feedback dialog as a person does: the palette key, a search
 * for "feedback", and Enter. On a phone, `search` opens the palette.
 */
export async function openFeedback(search?: () => void): Promise<HTMLElement> {
  if (search) search()
  else pressCommand('command-palette', 'other', document.body)
  typeText(searchField(), 'feedback')
  press(searchField(), 'Enter')
  await settle()
  return byRole('dialog', 'Send feedback')
}

/** The message box of the dialog. */
export function messageOf(dialog: HTMLElement): HTMLElement {
  return asMessageField(byRole('textbox', 'Message', dialog))
}

function transfer(files: readonly File[]): DataTransfer {
  const data = new DataTransfer()
  for (const file of files) data.items.add(file)
  return data
}

/** Pastes files into an element, as the paste event of a browser gives them. */
export function pasteFiles(target: HTMLElement, files: readonly File[]): Event {
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer(files),
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/**
 * Drops files on an element. A DragEvent of the test DOM takes no data
 * from its options, so the event gets them as a browser gives them.
 */
export function dropFiles(target: EventTarget, files: readonly File[]): Event {
  const event = new DragEvent('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer(files) })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/** Chooses files in the file picker of Add screenshots. */
export function pickFiles(dialog: HTMLElement, files: readonly File[]): void {
  const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('The dialog has no file picker.')
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: transfer(files).files,
  })
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

/** Waits until the intake took each file that it got, and the page shows it. */
export async function taken(app: AppModel): Promise<void> {
  await act(async () => {
    await screenshotIntake(app).add([])
  })
  await settle()
}

/** The name and the size of each screenshot chip, as the dialog shows them. */
export function chips(dialog: HTMLElement): string[] {
  const list = queryByRole('list', 'Screenshots', dialog)
  return Array.from(list?.querySelectorAll('li') ?? [], (chip) =>
    (chip.textContent ?? '').trim(),
  )
}

/** The texts of the notices of the dialog, each title first. */
export function notices(dialog: HTMLElement): string[] {
  return Array.from(dialog.querySelectorAll('[role="alert"]'), (notice) =>
    (notice.textContent ?? '').trim(),
  )
}

/** The bodies of the sends that the server got, in their order. */
export async function sentBodies(
  server: FakeApiServer,
): Promise<SendFeedbackRequest[]> {
  const sends = server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === FEEDBACK_PATH,
  )
  return Promise.all(sends.map((request) => request.clone().json()))
}

/** A file whose bytes arrive only after `release`, as a slow disk gives them. */
export class HeldFile extends File {
  private open: () => void = () => undefined
  private readonly gate = new Promise<void>((resolve) => {
    this.open = resolve
  })

  release(): void {
    this.open()
  }

  override async arrayBuffer(): Promise<ArrayBuffer> {
    await this.gate
    return super.arrayBuffer()
  }
}
