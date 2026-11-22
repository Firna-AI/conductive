import { vi } from 'vitest'
import type { Preview } from '../shared/generated/Preview'
import { WorkspaceStream } from '../app/events'
import { ManualDelay, ManualFocus, RecordingEvents } from '../app/test-kit'
import { ToolEvents } from '../shell/workspace/tools/tool-events'
import { previewsPath } from '../shared/previews'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { mount, waitFor } from '../test-support/mount'
import type { ApiFetch } from '../terminal/tool-parts/request'
import { PreviewTool } from './PreviewTool'
import type { PreviewServices } from './services/servicesPart'
import { ServicesStore } from './services/servicesStore'

// The helpers of the tests that mount the Preview tool of a phone.

const { org, workspace: workspaceId } = FAKE_IDS
export const path = previewsPath(org, workspaceId)
export const listIntro = 'Open a web server that runs in this sandbox.'
export const askForServer =
  'Servers that run in this sandbox show here. Start one in the terminal, or ask the agent.'
export const unavailable = 'The latest list of servers is unavailable'

export function preview(port: number): Preview {
  return {
    id: `preview-${port}`,
    port,
    url: `https://p${port}a4826b97d1c04f15802c7e9bb2546d30.conductive-previews.test/`,
    expiresAt: FAKE_TIME + 86_400_000,
  }
}

/** The fake API with these open previews. */
export function serverWith(previews: readonly Preview[]): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', path, { previews })
  return server
}

/**
 * The events of the workspace as the Preview tool reads them in the app:
 * raw socket messages, through the stream and the tool events.
 */
export function workspaceEvents() {
  const source = new RecordingEvents()
  const target = { orgId: org, workspaceId }
  const stream = new WorkspaceStream(source, target, new ManualDelay().delay)
  const tools = new ToolEvents()
  tools.follow(stream)
  stream.start()
  source.send({
    type: 'history',
    history: { events: [], throughEventNumber: 0 },
  })
  let last = 0
  const send = (event: object, occurredAt = FAKE_TIME) => {
    last += 1
    const envelope = { workspaceId, eventNumber: last, occurredAt, event }
    source.send({ type: 'event', envelope })
  }
  return { tools, send }
}

/** Mounts the tool with no preview in its address, at FAKE_TIME. */
export async function mountTool(
  fetch: ApiFetch,
  tools: ToolEvents,
  services?: PreviewServices,
) {
  const navigate = vi.fn<(previewId: string) => void>()
  await mount(
    <PreviewTool
      now={() => FAKE_TIME}
      route={{
        previewId: null,
        port: null,
        href: (id) => `#${id}`,
        navigate,
        replace: vi.fn(),
      }}
      services={services}
      touch={false}
      workspace={{ orgId: org, workspaceId, fetch, subscribe: tools.subscribe }}
    />,
  )
  return navigate
}

/**
 * The services of the workspace, connected to its events. A report of the
 * ports reads the list again. The part is a plain Services region while the
 * list is ready.
 */
export function connectedServices(
  fetch: ApiFetch,
  tools: ToolEvents,
): PreviewServices {
  const store = new ServicesStore(
    { orgId: org, workspaceId },
    {
      fetch,
      delay: new ManualDelay().delay,
      onFocus: new ManualFocus().onFocus,
      visible: { get: () => true, subscribe: () => () => undefined },
      newId: () => 'request-1',
    },
  )
  store.connect(tools.subscribe)
  return {
    store,
    section: (state) =>
      state.catalogue?.state === 'ready' ? (
        <section aria-label="Services" />
      ) : null,
  }
}

/** The spoken names of the buttons of the detected servers. */
export function serverRows(): string[] {
  const list = byRole('list', 'Servers in this sandbox')
  return Array.from(list.querySelectorAll('button'), accessibleName)
}

export const waitForForm = () =>
  waitFor(() => queryByRole('button', 'Open preview'), 'the port form')

/** The text of the port field, and whether it keeps the focus and selection. */
export function draftIn(label: string) {
  const field = byLabel(label)
  return field instanceof HTMLInputElement
    ? {
        value: field.value,
        focused: document.activeElement === field,
        selection: [field.selectionStart, field.selectionEnd],
      }
    : null
}
