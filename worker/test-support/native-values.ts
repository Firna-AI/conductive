import { HttpError } from '../http'

export interface NativeReference {
  type: 'reference'
  owner: 'node' | 'worker'
  id: string
  path: string[]
}

export type NativeValue =
  | null
  | boolean
  | number
  | string
  | { type: 'undefined' }
  | { type: 'array'; value: NativeValue[] }
  | { type: 'object'; value: Record<string, NativeValue> }
  | { type: 'map'; value: [NativeValue, NativeValue][] }
  | { type: 'set'; value: NativeValue[] }
  | { type: 'bytes'; value: number[] }
  | NativeReference

export interface NativeInvocation {
  reference: NativeReference
  arguments: NativeValue[]
}

export type NativeResult =
  | { ok: true; value: NativeValue }
  | {
      ok: false
      message: string
      name: string
      properties: NativeValue
      thrown: NativeValue
    }

export class NativeValues {
  private readonly owner: NativeReference['owner']
  private readonly call: (invocation: NativeInvocation) => Promise<unknown>
  private registry = {
    sequence: 0,
    local: new Map<string, object>(),
    references: new WeakMap<object, NativeReference>(),
  }

  constructor(
    owner: NativeReference['owner'],
    call: (invocation: NativeInvocation) => Promise<unknown>,
  ) {
    this.owner = owner
    this.call = call
  }

  register(id: string, value: object): void {
    this.registry.local.set(id, value)
  }

  fork(call: (invocation: NativeInvocation) => Promise<unknown>): NativeValues {
    const values = new NativeValues(this.owner, call)
    values.registry = this.registry
    return values
  }

  encode(value: unknown): NativeValue {
    if (value === undefined) return { type: 'undefined' }
    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string'
    )
      return value
    if (typeof value !== 'object' && typeof value !== 'function')
      throw new Error(`Cannot transport ${typeof value}.`)
    const known = this.registry.references.get(value)
    if (known) return known
    if (Array.isArray(value))
      return { type: 'array', value: value.map((item) => this.encode(item)) }
    if (value instanceof Map)
      return {
        type: 'map',
        value: [...value].map(([key, item]) => [
          this.encode(key),
          this.encode(item),
        ]),
      }
    if (value instanceof Set)
      return { type: 'set', value: [...value].map((item) => this.encode(item)) }
    if (value instanceof Uint8Array) return { type: 'bytes', value: [...value] }
    if (Object.getPrototypeOf(value) === Object.prototype)
      return {
        type: 'object',
        value: Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, this.encode(item)]),
        ),
      }
    const id = `${this.owner}-${++this.registry.sequence}`
    const reference: NativeReference = {
      type: 'reference',
      owner: this.owner,
      id,
      path: [],
    }
    this.registry.references.set(value, reference)
    this.registry.local.set(id, value)
    return reference
  }

  decode(value: NativeValue): unknown {
    if (value === null || typeof value !== 'object') return value
    switch (value.type) {
      case 'undefined':
        return undefined
      case 'array':
        return value.value.map((item) => this.decode(item))
      case 'object':
        return Object.fromEntries(
          Object.entries(value.value).map(([key, item]) => [
            key,
            this.decode(item),
          ]),
        )
      case 'map':
        return new Map(
          value.value.map(([key, item]) => [
            this.decode(key),
            this.decode(item),
          ]),
        )
      case 'set':
        return new Set(value.value.map((item) => this.decode(item)))
      case 'bytes':
        return new Uint8Array(value.value)
      case 'reference':
        return value.owner === this.owner
          ? this.resolve(value).value
          : this.remote(value)
    }
  }

  remote(reference: NativeReference): object {
    const proxy = new Proxy(() => undefined, {
      get: (_target, key) => {
        if (key === 'then') return undefined
        if (typeof key !== 'string') return undefined
        return this.remote({ ...reference, path: [...reference.path, key] })
      },
      apply: (_target, _receiver, args: unknown[]) =>
        this.call({
          reference,
          arguments: args.map((value) => this.encode(value)),
        }),
    })
    this.registry.references.set(proxy, reference)
    return proxy
  }

  async invoke(invocation: NativeInvocation): Promise<NativeResult> {
    try {
      const { parent, value } = this.resolve(invocation.reference)
      if (typeof value !== 'function')
        throw new Error('The native target is not callable.')
      const result: unknown = await Reflect.apply(
        value,
        parent,
        invocation.arguments.map((argument) => this.decode(argument)),
      )
      return { ok: true, value: this.encode(result) }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Error',
        properties: this.encode(error instanceof Error ? { ...error } : {}),
        thrown: this.encode(error),
      }
    }
  }

  result(result: NativeResult): unknown {
    if (result.ok) return this.decode(result.value)
    if (
      result.thrown &&
      typeof result.thrown === 'object' &&
      result.thrown.type === 'reference' &&
      result.thrown.owner === this.owner
    )
      throw this.resolve(result.thrown).value
    const properties = this.decode(result.properties)
    const error =
      properties &&
      typeof properties === 'object' &&
      'status' in properties &&
      typeof properties.status === 'number' &&
      'code' in properties &&
      typeof properties.code === 'string'
        ? new HttpError(properties.status, properties.code, result.message)
        : new Error(result.message)
    error.name = result.name
    if (properties && typeof properties === 'object')
      Object.assign(error, properties)
    if (
      result.thrown &&
      typeof result.thrown === 'object' &&
      result.thrown.type === 'reference'
    )
      this.registry.references.set(error, result.thrown)
    throw error
  }

  private resolve(reference: NativeReference): {
    parent: unknown
    value: unknown
  } {
    let value: unknown = this.registry.local.get(reference.id)
    let parent: unknown
    if (value === undefined)
      throw new Error(`Unknown native reference: ${reference.id}`)
    for (const key of reference.path) {
      parent = value
      if (
        (typeof value !== 'object' || value === null) &&
        typeof value !== 'function'
      )
        throw new Error(`Cannot read native member: ${key}`)
      value = Reflect.get(value, key)
    }
    return { parent, value }
  }
}
