// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import { redPixelPng } from '../../app/screenshots/images.test-support'
import type { ApiErrorBody } from '../../shared/api'
import { FEEDBACK_PATH } from '../../shared/feedback'
import { byRole, shownToasts } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { messageText, typeMessage } from '../../test-support/message-field'
import { holdAnimationFrames } from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, settle } from '../test-mount'
import { isOff } from '../workspace/kept-test-kit'
import {
  chips,
  messageOf,
  notices,
  openFeedback,
  pasteFiles,
  sentBodies,
  serveFeedback,
  taken,
} from './feedback-test-kit'

/**
 * The refusal of a send over the limit, as the Worker sends it, with a
 * time to try again or without one.
 */
function limitRefusal(retryAt?: number): ApiErrorBody {
  return {
    error: {
      code: 'feedback_send_limit',
      message:
        'You can send up to 10 feedback messages an hour. Try again at 15:02 UTC.',
      ...(retryAt === undefined ? {} : { retryAt }),
    },
  }
}

describe('the send limit of the Feedback dialog', () => {
  test('a send over the limit keeps the text and the screenshot, says when to try again on the clock of the person, shows the message without a valid time, and a new press of Send tries again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveFeedback(server)
    server.json(
      'POST',
      FEEDBACK_PATH,
      limitRefusal(Date.UTC(2026, 10, 10, 15, 1, 40)),
      429,
    )
    const { app } = await openPaletteTab(routes.org('acme'), {
      server,
      timeZone: 'America/New_York',
    })
    const dialog = await openFeedback()
    const send = () => byRole('button', 'Send', dialog)
    typeMessage(messageOf(dialog), 'The terminal closes.')
    pasteFiles(messageOf(dialog), [new File([redPixelPng()], 'red.png')])
    await taken(app)
    click(send())
    await settle()
    const limited = {
      notices: notices(dialog),
      text: messageText(messageOf(dialog)),
      chips: chips(dialog).length,
      send: !isOff(send()),
    }
    server.json('POST', FEEDBACK_PATH, limitRefusal(), 429)
    click(send())
    await settle()
    const untimed = notices(dialog)
    server.empty('POST', FEEDBACK_PATH)
    click(send())
    await settle()
    expect({
      limited,
      untimed,
      sends: (await sentBodies(server)).length,
      toast: shownToasts().map((toast) => toast.textContent),
    }).toEqual({
      limited: {
        notices: [
          "The feedback wasn't sentYou can send up to 10 feedback messages an hour. Try again at 10:02.",
        ],
        text: 'The terminal closes.',
        chips: 1,
        send: true,
      },
      untimed: [
        "The feedback wasn't sentYou can send up to 10 feedback messages an hour. Try again at 15:02 UTC.",
      ],
      sends: 3,
      toast: ['Thanks for your feedback'],
    })
  })
})
