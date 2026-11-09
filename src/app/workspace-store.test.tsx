// @vitest-environment happy-dom

import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, onTestFinished, vi } from 'vitest'
import { terminalPaths } from '../shared/terminal'
import { FakeApiServer } from '../test-support/fake-api'
import { mount } from '../test-support/mount'
import {
  devSubscribe,
  emitDevEvent,
  sandboxReadyEvent,
} from '../terminal/dev/devServer'
import {
  createTerminalStore,
  type TerminalStore,
} from '../terminal/terminalStore'
import type { SubscribeWorkspaceEvents } from '../terminal/tool-parts/workspace'
import { settle } from '../shell/test-mount'
import { Store } from './store'
import { HeldRequests, requestLines } from './test-kit'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
  type WorkspaceStoreLifecycle,
} from './workspace-store'

const cart = { orgId: 'org-1', workspaceId: 'cart' }
const carts = { orgId: 'org-1', workspaceId: 'carts' }

/** A store of one workspace. The test changes it, as a reply or an event does. */
class TestStore extends Store<string> {
  readonly name: string

  constructor(workspace: WorkspaceIdentity, count: number) {
    const name = `${workspace.workspaceId}#${count}`
    super(`${name} loading`)
    this.name = name
  }

  getSnapshot = this.get

  show(state: string): void {
    this.set(`${this.name} ${state}`)
  }
}

/** Makes numbered stores, and logs each make, connection, and stop. */
function storeLog() {
  const log: string[] = []
  const stores: TestStore[] = []
  const create = (workspace: WorkspaceIdentity): TestStore => {
    const store = new TestStore(workspace, stores.length + 1)
    stores.push(store)
    log.push(`create ${store.name}`)
    return store
  }
  /** A connect function that logs its name at each connection. */
  const connectAs = (name: string) => (store: TestStore) => {
    log.push(`${name} ${store.name}`)
    return () => {
      log.push(`stop ${store.name}`)
    }
  }
  const store = (name: string): TestStore => {
    const found = stores.find((item) => item.name === name)
    if (!found) throw new Error(`No store ${name} was made.`)
    return found
  }
  return { log, create, connectAs, store }
}

function View(props: {
  workspace: WorkspaceIdentity
  lifecycle: WorkspaceStoreLifecycle<TestStore>
  onCommit: (snapshot: string) => void
}) {
  const { workspace, lifecycle, onCommit } = props
  const { snapshot } = useWorkspaceStore(workspace, lifecycle)
  useLayoutEffect(() => {
    onCommit(snapshot)
  }, [onCommit, snapshot, workspace.orgId, workspace.workspaceId])
  return <output>{snapshot}</output>
}

/** Mounts the real hook, and records the snapshot of each committed view. */
function mountView() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  const commits: string[] = []
  const onCommit = (snapshot: string): void => {
    commits.push(snapshot)
  }
  let mounted = true
  const unmount = (): void => {
    if (!mounted) return
    mounted = false
    act(() => root.unmount())
  }
  onTestFinished(() => {
    unmount()
    vi.unstubAllGlobals()
  })
  return {
    commits,
    text: () => container.textContent,
    render(
      workspace: WorkspaceIdentity,
      lifecycle: WorkspaceStoreLifecycle<TestStore>,
    ): void {
      act(() => {
        root.render(
          <View
            lifecycle={lifecycle}
            onCommit={onCommit}
            workspace={workspace}
          />,
        )
      })
    },
    unmount,
  }
}

it('connects the store of the workspace after its render, shows each change, and stops it at unmount', () => {
  const stores = storeLog()
  const view = mountView()
  view.render(cart, {
    create: stores.create,
    connect: stores.connectAs('connect'),
  })
  const afterMount = [...stores.log]

  act(() => stores.store('cart#1').show('ready'))
  act(() => stores.store('cart#1').show('merged'))
  const shown = view.text()
  view.unmount()

  expect({ afterMount, shown, commits: view.commits }).toEqual({
    afterMount: ['create cart#1', 'connect cart#1'],
    shown: 'cart#1 merged',
    commits: ['cart#1 loading', 'cart#1 ready', 'cart#1 merged'],
  })
  expect(stores.log).toEqual(['create cart#1', 'connect cart#1', 'stop cart#1'])
})

it('stops the old store before it connects the new one at a workspace switch, and the view shows only the new store', () => {
  const stores = storeLog()
  const lifecycle = {
    create: stores.create,
    connect: stores.connectAs('connect'),
  }
  const view = mountView()
  view.render(cart, lifecycle)
  act(() => stores.store('cart#1').show('ready'))
  const beforeSwitch = view.commits.length

  view.render(carts, lifecycle)
  act(() => stores.store('cart#1').show('late'))
  act(() => stores.store('carts#2').show('ready'))

  expect({
    shown: view.text(),
    commits: view.commits.slice(beforeSwitch),
  }).toEqual({
    shown: 'carts#2 ready',
    commits: ['carts#2 loading', 'carts#2 ready'],
  })
  expect(stores.log).toEqual([
    'create cart#1',
    'connect cart#1',
    'create carts#2',
    'stop cart#1',
    'connect carts#2',
  ])
})

it('keeps the store for the same workspace, connects it again for a new connect function, and makes a new store for a new create function', () => {
  const stores = storeLog()
  const connect = stores.connectAs('connect')
  const reconnect = stores.connectAs('reconnect')
  const view = mountView()
  view.render(cart, { create: stores.create, connect })
  view.render({ ...cart }, { create: stores.create, connect })
  view.render({ ...cart }, { create: stores.create, connect: reconnect })
  const createAgain = (workspace: WorkspaceIdentity) => stores.create(workspace)

  view.render(cart, { create: createAgain, connect: reconnect })

  expect(stores.log).toEqual([
    'create cart#1',
    'connect cart#1',
    'stop cart#1',
    'reconnect cart#1',
    'create cart#2',
    'stop cart#1',
    'reconnect cart#2',
  ])
  expect(view.text()).toBe('cart#2 loading')
})

function TerminalView(props: {
  workspace: WorkspaceIdentity
  lifecycle: WorkspaceStoreLifecycle<TerminalStore>
}) {
  const { snapshot } = useWorkspaceStore(props.workspace, props.lifecycle)
  return (
    <output>
      {props.workspace.workspaceId} {snapshot.view.state}
    </output>
  )
}

it('connects a real terminal store and drops old reads and events after a workspace switch and unmount', async () => {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const cartPath = terminalPaths.connection(cart.orgId, cart.workspaceId)
  const cartsPath = terminalPaths.connection(carts.orgId, carts.workspaceId)
  for (const path of [cartPath, cartsPath]) {
    server.json('GET', path, { state: 'starting', socketPath: null })
  }
  const stopped = vi.fn()
  const subscribe: SubscribeWorkspaceEvents = (listener) => {
    const stop = devSubscribe(server)(listener)
    return () => {
      stop()
      stopped()
    }
  }
  const lifecycle = {
    create: createTerminalStore,
    connect: (store: TerminalStore) =>
      store.connect({ fetch: held.fetch, subscribe }),
  }
  const view = await mount(
    <TerminalView workspace={cart} lifecycle={lifecycle} />,
  )
  await settle()
  expect(view.container.textContent).toBe('cart starting')

  held.holdAnswer('GET', cartPath)
  server.json('GET', cartPath, {
    state: 'ready',
    socketPath: terminalPaths.socket(cart.orgId, cart.workspaceId),
    protocol: 'tty',
  })
  act(() => emitDevEvent(server, cart.workspaceId, sandboxReadyEvent()))
  await settle()
  expect(view.container.textContent).toBe('cart loading')
  await view.rerender(<TerminalView workspace={carts} lifecycle={lifecycle} />)
  await settle()
  expect(stopped).toHaveBeenCalledTimes(1)
  expect(server.requests.at(1)?.signal.aborted).toBe(true)
  held.release('GET', cartPath)
  act(() => emitDevEvent(server, cart.workspaceId, sandboxReadyEvent()))
  await settle()
  expect(view.container.textContent).toBe('carts starting')

  held.holdAnswer('GET', cartsPath)
  act(() => emitDevEvent(server, carts.workspaceId, sandboxReadyEvent()))
  await settle()
  expect(view.container.textContent).toBe('carts loading')
  await view.unmount()
  expect(stopped).toHaveBeenCalledTimes(2)
  expect(server.requests.at(-1)?.signal.aborted).toBe(true)
  held.release('GET', cartsPath)
  act(() => emitDevEvent(server, carts.workspaceId, sandboxReadyEvent()))
  await settle()
  expect(view.container.textContent).toBe('')
  expect(requestLines(server)).toEqual([
    `GET ${cartPath}`,
    `GET ${cartPath}`,
    `GET ${cartsPath}`,
    `GET ${cartsPath}`,
  ])
})
