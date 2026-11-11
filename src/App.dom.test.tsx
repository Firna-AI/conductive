// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { App } from './App'
import { memoryNavigation } from './app/navigation'
import { routes } from './app/router'
import { redPixelPng } from './app/screenshots/images.test-support'
import { windowKeys } from './app/services'
import { testServices } from './app/test-kit'
import {
  chips,
  messageOf,
  openFeedback,
  serveFeedback,
} from './shell/feedback/feedback-test-kit'
import { settle } from './shell/test-mount'
import {
  here,
  isOff,
  org,
  recordingSocket,
} from './shell/workspace/kept-test-kit'
import { byRole } from './test-support/dom-queries'
import { FakeApiServer } from './test-support/fake-api'
import {
  draggedFiles,
  draggedText,
  dropOn,
  fireDrag,
} from './test-support/file-drop'
import { typeMessage } from './test-support/message-field'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from './test-support/mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The whole app at `href`, from its root, over the fake API. */
async function mountApp(server: FakeApiServer, href: string) {
  holdAnimationFrames()
  const navigation = memoryNavigation(href)
  const services = testServices(server, {
    events: recordingSocket(server).source,
    onKey: windowKeys(window),
  })
  const view = await mount(<App navigation={navigation} services={services} />)
  await settle()
  return { root: view.container, navigation }
}

const shot = () => new File([redPixelPng()], 'shot.png')

describe('drops of files on the app', () => {
  test('a drop of files outside each message box does nothing and keeps the page; a drag of text or of a link keeps the action of the browser; files over a message box keep its offer of a copy', async () => {
    const { root, navigation } = await mountApp(new FakeApiServer(), here)
    const field = await waitFor(
      () => root.querySelector('[aria-label="Message"]'),
      'the message field of the chat',
    )
    const outside = byRole('complementary', 'Workspaces', root)
    const files = draggedFiles([shot()], '/Users/cal/Desktop/shot.png')
    fireDrag(outside, 'dragenter', files)
    const over = fireDrag(outside, 'dragover', files)
    const offer = files.dropEffect
    const drop = fireDrag(outside, 'drop', files)
    const browserKeeps = (data: DataTransfer) => [
      fireDrag(outside, 'dragover', data).defaultPrevented,
      fireDrag(outside, 'drop', data).defaultPrevented,
    ]
    const words = browserKeeps(draggedText('Checkout'))
    const link = browserKeeps(
      draggedText('https://example.com/checkout', 'text/uri-list'),
    )
    const boxFiles = draggedFiles([shot()])
    fireDrag(field, 'dragenter', boxFiles)
    const boxOver = fireDrag(field, 'dragover', boxFiles)
    expect({
      outside: { taken: over.defaultPrevented, offer },
      dropped: drop.defaultPrevented,
      address: navigation.href(),
      words,
      link,
      box: { taken: boxOver.defaultPrevented, offer: boxFiles.dropEffect },
    }).toEqual({
      outside: { taken: true, offer: 'none' },
      dropped: true,
      address: here,
      words: [false, false],
      link: [false, false],
      box: { taken: true, offer: 'copy' },
    })
  })

  test('the Feedback dialog still takes a dropped screenshot under the drop guard of the app', async () => {
    const server = new FakeApiServer()
    serveFeedback(server)
    await mountApp(server, routes.org(org))
    const dialog = await openFeedback()
    typeMessage(messageOf(dialog), 'The terminal closes.')
    const drop = dropOn(document.body, draggedFiles([shot()]))
    // Send waits while the dialog reads a screenshot that it took.
    await waitFor(
      () => !isOff(byRole('button', 'Send', dialog)),
      'the end of the screenshot reads',
    )
    expect({ prevented: drop.defaultPrevented, chips: chips(dialog) }).toEqual({
      prevented: true,
      chips: [`shot.png${redPixelPng().length} B`],
    })
  })
})
