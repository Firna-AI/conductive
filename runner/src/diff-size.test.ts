import { expect, it } from 'vitest'
import type { RunnerFileResponse } from '../../src/shared/generated/RunnerFileResponse'
import { FILE_READ_MAX_BYTES } from '../../src/shared/files'
import { repositoryFixture } from '../test-support/repository'
import { FileReporter } from './files'
import { Repository } from './repository'

function errorResult(response: RunnerFileResponse) {
  return response.result.ok ? { ok: true } : response.result
}

async function fixture() {
  const h = await repositoryFixture()
  const reporter = new FileReporter(
    new Repository(h.root),
    'main',
    async () => {},
  )
  return {
    ...h,
    request: () =>
      reporter.request({
        type: 'file.diff',
        requestId: 'bounded-diff',
        path: 'README.md',
        defaultBranch: 'main',
      }),
    read: () =>
      reporter.request({
        type: 'file.read',
        requestId: 'bounded-read',
        path: 'README.md',
        maxBytes: FILE_READ_MAX_BYTES * 2,
      }),
  }
}

const tooLarge = {
  ok: false,
  error: {
    code: 'file_too_large',
    message: 'The file exceeds the read limit.',
    sizeBytes: 5_242_881,
    limitBytes: 5_242_880,
  },
}

it.each(['working', 'previous'] as const)(
  'accepts a limit-sized %s diff version and rejects one extra byte',
  async (version) => {
    const h = await fixture()
    await h.write('README.md', Buffer.alloc(FILE_READ_MAX_BYTES))
    if (version === 'previous') {
      await h.git('add', 'README.md')
      await h.git('commit', '-m', 'limit-sized base')
      await h.git('update-ref', 'refs/heads/main', 'HEAD')
      await h.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
      await h.write('README.md', 'small current version\n')
    }
    const accepted = await h.request()
    expect(accepted.result).toMatchObject({ ok: true, diff: { binary: true } })
    await h.write('README.md', Buffer.alloc(FILE_READ_MAX_BYTES + 1))
    if (version === 'previous') {
      await h.git('add', 'README.md')
      await h.git('commit', '-m', 'oversized base')
      await h.git('update-ref', 'refs/heads/main', 'HEAD')
      await h.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
      await h.write('README.md', 'small current version\n')
    }
    expect(errorResult(await h.request())).toEqual(tooLarge)
  },
)

it('bounds generated patch output when both file versions meet the read limit', async () => {
  const h = await fixture()
  await h.write('README.md', 'a'.repeat(2_700_000))
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'large text base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  await h.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  await h.write('README.md', 'b'.repeat(2_700_000))
  expect(errorResult(await h.request())).toEqual(tooLarge)
})

it('keeps the file-read cap when a caller supplies a larger limit', async () => {
  const h = await fixture()
  await h.write('README.md', Buffer.alloc(FILE_READ_MAX_BYTES + 1))
  expect(errorResult(await h.read())).toEqual(tooLarge)
})
