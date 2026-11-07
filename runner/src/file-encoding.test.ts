import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'

it('reads a leading UTF-8 BOM as content with its original six bytes', async () => {
  const h = await runnerHarness()
  await h.write('bom.txt', Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x62, 0x63]))
  h.endpoint.send({
    type: 'file.read',
    requestId: 'bom-read',
    path: 'bom.txt',
    maxBytes: 6,
  })
  await h.runner.idle()
  expect(h.endpoint.fileResponses).toEqual([
    {
      type: 'file.read.result',
      requestId: 'bom-read',
      result: {
        ok: true,
        file: {
          path: 'bom.txt',
          mediaType: 'text/plain',
          sizeBytes: 6,
          encoding: 'utf-8',
          content: '\uFEFFabc',
        },
      },
    },
  ])
})

it('retains a leading UTF-8 BOM in both sides of a file diff', async () => {
  const h = await runnerHarness()
  await h.write('bom.txt', '\uFEFFabc')
  await h.git('add', 'bom.txt')
  await h.git('commit', '-m', 'BOM base')
  await h.git('update-ref', 'refs/heads/main', 'HEAD')
  await h.write('bom.txt', '\uFEFFxyz')
  h.endpoint.send({
    type: 'file.diff',
    requestId: 'bom-diff',
    path: 'bom.txt',
    defaultBranch: 'main',
  })
  await h.runner.idle()
  expect(h.endpoint.fileResponses).toEqual([
    {
      type: 'file.diff.result',
      requestId: 'bom-diff',
      result: {
        ok: true,
        diff: {
          path: 'bom.txt',
          baseBranch: 'main',
          oldContent: '\uFEFFabc',
          newContent: '\uFEFFxyz',
          patch: expect.stringContaining('-\uFEFFabc\n'),
          binary: false,
        },
      },
    },
  ])
})

it('keeps invalid UTF-8 and NUL bytes binary in reads and diffs', async () => {
  const h = await runnerHarness()
  const cases = [
    { path: 'invalid.bin', bytes: [0xc3, 0x28], content: 'wyg=' },
    { path: 'nul.bin', bytes: [0x61, 0, 0x62], content: 'YQBi' },
  ]
  for (const { path, bytes } of cases) {
    await h.write(path, Buffer.from(bytes))
    h.endpoint.send({
      type: 'file.read',
      requestId: `read-${path}`,
      path,
      maxBytes: 3,
    })
    h.endpoint.send({
      type: 'file.diff',
      requestId: `diff-${path}`,
      path,
      defaultBranch: 'main',
    })
  }
  await h.runner.idle()
  for (const { path, bytes, content } of cases) {
    expect(
      h.endpoint.fileResponses.find(
        (response) => response.requestId === `read-${path}`,
      ),
    ).toEqual({
      type: 'file.read.result',
      requestId: `read-${path}`,
      result: {
        ok: true,
        file: {
          path,
          mediaType: 'application/octet-stream',
          sizeBytes: bytes.length,
          encoding: 'base64',
          content,
        },
      },
    })
    expect(
      h.endpoint.fileResponses.find(
        (response) => response.requestId === `diff-${path}`,
      ),
    ).toMatchObject({
      type: 'file.diff.result',
      result: {
        ok: true,
        diff: { oldContent: null, newContent: null, binary: true },
      },
    })
  }
})
