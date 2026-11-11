import { expect, it } from 'vitest'
import { previewNames } from './names.ts'
import { apiReply, fakeContext } from './operations.test-support.ts'
import { PreviewRegistry } from './registry.ts'

it('finds the relay namespace across pages and stores the preview origins', async () => {
  const { ctx, http } = fakeContext()
  http
    .mockResolvedValueOnce(
      apiReply([{ id: 'other', title: 'other' }], { total_pages: 2 }),
    )
    .mockResolvedValueOnce(
      apiReply([{ id: 'registry-id', title: 'conductive-preview-registry' }], {
        total_pages: 2,
      }),
    )
    .mockResolvedValueOnce(apiReply(null))
  await expect(
    new PreviewRegistry(ctx).add(previewNames(123, 'preview.example')),
  ).resolves.toBe(true)
  expect(
    http.mock.calls.map(([request]) => [
      request.method,
      new URL(request.url).pathname,
    ]),
  ).toEqual([
    [
      'GET',
      '/client/v4/accounts/0123456789abcdef0123456789abcdef/storage/kv/namespaces',
    ],
    [
      'GET',
      '/client/v4/accounts/0123456789abcdef0123456789abcdef/storage/kv/namespaces',
    ],
    [
      'PUT',
      '/client/v4/accounts/0123456789abcdef0123456789abcdef/storage/kv/namespaces/registry-id/values/pr-123',
    ],
  ])
  expect(new URL(http.mock.calls[1][0].url).searchParams.get('page')).toBe('2')
  expect(await http.mock.calls[2][0].text()).toBe(
    JSON.stringify({
      number: 123,
      marketingOrigin: 'https://pr-123.preview.example',
      appOrigin: 'https://pr-123-app.preview.example',
      machineOrigin: 'https://pr-123-api.preview.example',
    }),
  )
})

it('warns and continues when the relay registry does not exist', async () => {
  const { ctx, http, warn } = fakeContext()
  http.mockResolvedValueOnce(apiReply([]))
  await expect(
    new PreviewRegistry(ctx).add(previewNames(123, 'preview.example')),
  ).resolves.toBe(false)
  expect(warn).toHaveBeenCalledExactlyOnceWith(
    'The relay registry is missing. GitHub events and install returns wait for the relay deploy.',
  )
})

it('accepts missing keys and reads all registry cursor pages', async () => {
  const { ctx, http } = fakeContext()
  http
    .mockResolvedValueOnce(
      apiReply([{ id: 'registry-id', title: 'conductive-preview-registry' }]),
    )
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(
      apiReply([{ name: 'pr-123' }, { name: 'other' }], { cursor: 'next' }),
    )
    .mockResolvedValueOnce(apiReply([{ name: 'pr-124' }], {}))
  const registry = new PreviewRegistry(ctx)
  await registry.remove(123)
  await expect(registry.numbers()).resolves.toEqual([123, 124])
  expect(new URL(http.mock.calls[3][0].url).searchParams.get('cursor')).toBe(
    'next',
  )
})

it.each([true, false])(
  'finds or creates the shared registry when existing is %s',
  async (existing) => {
    const { ctx, http } = fakeContext()
    http
      .mockResolvedValueOnce(
        apiReply(
          existing
            ? [{ id: 'registry-id', title: 'conductive-preview-registry' }]
            : [],
        ),
      )
      .mockResolvedValueOnce(apiReply({ id: 'registry-id' }))
    const registry = new PreviewRegistry(ctx)
    await expect(registry.ensure()).resolves.toBe('registry-id')
    await expect(registry.ensure()).resolves.toBe('registry-id')
    const requests = await Promise.all(
      http.mock.calls.map(async ([request]) => ({
        method: request.method,
        body: await request.text(),
      })),
    )
    expect(requests).toEqual(
      existing
        ? [{ method: 'GET', body: '' }]
        : [
            { method: 'GET', body: '' },
            { method: 'POST', body: '{"title":"conductive-preview-registry"}' },
          ],
    )
  },
)
