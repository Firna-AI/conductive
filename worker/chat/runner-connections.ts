import type { RunnerCommand } from '../../src/shared/generated/RunnerCommand'
import type { SkillIdentity } from '../../src/shared/skills'
import { RunnerSkillReads, skillUnavailable } from '../skills/runner'
import type { WorkspaceEventEnvelope } from './workspace-events'
import {
  isSupportedRunnerVersion,
  RUNNER_PROTOCOL_VERSION,
} from '../../src/shared/runner'
import type {
  WorkspaceSockets,
  NativeSocketAttachment,
} from '../native-sockets'
import { CONNECTION_CHECK_MS } from '../security/connection-access'
import { AuthenticatedRunner } from './authenticated-runner'
import { warnRunnerConnection } from './runner-diagnostics'
import { RunnerConnectionStore } from './runner-connection-store'
import type { RunnerConnectionState } from './runner-connection-state'
import type { ChatStore } from './store'
import { failUnsupportedRunner } from './runner-unsupported'
import type {
  ActiveRunner,
  ChatDependencies,
  RunnerPeer,
  RunnerWorkspaceRecord,
} from './types'

interface NativeRunnerConnections {
  sockets: WorkspaceSockets
  storage: DurableObjectStorage
}

export class RunnerConnections {
  current: ActiveRunner | null = null
  readonly skillReads: RunnerSkillReads
  /** Memory only. A physical socket enables durable state and native alarms. */
  private retained = false
  /** Memory only. Restore rebuilds the socket-to-peer handles. */
  private readonly peers = new WeakMap<WebSocket, RunnerPeer>()
  /** Memory only. Restore derives this warning marker from the saved stream. */
  private readonly connected = new WeakSet<ActiveRunner>()
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly bind: (id: string) => void
  private readonly native?: NativeRunnerConnections
  private readonly saved?: RunnerConnectionStore

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    bind: (id: string) => void,
    receive: (peer: RunnerPeer, value: unknown) => Promise<void>,
    native?: NativeRunnerConnections,
  ) {
    this.store = store
    this.dependencies = dependencies
    this.skillReads = new RunnerSkillReads(dependencies.randomId)
    this.publish = publish
    this.bind = bind
    this.native = native
    this.saved = native && new RunnerConnectionStore(native.storage)
    native?.sockets.register('runner', {
      restore: (socket, state) => this.restore(socket, state),
      message: async (socket, _state, value) => {
        const peer = this.peers.get(socket)
        if (!peer) return
        try {
          await receive(peer, value)
        } catch {
          this.disconnect(peer)
        }
      },
      close: async (socket, state) => {
        if (!this.peers.has(socket)) await this.restore(socket, state)
        const peer = this.peers.get(socket)
        this.peers.delete(socket)
        if (peer) this.disconnect(peer)
        if (socket.readyState !== WebSocket.CLOSED)
          socket.close(1000, 'Connection closed.')
      },
    })
  }

  open(
    workspace: RunnerWorkspaceRecord,
    peer: RunnerPeer,
    socket?: WebSocket,
  ): Promise<void> {
    return this.store.run(async () => {
      await this.store.read(workspace.id, async () => undefined)
      this.close()
      this.retained = socket !== undefined
      let state: RunnerConnectionState = {
        id: this.dependencies.randomConnectionId(),
        generation: 1,
        workspace,
        streamId: null,
        processStartId: null,
        protocolVersion: null,
        loginKinds: undefined,
        ready: false,
        checkAt: this.dependencies.now() + CONNECTION_CHECK_MS,
      }
      if (socket) {
        if (!this.native || !this.saved)
          throw new Error('The native runner transport is missing.')
        state = await this.saved.replace(state)
        this.native.sockets.accept(socket, {
          version: 1,
          role: 'runner',
          id: state.id,
          generation: state.generation,
        })
        this.peers.set(socket, peer)
      }
      this.activate(peer, state)
      await this.arm()
    })
  }

  private activate(source: RunnerPeer, state: RunnerConnectionState): void {
    const saved = this.retained ? this.saved : undefined
    const active: ActiveRunner = {
      state,
      peer: new AuthenticatedRunner(
        source,
        state.workspace,
        {
          ...this.dependencies,
          scheduleRunnerCheck: this.retained
            ? undefined
            : this.dependencies.scheduleRunnerCheck,
        },
        () => {
          if (this.current !== active) return
          const at = this.dependencies.now()
          this.reportConnected(active)
          warnRunnerConnection('runner_disconnected', active.state)
          this.current = null
          this.skillReads.detach(active.state.id)
          this.dependencies.runnerDetached(active.state.id)
          this.dependencies.waitUntil(
            Promise.all([
              saved?.save(null, state.generation),
              this.arm(),
              this.store.run(() =>
                this.dependencies.runnerDisconnected(
                  active.state.workspace.id,
                  async (event, occurredAt) => {
                    await this.store.change(
                      active.state.workspace.id,
                      (transaction) => transaction.emit(event, occurredAt),
                      this.publish,
                    )
                  },
                  at,
                ),
              ),
            ]),
          )
        },
      ),
    }
    this.current = active
    if (state.streamId !== null) this.connected.add(active)
    if (state.ready) this.attachFiles(active)
  }

  reportConnected(active: ActiveRunner): void {
    if (this.connected.has(active)) return
    this.connected.add(active)
    warnRunnerConnection('runner_connected', active.state)
  }

  private async restore(
    socket: WebSocket,
    state: NativeSocketAttachment,
  ): Promise<boolean> {
    if (state.role !== 'runner') return false
    const record = await this.saved?.current()
    if (
      !record ||
      record.id !== state.id ||
      record.generation !== state.generation
    )
      return false
    this.bind(record.workspace.id)
    const protocolVersion = record.protocolVersion
    if (
      !isSupportedRunnerVersion(protocolVersion) &&
      (protocolVersion !== null || record.streamId !== null)
    ) {
      await this.saved?.save(null, record.generation)
      warnRunnerConnection('runner_disconnected', record)
      if (protocolVersion === null || protocolVersion < RUNNER_PROTOCOL_VERSION)
        await this.store.run(() =>
          failUnsupportedRunner(
            this.store,
            this.dependencies,
            this.publish,
            record.workspace.id,
          ),
        )
      return false
    }
    const peer: RunnerPeer = {
      send: (message) => socket.send(JSON.stringify(message)),
      close: () => socket.close(1000, 'Connection closed.'),
    }
    this.peers.set(socket, peer)
    this.retained = true
    this.activate(peer, record)
    await this.arm()
    return true
  }

  disconnect(peer: RunnerPeer): void {
    if (this.current?.peer.matches(peer)) this.close()
  }
  close(): void {
    this.current?.peer.close()
  }

  async persist(active: ActiveRunner): Promise<void> {
    if (this.current !== active || !this.retained) return
    await this.saved?.save(active.state, active.state.generation)
  }

  attachFiles(active: ActiveRunner): void {
    this.dependencies.runnerAttached(
      active.state.workspace.id,
      active.state.id,
      (command) => this.sendRead(active, command),
    )
  }

  readSkill(skill: SkillIdentity, signal: AbortSignal): Promise<string> {
    const active = this.current
    if (!active?.state.ready) throw skillUnavailable()
    return this.skillReads.read(
      active.state,
      skill,
      (command, pending) => this.sendRead(active, command, pending),
      signal,
    )
  }

  private sendRead(
    active: ActiveRunner,
    command: Extract<
      RunnerCommand,
      { type: 'file.read' | 'file.diff' | 'skill.read' }
    >,
    signal?: AbortSignal,
  ): Promise<boolean> {
    return this.store.run(async () => {
      if (this.current !== active || signal?.aborted) return false
      if (
        command.type === 'skill.read' &&
        (!active.state.ready || active.state.skillReads !== true)
      )
        return false
      try {
        await active.peer.send(command)
        return true
      } catch {
        active.peer.close()
        return false
      }
    })
  }

  async alarm(): Promise<void> {
    if (!this.retained) return
    const active = this.current
    if (!active) {
      await this.arm()
      return
    }
    const state = active.state
    if (state.checkAt > this.dependencies.now()) {
      await this.arm()
      return
    }
    state.checkAt = this.dependencies.now() + CONNECTION_CHECK_MS
    await this.persist(active)
    await active.peer.authorize()
    await this.arm()
  }

  private arm(): Promise<void> {
    if (!this.retained) return Promise.resolve()
    return (
      this.dependencies.runnerAlarm?.(this.current?.state.checkAt ?? null) ??
      Promise.resolve()
    )
  }
}
