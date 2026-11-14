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

function attachedTurn(agent: Agent, imageSizeBytes = 12) {
  const command = turn('attachments', 'alice', agent)
  command.message.attachments = [
    {
      id: 'image',
      name: 'Screenshot.PNG',
      path: null,
      kind: 'image',
      mediaType: 'image/png',
      sizeBytes: imageSizeBytes,
    },
    {
      id: 'pdf',
      name: 'Plan "A".PDF',
      path: null,
      kind: 'file',
      mediaType: 'application/pdf',
      sizeBytes: 23,
    },
  ]
  command.attachments = [
    {
      attachmentId: 'pdf',
      path: '/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf',
    },
    {
      attachmentId: 'image',
      path: '/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png',
    },
  ]
  const options: ProviderOptions = {
    cwd: '/test/repository',
    home: '/test/home',
    sessionId: command.sessionId,
    endpoint: `${fakeToolContext.machineOrigin}/v1/model/${agent}`,
    credential: { type: 'gateway', ...command.credential },
    commitAuthor: null,
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
    'Sender: @alice [member ID: "alice"]\n\nChange the file.\n' +
      'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer.\n' +
      'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf","sizeBytes":23}\n' +
      'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png","sizeBytes":12}',
  )
})

it('gives Codex original metadata and image input at exactly 25 MB', async () => {
  const { command, options } = attachedTurn('codex', 25_000_000)
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
          text: 'Sender: @alice [member ID: "alice"]\n\nChange the file.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer. Only an image that comes right after its file line is also in this message.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf","sizeBytes":23}',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png","sizeBytes":25000000}',
          text_elements: [],
        },
        {
          type: 'localImage',
          path: '/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png',
        },
      ],
    },
  })
  command.message.attachments = command.message.attachments.filter(
    (attachment) => attachment.kind === 'file',
  )
  command.attachments = command.attachments.filter(
    (attachment) => attachment.attachmentId === 'pdf',
  )
  await provider.send(command)
  expect(
    servers.latest.writes.find((write) => write.method === 'turn/steer'),
  ).toMatchObject({
    params: {
      input: [
        {
          type: 'text',
          text: 'Sender: @alice [member ID: "alice"]\n\nChange the file.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf","sizeBytes":23}',
          text_elements: [],
        },
      ],
    },
  })
  const branchCommand = attachedTurn('codex').command
  await provider.send({
    ...branchCommand,
    message: {
      ...branchCommand.message,
      id: 'attachment-with-current-branches',
    },
    branches: { workspaceBranch: 'owner/next', targetBranch: 'trunk' },
  })
  expect(
    servers.latest.writes.findLast((write) => write.method === 'turn/steer'),
  ).toMatchObject({
    params: {
      input: [
        {
          type: 'text',
          text: 'Sender: @alice [member ID: "alice"]\nCurrent branches: workspace "owner/next"; target "trunk".\n\nChange the file.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer. Only an image that comes right after its file line is also in this message.',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf","sizeBytes":23}',
          text_elements: [],
        },
        {
          type: 'text',
          text: 'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png","sizeBytes":12}',
          text_elements: [],
        },
        {
          type: 'localImage',
          path: '/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png',
        },
      ],
    },
  })
})

it.each([false, true])(
  'gives Codex a file line above 25 MB, with small image input: %s',
  async (withSmallImage) => {
    const { command, options } = attachedTurn('codex', 25_000_001)
    if (withSmallImage) {
      command.message.attachments = [
        ...command.message.attachments,
        {
          id: 'small-image',
          name: 'Small.PNG',
          path: null,
          kind: 'image',
          mediaType: 'image/png',
          sizeBytes: 12,
        },
      ]
      command.attachments = [
        ...command.attachments,
        { attachmentId: 'small-image', path: '/test/repository/small.png' },
      ]
    }
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
            text: 'Sender: @alice [member ID: "alice"]\n\nChange the file.',
            text_elements: [],
          },
          {
            type: 'text',
            text:
              'The sender attached these files. Read each file, or the parts of a large file that you need, before you answer.' +
              (withSmallImage
                ? ' Only an image that comes right after its file line is also in this message.'
                : ''),
            text_elements: [],
          },
          {
            type: 'text',
            text: 'Attached file: {"name":"Plan \\"A\\".PDF","mediaType":"application/pdf","path":"/test/repository/.context/attachments/11111111111111111111111111111111/Plan-A.pdf","sizeBytes":23}',
            text_elements: [],
          },
          {
            type: 'text',
            text: 'Attached file: {"name":"Screenshot.PNG","mediaType":"image/png","path":"/test/repository/.context/attachments/22222222222222222222222222222222/Screenshot.png","sizeBytes":25000001}',
            text_elements: [],
          },
          ...(withSmallImage
            ? [
                {
                  type: 'text',
                  text: 'Attached file: {"name":"Small.PNG","mediaType":"image/png","path":"/test/repository/small.png","sizeBytes":12}',
                  text_elements: [],
                },
                { type: 'localImage', path: '/test/repository/small.png' },
              ]
            : []),
        ],
      },
    })
  },
)
