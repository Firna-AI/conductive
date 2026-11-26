import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { duringTurn, turn } from '../../test-support/input'
import { skillProviders } from '../../test-support/skill-providers'

beforeEach(mockComputerServer)

const sender = 'Sender: @alice [member ID: "alice"]'

it('starts a Claude message with an org skill text, as for a skill of the repository', async () => {
  const h = await skillProviders('claude')
  await h.write(
    'skills/finish-work/SKILL.md',
    '---\nname: finish-work\ndescription: Commit and push.\ndisable-model-invocation: true\n---\nFinish.\n',
  )
  await h.skill('skills/review', 'review')
  await h.skill('skills/clash', 'clash')
  await h.skill('.claude/skills/clash', 'clash', 'Workspace', h.options.cwd)
  const provider = await h.open()
  onTestFinished(() => provider.close())
  const texts = ['/finish-work now', '/review', '/clash', '/unknown']
  const contents: unknown[] = []
  for (const [index, text] of texts.entries()) {
    const message = index === 0 ? h.command : duringTurn(turn(`${index}`))
    message.message.text = text
    await provider.send(message)
    contents.push((await h.sdk()?.nextUser())?.message.content)
  }
  expect(contents).toEqual([
    `/finish-work now\n\n${sender}`,
    `/review\n\n${sender}`,
    `/clash\n\n${sender}`,
    `${sender}\n\n/unknown`,
  ])
})
