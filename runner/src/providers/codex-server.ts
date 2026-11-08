import { codexBinary } from './binaries'
import { prepareProviderHome, providerEnvironment } from './environment'
import { ProviderLifetime } from './lifetime'
import { startProcess, type StartProcess } from './process'
import { JsonRpc } from './rpc'
import type { ProviderOptions } from './types'

type ServerOptions = Pick<
  ProviderOptions,
  'cwd' | 'home' | 'tools' | 'login' | 'signal' | 'lifetime'
>

export async function startCodexServer(
  options: ServerOptions,
  configuration: Record<string, unknown>,
  notification: (method: string, params: unknown) => void,
  exited: () => void,
  start: StartProcess = startProcess,
): Promise<{ rpc: JsonRpc; close: () => Promise<void> }> {
  options.signal?.throwIfAborted()
  const lifetime = options.lifetime ?? new ProviderLifetime()
  await prepareProviderHome(options.home)
  options.signal?.throwIfAborted()
  const configs = {
    model_provider: 'conductive',
    'model_providers.conductive.name': 'Conductive',
    'model_providers.conductive.base_url': 'https://api.openai.com/v1',
    'model_providers.conductive.wire_api': 'responses',
    'model_providers.conductive.requires_openai_auth': true,
    cli_auth_credentials_store: 'ephemeral',
    ...configuration,
  }
  let closed = false
  const rpc = new JsonRpc(
    start({
      command: process.execPath,
      args: [
        codexBinary(),
        'app-server',
        ...Object.entries(configs).flatMap(([key, value]) => [
          '-c',
          `${key}=${JSON.stringify(value)}`,
        ]),
      ],
      cwd: options.cwd,
      env: providerEnvironment(options.home, options.tools),
      signal: options.signal,
      lifetime,
    }),
    notification,
    () => {
      if (!closed) exited()
    },
  )
  let closing: Promise<void> | null = null
  const close = () => {
    closed = true
    options.signal?.removeEventListener('abort', abort)
    closing ??= rpc.close().finally(() => lifetime.close())
    return closing
  }
  const abort = () => {
    void close().catch(exited)
  }
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) abort()
  try {
    await rpc.request('initialize', {
      clientInfo: { name: 'conductive', title: 'Conductive', version: '0.1.0' },
      capabilities: { experimentalApi: true },
    })
    rpc.notify('initialized')
    await rpc.request('account/login/start', {
      type: 'apiKey',
      apiKey: options.login.secret,
    })
    return { rpc, close }
  } catch (error) {
    await close()
    throw error
  }
}
