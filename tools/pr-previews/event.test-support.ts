import { afterEach, expect, vi } from 'vitest'
import { commentPreview } from './comment.ts'
import { deletePreview } from './delete.ts'
import { deployPreview } from './deploy.ts'
import { fakeContext } from './operations.test-support.ts'

const fileMocks = vi.hoisted(() => ({
  appendFile: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
export const files = fileMocks
vi.mock('node:fs/promises', () => fileMocks)
vi.mock('./deploy.ts', () => ({ deployPreview: vi.fn() }))
vi.mock('./delete.ts', () => ({ deletePreview: vi.fn() }))
vi.mock('./comment.ts', () => ({ commentPreview: vi.fn() }))
afterEach(() => vi.resetAllMocks())

export const sha = 'a'.repeat(40)
export const output = {
  marketingUrl: 'https://pr-123.preview.example',
  appUrl: 'https://pr-123-app.preview.example',
  dataReset: true,
  registryRegistered: true,
}
export const inputs = [
  '--pr',
  '123',
  '--action',
  'synchronize',
  '--sha',
  sha,
  '--wrangler',
  '/trusted/wrangler',
  '--build-folder',
  '/artifact',
  '--runner-url',
  'https://runner.preview.example/runner.tar.gz',
  '--runner-sha256',
  'b'.repeat(64),
]

export function event(state: 'open' | 'closed', head = sha) {
  const fake = fakeContext()
  fake.http.mockImplementation(async () =>
    Response.json({ state, head: { sha: head } }),
  )
  files.mkdtemp.mockResolvedValue('/runner-temp/event-delete')
  vi.mocked(deployPreview).mockResolvedValue(output)
  vi.mocked(deletePreview).mockResolvedValue(undefined)
  vi.mocked(commentPreview).mockResolvedValue('updated')
  const environment: typeof fake.ctx.environment = {
    ...fake.ctx.environment,
    GITHUB_OUTPUT: '/runner-output',
  }
  return {
    ...fake,
    environment,
  }
}

export function noChanges() {
  expect(deployPreview).not.toHaveBeenCalled()
  expect(deletePreview).not.toHaveBeenCalled()
  expect(commentPreview).not.toHaveBeenCalled()
  expect(files.mkdtemp).not.toHaveBeenCalled()
}
