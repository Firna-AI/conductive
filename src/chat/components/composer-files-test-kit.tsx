import { onTestFinished } from 'vitest'
import type { FileReply } from '../../app/api/client'
import type { DraftFile } from '../../app/draft-files'
import { controlledUploads } from '../../app/draft-files.test-support'
import { fileMark } from '../../app/draft-marks'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { asMessageField } from '../../test-support/message-field'
import { holdAnimationFrames, mount, press } from '../../test-support/mount'
import composerStyles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { readyChat } from '../state/draft-files.test-support'
import { chatFor } from '../state/test-kit'
import { WorkspaceChatView } from '../WorkspaceChat'

// Mounts the composer of a chat with the controller of the app, for the
// tests of its attached files: the file picker attaches each pick to the
// draft, the field puts the chips in its text, and a removal of a chip takes
// its file off the draft. Each upload waits until the test answers it, as
// `readyChat` says.

/** A file of a pick, with its bytes. */
export const picked = (name: string, bytes = 'x') => new File([bytes], name)

/** The reply of an upload that failed. */
export const failedUpload: FileReply = {
  status: 502,
  body: { error: { code: 'upload_failed', message: 'The upload failed.' } },
}

/** The names of the files, in their order. */
export const names = (files: readonly DraftFile[]) =>
  files.map((item) => item.file.name)

/** Presses the first control of a list, as a pointer user does, if any. */
export async function pressFirst(controls: readonly HTMLElement[]) {
  const [first] = controls
  if (first) await press(first)
}

/**
 * The chat of `readyChat`, whose fetch keeps each request that `hold` picks
 * until the test lets it go through `held`.
 */
async function heldChat(hold: (request: Request) => boolean) {
  const upload = controlledUploads()
  const chat = chatFor({ conversation: 'history', files: upload.files, hold })
  await chat.controller.start()
  return { ...chat, ...upload }
}

/**
 * The chat of a workspace, with its composer on the screen. `hold` picks the
 * requests that wait until the test lets them go, such as a send.
 */
export async function mountComposer(
  viewport: 'desktop' | 'mobile' = 'desktop',
  hold?: (request: Request) => boolean,
) {
  holdAnimationFrames()
  const chat = hold ? await heldChat(hold) : await readyChat()
  onTestFinished(chat.controller.stop)
  const { container } = await mount(
    <WorkspaceChatView
      clock={{ now: () => FAKE_TIME }}
      controller={chat.controller}
      viewport={viewport}
    />,
  )
  const field = asMessageField(byRole('textbox', 'Message', container))
  const box = field.closest<HTMLElement>(`.${composerStyles.composer}`)
  if (!box) throw new Error('The field is not in a message box.')
  const sessionId = chat.controller.getSnapshot().activeSessionId ?? ''
  /** The draft of the session, as the store of the chat keeps it. */
  const draft = () => {
    const found = chat.draftOf(sessionId)
    if (!found) throw new Error('The chat holds no draft of its session.')
    return found
  }
  return {
    ...chat,
    root: container,
    field,
    /** The message box: the field, the bar, and the padding around them. */
    box,
    /** Whether the box shows the drop state of files that hover over it. */
    dropping: () => box.classList.contains(composerStyles.dropping),
    sessionId,
    draft,
    /** The mark of the file of the draft with this name, or a stand-in. */
    markOf: (name: string) => {
      const { files, detached } = draft()
      const item = [...files, ...detached].find(
        ({ file }) => file.name === name,
      )
      return item ? fileMark(item.id) : `<no file ${name}>`
    },
    /** The names of the chips in the field, as a screen reader hears them. */
    chips: () =>
      Array.from(field.querySelectorAll('[contenteditable="false"]'), (chip) =>
        accessibleName(chip),
      ),
  }
}
