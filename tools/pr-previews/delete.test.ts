import { expect, it } from 'vitest'
import { deletePreview } from './delete.ts'
import { scenario } from './scenario.test-support.ts'

it('deletes in order across Boat pages and accepts missing keys, resources, Worker, and routes', async () => {
  const { ctx, trace, http, command } = scenario({ database: true })
  await deletePreview(ctx, 123)
  expect(trace).toEqual([
    'registry:find',
    'registry:remove',
    'database:list',
    'resources:known-tables',
    'resources:orgs',
    'resources:tables',
    'resources:snapshots',
    'resources:builds',
    'sandbox:list',
    'sandbox:delete:box-a',
    'sandbox:list',
    'sandbox:delete:box-b',
    'snapshot:delete:stored-snapshot',
    'snapshot:delete:image-me',
    'storage:auth',
    'attachments:delete',
    'worker:delete',
    'zone:list',
    'routes:list',
    'route:delete',
    'database:delete',
  ])
  const boat = http.mock.calls
    .map(([request]) => request)
    .filter((request) => new URL(request.url).hostname === 'boat.dev')
  expect(new URL(boat[0].url).searchParams.get('org')).toBe('fake-preview-org')
  expect(new URL(boat[0].url).searchParams.get('label')).toBe('org=org-a')
  expect(new URL(boat[2].url).searchParams.get('cursor')).toBe('next')
  expect(boat[1].headers.get('X-Ascii-Confirm-Delete')).toBe('box-a')
  expect(boat[1].headers.get('X-Boat-Org')).toBe('fake-preview-org')
  expect(
    command.mock.calls
      .find(([request]) => request.executable === 'aws')?.[0]
      .args.slice(0, 5),
  ).toEqual([
    's3',
    'rm',
    's3://conductive-preview-attachments/attachments/org-a/',
    '--recursive',
    '--only-show-errors',
  ])
  const worker = http.mock.calls
    .map(([request]) => request)
    .find((request) => request.url.includes('/workers/scripts/'))
  expect(worker?.url).toContain('force=true')
})

it('stops deletion after a failed Boat step and retains the database for a retry', async () => {
  const { ctx, trace } = scenario({ database: true, cleanupFailure: true })
  await expect(deletePreview(ctx, 123)).rejects.toThrowError(
    'Boat request failed with HTTP 500.',
  )
  expect(trace).toEqual([
    'registry:find',
    'registry:remove',
    'database:list',
    'resources:known-tables',
    'resources:orgs',
    'resources:tables',
    'resources:snapshots',
    'resources:builds',
    'sandbox:list',
    'sandbox:delete:box-a',
  ])
})

it('removes leftover Worker routes when the database and registry are absent', async () => {
  const { ctx, trace } = scenario({ registryMissing: true })
  await deletePreview(ctx, 123)
  expect(trace).toEqual([
    'registry:find',
    'database:list',
    'worker:delete',
    'zone:list',
    'routes:list',
    'route:delete',
  ])
})
