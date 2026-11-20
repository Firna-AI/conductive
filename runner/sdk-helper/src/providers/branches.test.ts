import { beforeEach, expect, it, onTestFinished } from 'vitest'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { duringTurn, turn } from '../../test-support/input'
import { instructionProviders } from '../../test-support/instructions'

beforeEach(mockComputerServer)
const original = { workspaceBranch: 'owner/old', targetBranch: 'main' }
const current = { workspaceBranch: 'owner/new', targetBranch: 'trunk' }
const fixed =
  'Fixed instructions.\n\nWorkspace branch: "owner/old"\n\nTarget branch: "main"'

/** The Codex input of the text "Change the file." with its sender lines. */
function codexInput(footer: string) {
  return [
    { type: 'text', text: 'Change the file.', text_elements: [] },
    { type: 'text', text: footer, text_elements: [] },
  ]
}

it.each(['claude', 'codex'] as const)(
  'keeps %s fixed instructions and adds changed branch context only to input',
  async (agent) => {
    const h = await providerFixture(agent)
    const adapter = instructionProviders(agent)
    const provider = await adapter.open({
      ...h.options,
      instructions: fixed,
      instructionBranches: original,
      conversationId: 'saved-conversation',
    })
    onTestFinished(() => provider.close())
    const first = { ...turn('continued', 'bob', agent), branches: current }
    const unchanged = structuredClone(first)
    await provider.send(first)
    expect(adapter.prompt()).toBe(fixed)
    expect(adapter.conversationId()).toBe('saved-conversation')
    const footer =
      'Sender: @bob [member ID: "bob"]\nCurrent branches: workspace "owner/new"; target "trunk".'
    expect(await adapter.input()).toMatchObject(
      agent === 'claude'
        ? { role: 'user', content: `Change the file.\n\n${footer}` }
        : { input: codexInput(footer) },
    )
    expect(first).toEqual(unchanged)
  },
)

it.each(['claude', 'codex'] as const)(
  'omits unchanged %s branches and includes a target change during a turn',
  async (agent) => {
    const h = await providerFixture(agent)
    const adapter = instructionProviders(agent)
    const provider = await adapter.open({
      ...h.options,
      instructions: fixed,
      instructionBranches: original,
    })
    onTestFinished(() => provider.close())
    await provider.send({ ...h.command, branches: original })
    const footer = 'Sender: @alice [member ID: "alice"]'
    expect(await adapter.input()).toMatchObject(
      agent === 'claude'
        ? { content: `Change the file.\n\n${footer}` }
        : { input: codexInput(footer) },
    )
    await provider.send({
      ...duringTurn(turn('during', 'bob', agent)),
      turnId: h.command.turnId,
      branches: { ...original, targetBranch: 'trunk' },
    })
    const changed =
      'Sender: @bob [member ID: "bob"]\nCurrent branches: workspace "owner/old"; target "trunk".'
    expect(await adapter.input(true)).toMatchObject(
      agent === 'claude'
        ? { content: `Change the file.\n\n${changed}` }
        : { input: codexInput(changed) },
    )
    expect(adapter.prompt()).toBe(fixed)
  },
)

const repository = {
  fullName: 'acme/billing',
  folder: '/home/user/code/billing',
}

it.each(['claude', 'codex'] as const)(
  'adds the %s repository line before the branch line for an earlier folder',
  async (agent) => {
    const h = await providerFixture(agent)
    const adapter = instructionProviders(agent)
    const provider = await adapter.open({
      ...h.options,
      instructions: fixed,
      instructionBranches: original,
      instructionFolder: '/home/user/code/storefront',
    })
    onTestFinished(() => provider.close())
    await provider.send({ ...h.command, branches: current, repository })
    const footer =
      'Sender: @alice [member ID: "alice"]\nCurrent repository: "acme/billing" in the folder "/home/user/code/billing". The workspace now works in this folder. Its context folder is "/home/user/code/billing/.context".\nCurrent branches: workspace "owner/new"; target "trunk".'
    expect(await adapter.input()).toMatchObject(
      agent === 'claude'
        ? { content: `Change the file.\n\n${footer}` }
        : { input: codexInput(footer) },
    )
    expect(adapter.prompt()).toBe(fixed)
  },
)

it.each([
  ['the current folder', repository.folder, repository],
  ['an unknown folder', null, repository],
  ['no current repository', '/home/user/code/storefront', undefined],
] as const)('omits the repository line for %s', async (_, folder, current) => {
  const h = await providerFixture('claude')
  const adapter = instructionProviders('claude')
  const provider = await adapter.open({
    ...h.options,
    instructions: fixed,
    instructionBranches: original,
    instructionFolder: folder,
  })
  onTestFinished(() => provider.close())
  await provider.send({
    ...h.command,
    branches: original,
    ...(current ? { repository: current } : {}),
  })
  expect(await adapter.input()).toMatchObject({
    content: 'Change the file.\n\nSender: @alice [member ID: "alice"]',
  })
})
