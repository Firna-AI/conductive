import { useState } from 'react'
import { DetailList } from '../../ui/components/settings/DetailList'
import {
  OrgColorField,
  OrgColorValue,
} from '../../ui/components/settings/OrgColorField'
import { Section } from '../../ui/components/settings/Section'
import { mayChangeSettings } from '../../app/permissions'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { setupOrg } from '../../app/setup-steps'
import { useNow } from '../../app/time'
import { DeleteOrgSection } from '../../members/DeleteOrgSection'
import type { User } from '../../shared/api'
import { orgColorOf, type OrgColor } from '../../shared/org-colors'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess } from '../context'
import {
  orgNameFields,
  OrgNameFields,
  type OrgNameDraft,
} from '../orgs/OrgNameFields'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { tileInitials } from '../ui/Avatars'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'
import { LeaveOrgSection } from './LeaveOrg'
import { useMembersApi, useMembersViewport } from './members-api'

function sameNames(a: OrgNameDraft, b: OrgNameDraft): boolean {
  return a.name === b.name && a.initials === b.initials
}

/**
 * The name and the initials of the org, which an admin changes. Save waits
 * for a change, and a name of spaces only does not count. Empty initials
 * keep the saved ones. When the saved name or initials change, here or
 * elsewhere, the fields show them, unless the admin changed the fields.
 */
function NameSection(props: { org: OrgSummary }) {
  const { org } = props
  const app = useApp()
  const names = useSavedDraft<OrgNameDraft>(
    { name: org.name, initials: org.initials ?? '' },
    sameNames,
  )
  const rename = useAction(
    () => names.save((draft) => app.renameOrg(org.id, orgNameFields(draft))),
    'The org was not saved',
  )
  const next = orgNameFields(names.draft)
  const changed =
    next.name !== '' &&
    (next.name !== org.name ||
      (next.initials !== undefined && next.initials !== org.initials))
  const save = () => {
    if (changed) rename.run()
  }
  return (
    <Section
      actions={
        <ActionButton
          busy={rename.pending}
          disabled={!changed}
          keepFocus
          onPress={save}
        >
          Save
        </ActionButton>
      }
      title="Org"
    >
      <OrgNameFields
        change={names.change}
        disabled={rename.pending}
        draft={names.draft}
        submit={save}
      />
    </Section>
  )
}

/**
 * The colour of the org, which the rail shows on its tile while the org is
 * open. A choice saves at once, so the section has no Save. The swatches
 * show the choice while it saves, and a choice during a save is ignored.
 * A failed save shows a toast and the saved colour again.
 */
function ColorSection(props: { org: OrgSummary }) {
  const { org } = props
  const app = useApp()
  const [chosen, setChosen] = useState<OrgColor | null>(null)
  const save = useAction(
    (color: OrgColor) =>
      app.setOrgColor(org.id, color).finally(() => setChosen(null)),
    'The colour was not saved',
  )
  const value = chosen ?? orgColorOf(org)
  const choose = (color: OrgColor) => {
    if (save.pending || color === value) return
    setChosen(color)
    save.run(color)
  }
  return (
    <Section
      description="Shown in the rail while this org is open."
      title="Colour"
    >
      <OrgColorField onChange={choose} value={value} />
    </Section>
  )
}

/**
 * Delete org of the members UI, as the user decided in decision 30: every
 * cloud computer stops and the org hides at once, and everything is
 * deleted after 7 days unless an admin restores it. The answer takes the
 * org out of the rail, and the app opens the next org that is not deleted,
 * from `AppModel.activeOrgs`, else Get started. The Account page lists the
 * org, with Restore.
 */
function DeleteSection(props: { org: OrgSummary }) {
  const app = useApp()
  const go = useGo()
  const { timeZone } = useServices()
  const now = useNow(60_000)
  return (
    <DeleteOrgSection
      api={useMembersApi(props.org.id)}
      now={now}
      onDeleted={(deleted) => {
        app.putOrg(deleted)
        const next = setupOrg(app.activeOrgs.get())
        go(next ? routes.org(next.id) : routes.getStarted())
      }}
      org={props.org}
      timeZone={timeZone}
      viewport={useMembersViewport()}
    />
  )
}

/**
 * The General tab. An admin renames the org, sets its initials and its
 * colour, and deletes it. A member sees them without fields,
 * because only an admin changes them (decision 57). A suspended org shows
 * them without fields to everyone, and offers Leave org, its one change.
 */
export function GeneralTab(props: { org: OrgSummary; user: User }) {
  const { org } = props
  const access = useOrgAccess(org)
  if (!mayChangeSettings(access)) {
    const { suspended } = access
    return (
      <>
        <Section
          description={suspended ? undefined : 'Only an admin can change it.'}
          title="Org"
        >
          <DetailList
            rows={[
              { term: 'Name', value: org.name },
              { term: 'Initials', value: tileInitials(org) },
              {
                term: 'Colour',
                value: <OrgColorValue value={orgColorOf(org)} />,
              },
            ]}
          />
        </Section>
        {suspended ? <LeaveOrgSection org={org} user={props.user} /> : null}
      </>
    )
  }
  return (
    <>
      <NameSection org={org} />
      <ColorSection org={org} />
      <DeleteSection org={org} />
    </>
  )
}
