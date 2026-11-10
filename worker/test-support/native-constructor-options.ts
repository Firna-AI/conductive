import { isRecord } from '../http'
import type { TitleModelCall } from '../chat/title-model'
import type { NativeValue } from './native-values'
import type { NativeWorkerBridge } from './native-worker-bridge'

const options = new Map<string, NativeValue>()

export function rememberNativeConstructorOptions(
  id: string,
  value: NativeValue,
): void {
  options.set(id, value)
}

export function initialNativeTitleModel(
  id: string,
  bridge: NativeWorkerBridge,
): TitleModelCall | undefined {
  const encoded = options.get(id)
  const value: unknown = encoded ? bridge.values.decode(encoded) : undefined
  const callbacks = isRecord(value) ? value.callbacks : undefined
  const run: unknown = isRecord(callbacks) ? callbacks.runTitleModel : undefined
  return typeof run === 'function'
    ? (model, input, settings) =>
        Promise.resolve(Reflect.apply(run, undefined, [model, input, settings]))
    : undefined
}
