import { expect, it } from 'vitest'
import { createDatabase, findDatabase, queryDatabase } from './database.ts'
import { seedResources } from './d1.test-support.ts'
import { commandReply, fakeContext } from './operations.test-support.ts'

it('reads D1 IDs from JSON and creates databases in Western Europe', async () => {
  const { ctx, command } = fakeContext()
  command
    .mockResolvedValueOnce(
      commandReply([{ name: 'conductive-pr-123', uuid: 'existing-id' }]),
    )
    .mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'Human text with a misleading ID.',
      stderr: '',
    })
    .mockResolvedValueOnce(
      commandReply({ name: 'conductive-pr-124', uuid: 'new-id' }),
    )
  await expect(findDatabase(ctx, 'conductive-pr-123')).resolves.toEqual({
    name: 'conductive-pr-123',
    id: 'existing-id',
  })
  await expect(createDatabase(ctx, 'conductive-pr-124')).resolves.toEqual({
    name: 'conductive-pr-124',
    id: 'new-id',
  })
  expect(command.mock.calls.map(([request]) => request.args)).toEqual([
    ['d1', 'list', '--json'],
    [
      'd1',
      'create',
      'conductive-pr-124',
      '--location',
      'weur',
      '--update-config=false',
    ],
    ['d1', 'info', 'conductive-pr-124', '--json'],
  ])
  for (const [request] of command.mock.calls) {
    expect(request.env.CLOUDFLARE_API_TOKEN).toBe('fake-cloudflare-token')
    expect(request.args.join(' ')).not.toContain('fake-cloudflare-token')
    expect(request.env.BOAT_API_KEY).toBeUndefined()
  }
})

it('fails D1 commands and malformed JSON without exposing child output', async () => {
  const { ctx, command } = fakeContext()
  command
    .mockResolvedValueOnce({
      exitCode: 1,
      stdout: 'fake-sensitive-data',
      stderr: 'fake-sensitive-token',
    })
    .mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'fake-sensitive-invalid-json',
      stderr: '',
    })
    .mockRejectedValueOnce(new Error('fake-sensitive-launch-error'))
  await expect(
    queryDatabase(ctx, 'conductive-pr-123', 'SELECT id FROM orgs'),
  ).rejects.toThrowError('Wrangler d1 execute failed with exit code 1.')
  await expect(
    queryDatabase(ctx, 'conductive-pr-123', 'SELECT id FROM orgs'),
  ).rejects.toThrowError('Wrangler returned invalid JSON.')
  await expect(
    queryDatabase(ctx, 'conductive-pr-123', 'SELECT id FROM orgs'),
  ).rejects.toThrowError('Wrangler command could not start.')
})

it('reads every JSON statement result and rejects a failed D1 statement', async () => {
  const { ctx, command } = fakeContext(async (db) => {
    await seedResources(db)
    await db
      .prepare(
        "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('org-b', 'Second org', 'user-a', 0)",
      )
      .run()
  })
  command
    .mockImplementationOnce(async (_request, result) => {
      if (!result) throw new Error('Expected local D1 results.')
      return result
    })
    .mockResolvedValueOnce(
      commandReply([{ success: false, error: 'fake-sensitive-error' }]),
    )
  await expect(
    queryDatabase(
      ctx,
      'conductive-pr-123',
      "SELECT id FROM orgs WHERE id = 'org-a'; SELECT id FROM orgs WHERE id = 'org-b'",
    ),
  ).resolves.toEqual([{ id: 'org-a' }, { id: 'org-b' }])
  await expect(
    queryDatabase(ctx, 'conductive-pr-123', 'SELECT id FROM orgs'),
  ).rejects.toThrowError('Wrangler returned a failed D1 statement.')
})
