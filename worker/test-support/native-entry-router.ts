import type { NativeWorkspace } from './native-workspace-entry'
import { readNativePacket } from './native-protocol'
import { rememberNativeConstructorOptions } from './native-constructor-options'

interface NativeEntryEnvironment {
  WORKSPACES: DurableObjectNamespace<NativeWorkspace>
}

export async function nativeEntryFetch(
  request: Request,
  env: NativeEntryEnvironment,
): Promise<Response> {
  const target = request.headers.get('X-Native-Workspace')
  if (target) {
    const forwarded = new Request(request)
    forwarded.headers.delete('X-Native-Workspace')
    return env.WORKSPACES.get(env.WORKSPACES.idFromString(target)).fetch(
      forwarded,
    )
  }
  const objectId = new URL(request.url).pathname.split('/')[2]
  if (!objectId)
    return new Response('A native object ID is required.', { status: 400 })
  const actor = env.WORKSPACES.get(env.WORKSPACES.idFromString(objectId))
  const packet = readNativePacket(await request.json())
  if (
    packet.type === 'call' &&
    packet.invocation.reference.path[0] === 'controls' &&
    ['configure', 'initialize'].includes(packet.invocation.reference.path[1])
  ) {
    const options = packet.invocation.arguments[0]
    if (options) rememberNativeConstructorOptions(objectId, options)
  }
  const call = actor.nativeInvoke(packet)
  try {
    const result = await call
    try {
      return Response.json({ type: 'done', result })
    } finally {
      const dispose: unknown = Reflect.get(result, Symbol.dispose)
      if (typeof dispose === 'function') Reflect.apply(dispose, result, [])
    }
  } finally {
    const dispose: unknown = Reflect.get(call, Symbol.dispose)
    if (typeof dispose === 'function') Reflect.apply(dispose, call, [])
  }
}
