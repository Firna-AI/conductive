import { expect, it } from 'vitest'

import { workerRouteTemplate } from './routes'

it('keeps code-owned route segments and replaces all parameters', () => {
  expect(
    workerRouteTemplate(
      '/api/orgs/private-org/workspaces/private-workspace/sessions/private-session/messages',
    ),
  ).toBe('/api/orgs/:param/workspaces/:param/sessions/:param/messages')
  expect(workerRouteTemplate('/v1/internal/image-source/credential')).toBe(
    '/v1/internal/image-source/credential',
  )
  expect(workerRouteTemplate('/api/operator/users/123/suspension')).toBe(
    '/api/operator/users/:param/suspension',
  )
  expect(workerRouteTemplate('/private/path?token=private')).toBe(
    '/:param/:param',
  )
})
