import { expect, it } from 'vitest'
import { databaseResources } from './resources.ts'
import { d1Reply, fakeContext } from './operations.test-support.ts'

it('collects every snapshot column and each build-derived name without duplicates', async () => {
  const { ctx, command } = fakeContext()
  command.mockImplementation(async ({ args }) => {
    const sql = args[args.indexOf('--command') + 1]
    if (sql.includes("name IN ('orgs', 'image_builds')"))
      return d1Reply([{ name: 'orgs' }, { name: 'image_builds' }])
    if (sql === 'SELECT id FROM orgs') return d1Reply([{ id: 'org-a' }])
    if (sql.includes('pragma_table_info'))
      return d1Reply([
        { name: 'image_builds' },
        { name: 'image_leases' },
        { name: 'image_claim_leases' },
        { name: 'software_images' },
        { name: 'future_images' },
      ])
    if (sql === 'SELECT id FROM image_builds') return d1Reply([{ id: 'a' }])
    if (sql.includes('"image_builds"'))
      return d1Reply([{ snapshot_name: 'build-snapshot' }])
    if (sql.includes('"image_leases"'))
      return d1Reply([{ snapshot_name: 'leased-snapshot' }])
    if (sql.includes('"image_claim_leases"'))
      return d1Reply([{ snapshot_name: 'leased-snapshot' }])
    if (sql.includes('"software_images"'))
      return d1Reply([{ snapshot_name: 'software-snapshot' }])
    if (sql.includes('"future_images"'))
      return d1Reply([{ snapshot_name: 'future-snapshot' }])
    throw new Error('Unexpected fake SQL.')
  })
  await expect(databaseResources(ctx, 'conductive-pr-123')).resolves.toEqual({
    orgIds: ['org-a'],
    snapshots: [
      'build-snapshot',
      'leased-snapshot',
      'software-snapshot',
      'future-snapshot',
      'image-me',
    ],
  })
})

it('can clean a database left before the application tables were created', async () => {
  const { ctx, command } = fakeContext()
  command.mockImplementation(async ({ args }) => {
    const sql = args[args.indexOf('--command') + 1]
    return sql === 'SELECT id FROM orgs'
      ? { exitCode: 1, stdout: '', stderr: 'no such table: orgs' }
      : d1Reply([])
  })
  await expect(databaseResources(ctx, 'conductive-pr-123')).resolves.toEqual({
    orgIds: [],
    snapshots: [],
  })
})
