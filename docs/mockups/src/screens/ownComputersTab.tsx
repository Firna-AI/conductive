import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { buildSection } from '../entries/components/settings/BuildSection.mockup'
import {
  AddComputerDialog,
  type AddStep,
} from '../components/own-computers/AddComputerDialog'
import { installCommand } from '../components/own-computers/addComputerCopy'
import {
  ComputerDetails,
  LimitSection,
  OfflineNotice,
  RemoveSection,
} from '../components/own-computers/ComputerSections'
import type { BackLink } from '../components/layout/Page'
import type { OwnComputer } from '../components/own-computers/ownComputer'
import { computerPageWords } from '../components/own-computers/ownComputerCopy'
import {
  OwnComputersTab,
  type ComputersAccess,
} from '../components/own-computers/OwnComputersTab'
import { RemoveComputerDialog } from '../components/own-computers/RemoveComputerDialog'
import { runningBuild } from '../fixtures/computer'
import { ownComputerBuilds } from '../fixtures/ownComputerBuilds'
import {
  acmeComputers,
  installCode,
  ownComputers,
} from '../fixtures/ownComputers'
import { computerPaths } from '../paths'
import { plainData } from '../defined'
import type { OrgSettingsState } from './orgSettingsState'
import { settingsOrg } from './settingsOrgs'

const links = computerPaths.settings

/** Who reads the tab: the viewer, or everyone in a suspended org. */
function accessOf(state: OrgSettingsState): ComputersAccess {
  return state.org === 'suspended' ? 'suspended' : state.viewer
}

/** The page that the row of each computer opens, for each reader. */
function pagesOf(access: ComputersAccess): Readonly<Record<string, string>> {
  switch (access) {
    case 'admin':
      return {
        'build-01': links.computer,
        'build-02': links.computerFull,
        'lab-server': links.computerOffline,
        'build-03': links.build,
      }
    case 'member':
      return { 'build-01': links.computerMember }
    case 'suspended':
      return {}
  }
}

/**
 * The computer whose page shows, in the state of the build of its page: a
 * build that runs, a build that failed, or no build now.
 */
function pageComputer(state: OrgSettingsState): OwnComputer | undefined {
  if (state.computer === 'none') return undefined
  const computer = ownComputers[state.computer]
  const { built } = computer.builds
  switch (state.build) {
    case 'building':
    case 'waiting':
      return {
        ...computer,
        builds: {
          built,
          now: { kind: 'building', elapsed: runningBuild.elapsed },
        },
      }
    case 'failed':
    case 'time-limit':
    case 'ended': {
      const { failed } = ownComputerBuilds(state.computer, state.build)
      const when = failed?.when ?? ''
      return { ...computer, builds: { built, now: { kind: 'failed', when } } }
    }
    case 'ready':
    case 'none':
      return { ...computer, builds: { built } }
  }
}

/**
 * The header of the page of one own computer: its name, with the way back
 * to the list. The list keeps the header of the org settings.
 */
export function computerHeader(
  state: OrgSettingsState,
): { title: string; subtitle: string; back: BackLink } | undefined {
  const computer = pageComputer(state)
  if (computer === undefined) return undefined
  const list = state.viewer === 'admin' ? links.list : links.member
  return {
    title: computer.name,
    subtitle: computerPageWords.subtitle,
    back: { label: computerPageWords.back, to: list },
  }
}

/**
 * The page of one own computer: the notice of an offline computer, its
 * facts, its builds in the build card of the Cloud computer tab, then, for
 * an admin, its limit and Remove computer.
 */
function ComputerPage(props: {
  state: OrgSettingsState
  computer: OwnComputer
  org: string
}) {
  const { state, computer, org } = props
  const admin = state.viewer === 'admin' && state.org !== 'suspended'
  const builds =
    state.computer === 'none'
      ? undefined
      : ownComputerBuilds(state.computer, state.build)
  return (
    <>
      {computer.connection.kind === 'offline' ? (
        <OfflineNotice computer={computer} />
      ) : null}
      <ComputerDetails computer={computer} />
      {builds ? (
        <buildSection.Component
          builds={plainData(builds)}
          moklyInstance="computer-builds"
          readOnly={!admin}
          state={state.build}
        />
      ) : null}
      {admin ? <LimitSection computer={computer} org={org} /> : null}
      {admin ? (
        <RemoveSection
          computer={computer}
          org={org}
          to={links.computerRemove}
        />
      ) : null}
    </>
  )
}

/** The body of the Own computers tab: its list, or the page of a computer. */
export function OwnComputersBody(props: { state: OrgSettingsState }) {
  const { state } = props
  const settings = settingsOrg(state)
  const org = settings.org.name
  const computer = pageComputer(state)
  if (computer) {
    return <ComputerPage computer={computer} org={org} state={state} />
  }
  const access = accessOf(state)
  // A suspended org runs no workspace, so its computers run none.
  const computers =
    state.org === 'new'
      ? []
      : acmeComputers(state.ownComputers).map((item) =>
          state.org === 'suspended' ? { ...item, running: 0 } : item,
        )
  return (
    <OwnComputersTab
      access={access}
      computers={computers}
      links={{
        pages: pagesOf(access),
        add: links.add,
        cloudComputer: settings.links.computer,
        showCommand: links.addCommand,
        newCode: links.addCommand,
      }}
      org={org}
    />
  )
}

/** The dialogs of own computers, as `OrgSettingsState` names them. */
type ComputerDialog =
  | 'add-computer'
  | 'computer-command'
  | 'computer-connected'
  | 'computer-expired'
  | 'remove-computer'

/**
 * The dialogs of own computers over the org settings: the steps of Add
 * computer for build-03, and the question before Remove computer on the
 * page of a computer. A suspended org changes nothing, so it opens none.
 */
export function computerDialogs(
  state: OrgSettingsState,
  viewport: Viewport,
): Readonly<Record<ComputerDialog, ReactNode>> {
  if (state.org === 'suspended') {
    return {
      'add-computer': null,
      'computer-command': null,
      'computer-connected': null,
      'computer-expired': null,
      'remove-computer': null,
    }
  }
  const org = settingsOrg(state).org.name
  const added = ownComputers['build-03']
  const step = (value: AddStep) => (
    <AddComputerDialog
      command={installCommand(installCode)}
      connected={
        added.resources && added.limit !== undefined
          ? { resources: added.resources, limit: added.limit }
          : undefined
      }
      links={{
        list: links.list,
        command: links.addCommand,
        waiting: links.waiting,
      }}
      name={added.name}
      org={org}
      step={value}
      viewport={viewport}
    />
  )
  const computer = pageComputer(state)
  return {
    'add-computer': step('name'),
    'computer-command': step('command'),
    'computer-connected': step('connected'),
    'computer-expired': step('expired'),
    'remove-computer': computer ? (
      <RemoveComputerDialog
        cancel={links.computer}
        computer={computer}
        org={org}
        viewport={viewport}
      />
    ) : null,
  }
}
