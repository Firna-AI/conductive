import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { previewNames } from './names.ts'
import type { OperationContext } from './operations.ts'

interface RelayConfigInputs {
  zone: string
  namespaceId: string
  accountId: string
  main: string
  date: string
}

export function relayConfig(
  inputs: RelayConfigInputs,
): Record<string, unknown> {
  const zone = previewNames(1, inputs.zone).zone
  return {
    name: 'conductive-preview-relay',
    account_id: inputs.accountId,
    main: inputs.main,
    compatibility_date: inputs.date,
    compatibility_flags: ['global_fetch_strictly_public'],
    routes: [{ pattern: `${zone}/*`, zone_name: zone }],
    kv_namespaces: [{ binding: 'PREVIEWS', id: inputs.namespaceId }],
    vars: { PREVIEW_ZONE: zone },
    workers_dev: false,
    preview_urls: false,
    observability: {
      enabled: true,
      head_sampling_rate: 1,
      redact_query_string: true,
    },
  }
}

export async function writeRelayConfig(
  ctx: OperationContext,
  namespaceId: string,
): Promise<string> {
  const source = await readFile(
    new URL('../../wrangler.jsonc', import.meta.url),
    'utf8',
  )
  const date = /^\s*"compatibility_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/m.exec(
    source,
  )?.[1]
  if (!date)
    throw new Error('The root Wrangler config must declare compatibility_date.')
  const config = relayConfig({
    zone: ctx.settings.zone,
    accountId: ctx.settings.accountId,
    namespaceId,
    date,
    main: fileURLToPath(new URL('./relay/worker.ts', import.meta.url)),
  })
  const path = join(ctx.cwd, 'relay.wrangler.json')
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', {
    encoding: 'utf8',
  })
  return path
}
