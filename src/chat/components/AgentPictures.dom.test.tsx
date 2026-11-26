// @vitest-environment happy-dom

import { expect, test } from 'vitest'
import { fakeDecoder } from '../../files/page/picture-test-kit'
import { press } from '../../test-support/mount'
import {
  fakeNearView,
  fakeReader,
  imagesIn,
  mountPictures,
  shotAddress,
} from '../links/picture-test-kit'
import { AgentText } from './AgentText'
import { MessageLine } from './MessageLine'

test('an answer shows the picture in a paragraph and a list item, and keeps the link in a heading and a table cell', async () => {
  fakeNearView()
  const { reader } = fakeReader()
  const text = [
    '## Phone ![Heading shot](shots/after.png)',
    '',
    'See ![Paragraph shot](shots/after.png).',
    '',
    '- ![Item shot](shots/after.png)',
    '',
    '| Shot |',
    '| --- |',
    '| ![Cell shot](shots/after.png) |',
  ].join('\n')
  const view = await mountPictures(
    <AgentText id="agent:turn-1:answer-1" text={text} />,
    reader,
  )
  expect(imagesIn(view.container)).toEqual([
    { name: 'Heading shot', shows: 'link', in: 'H2', title: 'shots/after.png' },
    { name: 'Paragraph shot', shows: 'box', in: 'P', title: 'shots/after.png' },
    { name: 'Item shot', shows: 'box', in: 'LI', title: 'shots/after.png' },
    { name: 'Cell shot', shows: 'link', in: 'TD', title: 'shots/after.png' },
  ])
})

test('an answer shows the picture in a quote, as in the paragraph that the quote holds', async () => {
  fakeNearView()
  const { reader } = fakeReader()
  const view = await mountPictures(
    <AgentText
      id="agent:turn-1:answer-1"
      text="> Before the fix: ![Quote shot](shots/before.png)"
    />,
    reader,
  )
  const quote = view.container.querySelector('blockquote')
  if (!quote) throw new Error('The answer has no quote')
  expect(imagesIn(quote)).toEqual([
    { name: 'Quote shot', shows: 'box', in: 'P', title: 'shots/before.png' },
  ])
})

// happy-dom toggles a `<details>` for each click in its summary that no
// listener inside the details prevents, also a click on a link, which a
// browser leaves to the link. So the browser smoke test checks that a press
// on the picture keeps the line open.
test('a closed message line shows the link, and the open line shows the picture, which a press opens', async () => {
  const near = fakeNearView()
  const decoded = fakeDecoder()
  const pictures = fakeReader()
  const message = 'agent:turn-1:plan-1'
  const view = await mountPictures(
    <MessageLine
      id={message}
      text="The list covers the field: ![Phone before](shots/before.png)"
    />,
    pictures.reader,
  )
  const line = view.container.querySelector('summary')
  if (!line) throw new Error('The message has no line')
  const closed = {
    images: imagesIn(view.container),
    watched: near.observers.length,
  }
  await press(line)
  near.come()
  await pictures.answer(0, { status: 'picture', address: shotAddress })
  decoded[0]?.draw(390, 844)
  const open = imagesIn(view.container)
  const picture = line.querySelector('a')
  if (!picture) throw new Error('No picture shows')
  await press(picture)
  expect({
    closed,
    open,
    asked: pictures.asked(),
    opened: view.opened,
  }).toEqual({
    closed: {
      images: [
        {
          name: 'Phone before',
          shows: 'link',
          in: 'SUMMARY',
          title: 'shots/before.png',
        },
      ],
      watched: 0,
    },
    open: [
      {
        name: 'Phone before',
        shows: 'picture',
        in: 'SUMMARY',
        title: 'shots/before.png',
      },
    ],
    asked: [{ path: 'shots/before.png', message }],
    opened: ['shots/before.png'],
  })
})
