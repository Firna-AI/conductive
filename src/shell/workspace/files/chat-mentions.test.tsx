// @vitest-environment happy-dom

import { useEffect } from 'react'
import { expect, it, vi } from 'vitest'
import type { ChatMentions } from '../../../chat/mentions/MentionsContext'
import { FakeSkills } from '../../../chat/mentions/skills-test-kit'
import { filesFor, testNavigation } from '../../../files/files-test-kit'
import { pictureReply } from '../../../files/page/picture-reads.test-support'
import { FakeApiServer } from '../../../test-support/fake-api'
import { mount } from '../../../test-support/mount'
import { useMentions } from './chat-mentions'

it('offers one kept picture reader only while the sandbox runs', async () => {
  const files = filesFor(new FakeApiServer())
  const readFile = vi
    .spyOn(files.client, 'readFile')
    .mockResolvedValue(pictureReply('shot.png'))
  const navigation = testNavigation()
  const skillTabs = { open: () => undefined, href: () => '' }
  let current: ChatMentions | undefined
  function Probe(props: { context: Parameters<typeof useMentions>[0] }) {
    const mentions = useMentions(props.context, files, navigation, skillTabs)
    useEffect(() => {
      current = mentions
    }, [mentions])
    return null
  }
  const ready: Parameters<typeof useMentions>[0] = {
    skills: new FakeSkills(),
    viewport: 'desktop',
    sandbox: 'ready',
    panel: null,
    resumingAtOpen: false,
  }
  const view = await mount(<Probe context={ready} />)
  const pictures = current?.pictures
  expect(pictures).toEqual({ read: expect.any(Function) })
  expect(
    await pictures?.read('shot.png', new AbortController().signal),
  ).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })

  const unavailable: Parameters<typeof useMentions>[0][] = [
    { ...ready, sandbox: 'stopped', panel: { problem: 'stopped' } },
    { ...ready, sandbox: 'starting', panel: { problem: 'starting' } },
    {
      ...ready,
      sandbox: 'error',
      panel: { problem: 'error', message: 'Start failed', firstStart: false },
    },
    { ...ready, panel: { problem: 'refused', reason: 'Start refused' } },
    { ...ready, resumingAtOpen: true },
  ]
  for (const context of unavailable) {
    await view.rerender(<Probe context={context} />)
    expect(current?.pictures, JSON.stringify(context)).toBeUndefined()
  }
  await view.rerender(null)
  await view.rerender(<Probe context={{ ...ready, viewport: 'phone' }} />)
  expect(current?.pictures).toBe(pictures)
  expect(
    await current?.pictures?.read('shot.png', new AbortController().signal),
  ).toEqual({ status: 'picture', address: 'data:image/png;base64,AA==' })
  expect(readFile).toHaveBeenCalledTimes(1)
})
