import { useEffect } from 'react'
import { inFirstRun } from '../../app/get-started'
import type { ListData } from '../../app/list-changes'
import { useRoute } from '../../app/navigation'
import { paletteOrg } from '../../app/palette/palette-org'
import type {
  PaletteRead,
  PaletteSource,
} from '../../app/palette/palette-source'
import { isSuspended } from '../../app/permissions'
import { routes } from '../../app/router'
import {
  loading,
  ready,
  useStore,
  type Loadable,
  type Readable,
} from '../../app/store'
import type { Section } from '../../shared/sections'
import type { Workspace } from '../../shared/workspaces'
import { useApp } from '../context'
import { useMacApp } from '../mac/mac-app'
import { usePalette } from './palette-context'

/** The parts of an org that a palette without an org does not read. */
const nothing: Readable<Loadable<never>> = {
  get: () => loading,
  subscribe: () => () => undefined,
}

function listOf(
  sections: Loadable<readonly Section[]>,
  workspaces: Loadable<readonly Workspace[]>,
): Loadable<ListData> {
  if (sections.state === 'failed') return sections
  if (workspaces.state === 'failed') return workspaces
  if (sections.state === 'loading' || workspaces.state === 'loading') {
    return loading
  }
  return ready({ sections: sections.value, workspaces: workspaces.value })
}

/**
 * What the palette reads from the app: the org of the palette with its
 * list and its repositories, which it reads while it is open, the orgs of
 * the person, and what the parts of the page offer. `retry` reads the
 * given parts of the org again, such as the reads that failed.
 */
export function usePaletteSource(): {
  source: PaletteSource
  retry: (reads: readonly PaletteRead[]) => Promise<void>
} {
  const app = useApp()
  const route = useRoute()
  const orgs = useStore(app.orgs)
  const refused = useStore(app.refusedOrgs)
  const lastOrg = useStore(app.lastOrg)
  const getStarted = useStore(app.getStarted)
  const offers = useStore(usePalette().offers)
  const mac = useMacApp() !== null
  const org = paletteOrg(route, orgs, lastOrg)
  const model = org === null ? null : app.org(org.id)
  const sections = useStore(model?.sections ?? nothing)
  const workspaces = useStore(model?.workspaces ?? nothing)
  const repositories = useStore(model?.repositories ?? nothing)
  useEffect(() => model?.watch('list', 'repositories'), [model])
  const open =
    route.screen === 'workspace' && route.orgId === org?.id
      ? route.workspaceId
      : null
  return {
    source: {
      orgs,
      org,
      suspended: org !== null && isSuspended(org, refused),
      list: listOf(sections, workspaces),
      repositories,
      openWorkspaceId: open,
      createOrgHref: inFirstRun(getStarted)
        ? routes.getStarted()
        : routes.createOrg(),
      offers,
      mac,
    },
    retry: async (reads) => {
      if (model === null) return
      await Promise.all(reads.map((read) => model.reload(read)))
    },
  }
}
