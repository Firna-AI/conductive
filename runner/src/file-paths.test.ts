import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'

it('reads and diffs literal file names with tabs, newlines, and backslashes', async () => {
  const h = await runnerHarness()
  const paths = ['tab\tname.txt', 'line\nname.txt', 'back\\slash.txt']
  for (const path of paths) {
    await h.write(path, 'new\n')
    h.endpoint.send({
      type: 'file.read',
      requestId: `read-${path}`,
      path,
      maxBytes: 4,
    })
    h.endpoint.send({
      type: 'file.diff',
      requestId: `diff-${path}`,
      path,
      defaultBranch: 'main',
    })
  }
  await h.runner.idle()
  for (const path of paths) {
    expect(
      h.endpoint.fileResponses.find(
        (response) => response.requestId === `read-${path}`,
      ),
    ).toMatchObject({
      type: 'file.read.result',
      result: { ok: true, file: { path, sizeBytes: 4, content: 'new\n' } },
    })
    expect(
      h.endpoint.fileResponses.find(
        (response) => response.requestId === `diff-${path}`,
      ),
    ).toMatchObject({
      type: 'file.diff.result',
      result: {
        ok: true,
        diff: { path, oldContent: null, newContent: 'new\n', binary: false },
      },
    })
  }
})

it('refuses NUL and empty, dot, and dotdot path segments before reads and diffs', async () => {
  const h = await runnerHarness()
  await h.write('dir/file.txt', 'nested\n')
  const paths = [
    '',
    'nul\0.txt',
    '/README.md',
    'dir//file.txt',
    './README.md',
    'dir/./file.txt',
    'dir/../README.md',
    'README.md/',
    '.',
    '..',
    '.git/config',
    'dir/.git/config',
  ]
  for (const [index, path] of paths.entries()) {
    h.endpoint.send({
      type: 'file.read',
      requestId: `read-${index}`,
      path,
      maxBytes: 100,
    })
    h.endpoint.send({
      type: 'file.diff',
      requestId: `diff-${index}`,
      path,
      defaultBranch: 'main',
    })
  }
  await h.runner.idle()
  for (const [index, path] of paths.entries()) {
    for (const type of ['read', 'diff']) {
      expect(
        h.endpoint.fileResponses.find(
          (response) => response.requestId === `${type}-${index}`,
        ),
        `${type} ${JSON.stringify(path)}`,
      ).toEqual({
        type: `file.${type}.result`,
        requestId: `${type}-${index}`,
        result: {
          ok: false,
          error: {
            code: 'file_unavailable',
            message: 'The file cannot be read.',
          },
        },
      })
    }
  }
})
