import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, expect, it, onTestFinished } from 'vitest'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { instructionProviders } from '../../test-support/instructions'
import { claudeProjectFolder, moveClaudeTranscript } from './claude-transcript'
import { claudeConfigDirectory } from './environment'

beforeEach(mockComputerServer)
const id = '01a1d575-8440-7d01-a37c-c9249c1fb038'
const oldFolder = '/home/user/code/storefront'
const newFolder = '/home/user/code/billing.service'

async function config(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'conductive-claude-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  return root
}

async function save(root: string, cwd: string, companion = true) {
  const folder = join(root, 'projects', claudeProjectFolder(cwd))
  await mkdir(companion ? join(folder, id) : folder, { recursive: true })
  await writeFile(join(folder, `${id}.jsonl`), `{"cwd":"${cwd}"}\n`)
  if (companion) await writeFile(join(folder, id, 'tool-result.txt'), 'kept')
}

const files = (root: string, cwd: string) =>
  readdir(join(root, 'projects', claudeProjectFolder(cwd))).then(
    (names) => names.sort(),
    () => [],
  )

it('names the project folder as Claude does', () => {
  expect(claudeProjectFolder('/home/user/code/remote-code')).toBe(
    '-home-user-code-remote-code',
  )
  expect(claudeProjectFolder(newFolder)).toBe('-home-user-code-billing-service')
})

it('moves the transcript and its folder into the project of the new folder', async () => {
  const root = await config()
  const warnings: string[] = []
  await save(root, oldFolder)
  await moveClaudeTranscript(root, newFolder, id, (w) => warnings.push(w))
  expect(await files(root, newFolder)).toEqual([id, `${id}.jsonl`])
  expect(await files(root, oldFolder)).toEqual([])
  expect(
    await readdir(join(root, 'projects', claudeProjectFolder(newFolder), id)),
  ).toEqual(['tool-result.txt'])
  await moveClaudeTranscript(root, newFolder, id, (w) => warnings.push(w))
  await moveClaudeTranscript(root, oldFolder, id, (w) => warnings.push(w))
  expect(await files(root, oldFolder)).toEqual([id, `${id}.jsonl`])
  expect(warnings).toEqual([])
})

it('keeps a transcript that is already in place, missing, or ambiguous', async () => {
  const root = await config()
  const warnings: string[] = []
  await moveClaudeTranscript(root, newFolder, id, (w) => warnings.push(w))
  await save(root, oldFolder)
  await save(root, newFolder, false)
  await moveClaudeTranscript(root, newFolder, id, (w) => warnings.push(w))
  expect(await files(root, oldFolder)).toEqual([id, `${id}.jsonl`])
  await rm(join(root, 'projects', claudeProjectFolder(newFolder)), {
    recursive: true,
  })
  await save(root, '/home/user/code/other')
  await moveClaudeTranscript(root, newFolder, id, (w) => warnings.push(w))
  await moveClaudeTranscript(root, newFolder, '../escape', (w) =>
    warnings.push(w),
  )
  expect(await files(root, newFolder)).toEqual([])
  expect(warnings).toEqual([
    'The saved Claude session exists in more than one project folder.',
  ])
})

it('moves the saved session before Claude resumes it in the new folder', async () => {
  const h = await providerFixture('claude')
  const root = claudeConfigDirectory(h.home)
  await save(root, oldFolder)
  const adapter = instructionProviders('claude')
  const provider = await adapter.open({
    ...h.options,
    cwd: newFolder,
    conversationId: id,
  })
  onTestFinished(() => provider.close())
  expect(adapter.conversationId()).toBe(id)
  expect(adapter.parameters()?.cwd).toBe(newFolder)
  expect(await files(root, newFolder)).toEqual([id, `${id}.jsonl`])
})
