// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import {
  bytes,
  pngOfSize,
  redPixelPng,
} from '../../app/screenshots/images.test-support'
import { HeldRequests } from '../../app/test-kit'
import { FEEDBACK_PATH } from '../../shared/feedback'
import { byRole, shownToasts } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  messageText,
  pressInField,
  typeMessage,
} from '../../test-support/message-field'
import { holdAnimationFrames } from '../../test-support/mount'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { click, press, settle } from '../test-mount'
import { isOff } from '../workspace/kept-test-kit'
import {
  chips,
  dropFiles,
  feedbackDialog,
  HeldFile,
  messageOf,
  notices,
  openFeedback,
  pasteFiles,
  pickFiles,
  sentBodies,
  serveFeedback,
  taken,
} from './feedback-test-kit'

const org = 'acme'
const workspace = 'checkout-autocomplete'
const pixel = () => new File([redPixelPng()], 'red.png')

describe('the Feedback dialog', () => {
  test('Send feedback in the palette opens the dialog over the open workspace with the focus in the message, and the send key sends the message with the context of the page and a toast', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    const { app } = await openPaletteTab(routes.workspace(org, workspace), {
      server,
    })
    const dialog = await openFeedback()
    const field = messageOf(dialog)
    const opened = {
      palette: palette() !== null,
      focus: document.activeElement === field,
      reply: dialog.textContent?.includes(
        'The team replies to mira@example.com.',
      ),
    }
    typeMessage(field, 'The terminal closes.')
    pasteFiles(field, [pixel()])
    await taken(app)
    pressInField(field, 'Enter', { shiftKey: true })
    pressInField(field, 'Enter', { isComposing: true })
    const held = {
      sends: (await sentBodies(server)).length,
      text: messageText(field),
    }
    pressInField(field, 'Enter')
    await settle()
    const [body] = await sentBodies(server)
    expect({
      opened,
      held,
      body,
      toast: shownToasts().map((toast) => toast.textContent),
      closed: feedbackDialog() === null,
    }).toEqual({
      opened: { palette: false, focus: true, reply: true },
      held: { sends: 0, text: 'The terminal closes.\n' },
      body: {
        draftId: expect.any(String),
        text: 'The terminal closes.\n',
        context: {
          orgId: org,
          workspaceId: workspace,
          appVersion: 'development',
          desktop: false,
        },
        screenshots: [
          { content: Buffer.from(redPixelPng()).toString('base64') },
        ],
      },
      toast: ['Thanks for your feedback'],
      closed: true,
    })
    const reopened = await openFeedback()
    expect({
      text: messageText(messageOf(reopened)),
      chips: chips(reopened),
    }).toEqual({ text: '', chips: [] })
  })

  test('a failed send keeps the text and the screenshot, names what failed, and a new press of Send tries again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    server.json(
      'POST',
      FEEDBACK_PATH,
      {
        error: {
          code: 'feedback_email_failed',
          message: 'The email did not go.',
        },
      },
      502,
    )
    const { app } = await openPaletteTab(routes.org(org), { server })
    const dialog = await openFeedback()
    typeMessage(messageOf(dialog), 'The terminal closes.')
    pasteFiles(messageOf(dialog), [pixel()])
    await taken(app)
    click(byRole('button', 'Send', dialog))
    await settle()
    const failed = {
      notices: notices(dialog),
      text: messageText(messageOf(dialog)),
      chips: chips(dialog).length,
      send: !isOff(byRole('button', 'Send', dialog)),
    }
    server.empty('POST', FEEDBACK_PATH)
    click(byRole('button', 'Send', dialog))
    await settle()
    expect({
      failed,
      sends: (await sentBodies(server)).length,
      toast: shownToasts().map((toast) => toast.textContent),
    }).toEqual({
      failed: {
        notices: ["The feedback wasn't sentThe email did not go."],
        text: 'The terminal closes.',
        chips: 1,
        send: true,
      },
      sends: 2,
      toast: ['Thanks for your feedback'],
    })
  })

  test('a pasted image, a dropped image, and a picked image show as chips with their names and sizes, and a paste of text stays text', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    const { app } = await openPaletteTab(routes.org(org), { server })
    const dialog = await openFeedback()
    const field = messageOf(dialog)
    const pasted = pasteFiles(field, [pixel()])
    const dropped = dropFiles(document.body, [
      new File([redPixelPng()], 'drop.png'),
    ])
    pickFiles(dialog, [new File([redPixelPng()], 'pick.png')])
    await taken(app)
    const size = `${redPixelPng().length} B`
    expect({
      kept: { paste: pasted.defaultPrevented, drop: dropped.defaultPrevented },
      chips: chips(dialog),
      text: messageText(field),
    }).toEqual({
      kept: { paste: true, drop: true },
      chips: [`red.png${size}`, `drop.png${size}`, `pick.png${size}`],
      text: '',
    })
  })

  test('a screenshot over the limit and a file of another type are not added, each with its notice, and the other screenshots stay', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    const { app } = await openPaletteTab(routes.org(org), { server })
    const dialog = await openFeedback()
    pasteFiles(messageOf(dialog), [pixel()])
    await taken(app)
    pickFiles(dialog, [
      new File([pngOfSize(7_000_001)], 'full-page.png'),
      new File([bytes('%PDF-1.7')], 'notes.pdf'),
    ])
    await taken(app)
    expect({ chips: chips(dialog).length, notices: notices(dialog) }).toEqual({
      chips: 1,
      notices: [
        "full-page.png wasn't addedTogether, the screenshots can be up to 7 MB.",
        "notes.pdf wasn't addedAdd a PNG, JPEG, GIF, or WebP image.",
      ],
    })
  })

  test('Escape and Cancel close the dialog and keep the draft, and a screenshot that the dialog still reads joins it while it is closed, as Send waits', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    const { app } = await openPaletteTab(routes.org(org), { server })
    let dialog = await openFeedback()
    typeMessage(messageOf(dialog), 'The terminal closes.')
    pasteFiles(messageOf(dialog), [pixel()])
    await taken(app)
    press(messageOf(dialog), 'Escape')
    const escaped = feedbackDialog() === null
    dialog = await openFeedback()
    const slow = new HeldFile([redPixelPng()], 'slow.png')
    pasteFiles(messageOf(dialog), [slow])
    await settle()
    const waiting = !isOff(byRole('button', 'Send', dialog))
    click(byRole('button', 'Cancel', dialog))
    const cancelled = feedbackDialog() === null
    slow.release()
    await taken(app)
    dialog = await openFeedback()
    expect({
      escaped,
      waiting,
      cancelled,
      text: messageText(messageOf(dialog)),
      chips: chips(dialog).map((chip) => chip.split('.png')[0]),
      send: !isOff(byRole('button', 'Send', dialog)),
    }).toEqual({
      escaped: true,
      waiting: false,
      cancelled: true,
      text: 'The terminal closes.',
      chips: ['red', 'slow'],
      send: true,
    })
  })

  test('on a phone the dialog is a sheet, whose reply line loads, fails with Try again, and names how to get a reply without an address, as Send waits for it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json(
      'GET',
      FEEDBACK_PATH,
      { error: { code: 'internal', message: 'The server did not answer.' } },
      503,
    )
    server.empty('POST', FEEDBACK_PATH)
    const held = new HeldRequests(server)
    const { view } = await openPaletteTab(routes.org(org), {
      server,
      fetch: held.fetch,
      viewport: 'phone',
    })
    held.holdAnswer('GET', FEEDBACK_PATH)
    const dialog = await openFeedback(() =>
      click(byRole('button', 'Search', view)),
    )
    typeMessage(messageOf(dialog), 'The terminal closes.')
    const send = () => !isOff(byRole('button', 'Send', dialog))
    const reply = () =>
      dialog.textContent?.match(
        /(Loading the reply address|To get a reply[^.]*\.)/,
      )?.[0] ?? null
    const loading = { reply: reply(), send: send() }
    held.release('GET', FEEDBACK_PATH)
    await settle()
    const failed = { notices: notices(dialog), send: send() }
    server.json('GET', FEEDBACK_PATH, { replyEmail: null })
    click(byRole('button', 'Try again', dialog))
    await settle()
    expect({
      loading,
      failed,
      ready: { reply: reply(), send: send() },
    }).toEqual({
      loading: { reply: 'Loading the reply address', send: false },
      failed: {
        notices: [
          "The reply address didn't loadThe server did not answer.Try again",
        ],
        send: false,
      },
      ready: {
        reply:
          'To get a reply, add a verified email on GitHub, then sign in again.',
        send: true,
      },
    })
  })
})
