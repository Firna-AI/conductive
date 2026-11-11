import { expect, it } from 'vitest'
import { relayConfig } from './relay-config.ts'

it('builds a relay config with only the bare-zone route, registry binding, and required runtime settings', () => {
  expect(
    relayConfig({
      zone: 'preview.example',
      namespaceId: 'registry-id',
      accountId: 'preview-account',
      main: '/source/tools/pr-previews/relay/worker.ts',
      date: '2026-10-01',
    }),
  ).toEqual({
    name: 'conductive-preview-relay',
    account_id: 'preview-account',
    main: '/source/tools/pr-previews/relay/worker.ts',
    compatibility_date: '2026-10-01',
    compatibility_flags: ['global_fetch_strictly_public'],
    routes: [{ pattern: 'preview.example/*', zone_name: 'preview.example' }],
    kv_namespaces: [{ binding: 'PREVIEWS', id: 'registry-id' }],
    vars: { PREVIEW_ZONE: 'preview.example' },
    workers_dev: false,
    preview_urls: false,
    observability: {
      enabled: true,
      head_sampling_rate: 1,
      redact_query_string: true,
    },
  })
})
