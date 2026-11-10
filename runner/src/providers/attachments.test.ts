import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import type { Agent } from '../../../src/shared/agents'
import { FakeAppServers } from '../../test-support/app-server'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { turn } from '../../test-support/harness'
import { fakeToolContext } from '../../test-support/providers'
import { agentInstructions } from '../instructions'
import { createClaudeFactory } from './claude'
import { createCodexFactory } from './codex'
import * as environment from './environment'
import type { ProviderOptions } from './types'

beforeEach(() => {
  mockComputerServer()
  const prepare = vi
    .spyOn(environment, 'prepareProviderHome')
    .mockResolvedValue()
  onTestFinished(() => prepare.mockRestore())
})

function attachedTurn(agent: Agent) {
  const command = turn('attachments', 'alice', agent)
  command.message.attachments = [
    {
      id: 'image',
      name: 'Screenshot.PNG',
      kind: 'image',
      mediaType: 'image/png',
      sizeBytes: 12,
    },
    {
      id: 'pdf',
      name: 'Plan "A".PDF',
      kind: 'file',
      mediaType: 'application/pdf',
      sizeBytes: 23,
    },
  ]
  command.attachments = [
    { attachmentId: 'pdf', path: '/home/user/.conductive-attachment-pdf.pdf' },
    {
      attachmentId: 'image',
      path: '/home/user/.conductive-attachment-image.png',
    },
  ]
  const options: ProviderOptions = {
    cwd: '/test/repository',
    home: '/test/home',
    sessionId: command.sessionId,
    endpoint: `${fakeToolContext.machineOrigin}/v1/model/${agent}`,
    credential: { type: 'gateway', ...command.credential },
    choice: command.message.choice,
    conversationId: null,
    instructions: agentInstructions({
      cwd: '/test/repository',
      defaultBranch: 'main',
    })[agent],
    tools: fakeToolContext,
    event: () => {},
    warn: () => {},
  }
  return { command, options }
}

it('gives Claude original attachment metadata and copied paths', async () => {
  const { command, options } = attachedTurn('claude')
  const sdk = new FakeClaudeQuery()
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/fake/claude',
    async () => ({
      directory: '/test/home/.conductive/anthropic',
      name: 'session-attachments',
      remove: async () => {},
    }),
  )(options)
  onTestFinished(() => provider.close())
  await provider.send(command)
  expect((await sdk.nextUser()).message.content).toBe(
    'Sender: @alice\n\nChange the file.\n' +
      'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/home/user/.conductive-attachment-pdf.pdf"}\n' +
      'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/home/user/.conductive-attachment-image.png"}',
  )
})

it('gives Codex original attachment metadata and keeps local image inputs', async () => {
  const { command, options } = attachedTurn('codex')
  const servers = new FakeAppServers()
  const provider = await createCodexFactory(servers.start)(options)
  onTestFinished(() => provider.close())
  await provider.send(command)
  expect(
    servers.latest.writes.find((write) => write.method === 'turn/start'),
  ).toMatchObject({
    params: {
      input: [
        {
          type: 'text',
          text: 'Sender: @alice\n\nChange the file.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/home/user/.conductive-attachment-pdf.pdf"}',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/home/user/.conductive-attachment-image.png"}',
          text_elements: [],
        },
        {
          type: 'localImage',
          path: '/home/user/.conductive-attachment-image.png',
        },
      ],
    },
  })
})
