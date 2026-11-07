// @vitest-environment happy-dom

import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, onTestFinished, vi } from 'vitest'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
  type WorkspaceStoreLifecycle,
} from './workspace-store'

const cart = { orgId: 'org-1', workspaceId: 'cart' }
const carts = { orgId: 'org-1', workspaceId: 'carts' }

/** A store of one workspace. The test changes it, as a reply or an event does. */
class TestStore {
  readonly name: string
  private snapshot: string
  private readonly listeners = new Set<() => void>()

  constructor(workspace: WorkspaceIdentity, count: number) {
    this.name = `${workspace.workspaceId}#${count}`
    this.snapshot = `${this.name} loading`
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): string => this.snapshot

  change(state: string): void {
    this.snapshot = `${this.name} ${state}`
    for (const listener of [...this.listeners]) listener()
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

  act(() => stores.store('cart#1').change('ready'))
  act(() => stores.store('cart#1').change('merged'))
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
  act(() => stores.store('cart#1').change('ready'))
  const beforeSwitch = view.commits.length

  view.render(carts, lifecycle)
  act(() => stores.store('cart#1').change('late'))
  act(() => stores.store('carts#2').change('ready'))

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
