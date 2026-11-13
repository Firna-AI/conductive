import { expect, it } from 'vitest'
import type { RunnerFileEvent } from '../../src/shared/generated/RunnerFileEvent'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import { repositoryFixture } from '../test-support/repository'
import { FileReporter } from './files'
import { Repository } from './repository'

async function fileReports(secrets: string[]) {
  const repository = await repositoryFixture()
  const sanitizer = new OutputSanitizer()
  for (const secret of secrets) sanitizer.add(secret)
  const events: RunnerFileEvent[] = []
  const files = new FileReporter(
    new Repository(repository.root, () => undefined),
    'main',
    async (event) => {
      events.push(event)
    },
    { prepare: (event) => sanitizer.fileReport(event) },
  )
  return { ...repository, files, events }
}

it('opens and diffs a reported file when its path contains a marked secret', async () => {
  const f = await fileReports(['a'])
  await f.write('package.json', 'plain file\n')
  await f.files.refresh(true)
  const report = f.events.find((event) => event.type === 'files.snapshot')
  const entry = report?.tree.entries.find(
    (entry) => entry.name === 'p[redacted]ck[redacted]ge.json',
  )
  if (!entry) throw new Error('Expected the masked file label.')
  expect(
    await f.files.request({
      type: 'file.read',
      requestId: 'read',
      path: entry.path,
      maxBytes: 100,
    }),
  ).toMatchObject({
    type: 'file.read.result',
    result: {
      ok: true,
      file: { path: 'package.json', content: 'plain file\n' },
    },
  })
  expect(entry).toMatchObject({
    path: 'package.json',
    displayPath: 'p[redacted]ck[redacted]ge.json',
  })
  const changes = f.events.find((event) => event.type === 'changes.updated')
  if (!changes) throw new Error('Expected branch changes.')
  expect(
    await f.files.request({
      type: 'file.diff',
      requestId: 'diff',
      path: entry.path,
      defaultBranch: changes.changes.baseBranch,
    }),
  ).toMatchObject({
    type: 'file.diff.result',
    result: {
      ok: true,
      diff: {
        path: 'package.json',
        baseBranch: 'main',
        newContent: 'plain file\n',
      },
    },
  })
})

it('keeps two operational file paths distinct when their display labels match', async () => {
  const f = await fileReports(['1', '2'])
  await f.write('test1.ts', 'first\n')
  await f.write('test2.ts', 'second\n')
  await f.files.refresh(true)
  const report = f.events.find((event) => event.type === 'files.snapshot')
  const entries = report?.tree.entries.filter(
    (entry) => entry.name === 'test[redacted].ts',
  )
  expect(entries?.map((entry) => entry.path)).toEqual(['test1.ts', 'test2.ts'])
  expect(entries?.map((entry) => entry.displayPath)).toEqual([
    'test[redacted].ts',
    'test[redacted].ts',
  ])
  const results = await Promise.all(
    (entries ?? []).map((entry) =>
      f.files.request({
        type: 'file.read',
        requestId: entry.path,
        path: entry.path,
        maxBytes: 100,
      }),
    ),
  )
  expect(results).toMatchObject([
    { result: { ok: true, file: { path: 'test1.ts', content: 'first\n' } } },
    { result: { ok: true, file: { path: 'test2.ts', content: 'second\n' } } },
  ])
})
