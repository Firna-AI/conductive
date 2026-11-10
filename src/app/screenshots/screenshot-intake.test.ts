import { describe, expect, test } from 'vitest'
import { fakeUser } from '../../test-support/fixtures/core'
import { feedbackFixture, feedbackLocation } from '../feedback.test-support'
import {
  bytes,
  pngChunk,
  pngHeader,
  pngOfSize,
  pngSignature,
  redPixelPng,
} from './images.test-support'
import { ScreenshotIntake } from './screenshot-intake'

/** The model of feedback with the dialog open, and a new intake of its app. */
async function openFeedback() {
  const fixture = feedbackFixture()
  await fixture.model.open(feedbackLocation)
  return { ...fixture, intake: new ScreenshotIntake(fixture.app) }
}

function file(content: BlobPart, name: string): File {
  return new File([content], name)
}

describe('the screenshot intake of the Feedback dialog', () => {
  test('takes the files of picks that overlap one at a time, in their order, so the limit takes the screenshot that reaches 7,000,000 bytes and refuses the next one', async () => {
    const { model, intake } = await openFeedback()
    const first = intake.add([file(pngOfSize(4_000_000), 'first.png')])
    const second = intake.add([
      file(pngOfSize(3_000_000), 'second.png'),
      file(pngOfSize(100), 'third.png'),
    ])
    const waiting = intake.state.get().pending
    await Promise.all([first, second])
    expect({
      waiting,
      state: intake.state.get(),
      screenshots: model.state
        .get()
        .draft.screenshots.map(({ name, sizeBytes }) => [name, sizeBytes]),
    }).toEqual({
      waiting: 3,
      state: {
        pending: 0,
        refused: [{ name: 'third.png', reason: 'too-large' }],
      },
      screenshots: [
        ['first.png', 4_000_000],
        ['second.png', 3_000_000],
      ],
    })
  })

  test('adds each image without its metadata, refuses a file of another type and a damaged image, and keeps the text and the screenshots around them', async () => {
    const { model, intake } = await openFeedback()
    model.setText('The terminal closes.')
    const pixels = pngChunk('IDAT', bytes(1, 2, 3))
    const end = pngChunk('IEND', '')
    const located = bytes(
      pngSignature,
      pngHeader(),
      pngChunk('tEXt', 'Location\u0000Acacia Avenue'),
      pixels,
      end,
    )
    const cut = bytes(pngSignature, pngHeader(), bytes(0, 0, 1, 0), 'IDAT')
    await intake.add([file(located, 'before.png')])
    await intake.add([
      file('%PDF-1.7', 'notes.pdf'),
      file(cut, 'cut.png'),
      file(redPixelPng(), 'after.png'),
    ])
    const { draft } = model.state.get()
    expect({
      text: draft.text,
      names: draft.screenshots.map(({ name }) => name),
      before: draft.screenshots[0]?.content,
      refused: intake.state.get().refused,
    }).toEqual({
      text: 'The terminal closes.',
      names: ['before.png', 'after.png'],
      before: Buffer.from(
        bytes(pngSignature, pngHeader(), pixels, end),
      ).toString('base64'),
      refused: [
        { name: 'notes.pdf', reason: 'other-type' },
        { name: 'cut.png', reason: 'other-type' },
      ],
    })
  })

  test('drops the files that wait when another person signs in, so no file reaches the draft of the next person', async () => {
    const { app, model, intake } = await openFeedback()
    const taking = intake.add([file(redPixelPng(), 'mine.png')])
    app.boot.set({ state: 'ready', user: { ...fakeUser, id: 'next-person' } })
    await taking
    expect({
      state: intake.state.get(),
      screenshots: model.state.get().draft.screenshots,
    }).toEqual({ state: { pending: 0, refused: [] }, screenshots: [] })
  })
})
