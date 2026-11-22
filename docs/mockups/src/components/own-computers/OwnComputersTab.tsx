import { Plus } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { Section, SectionText } from '../settings/Section'
import { OwnComputerList, type ComputerListLinks } from './OwnComputerList'
import { ownComputerWords } from './ownComputerCopy'
import type { OwnComputer } from './ownComputer'
import styles from './OwnComputersTab.module.css'

/**
 * Who reads the tab: an admin, who adds and changes the own computers, a
 * member, who reads them (own computer decision 2 A), or everyone in a
 * suspended org, who reads them under the notice of the org.
 */
export type ComputersAccess = 'admin' | 'member' | 'suspended'

/** The line of an org without own computers, for each reader. */
function emptyText(access: ComputersAccess, org: string): string {
  switch (access) {
    case 'admin':
      return ownComputerWords.emptyAdmin(org)
    case 'member':
      return ownComputerWords.emptyMember(org)
    case 'suspended':
      return ownComputerWords.emptySuspended(org)
  }
}

/** The screens that the tab opens, in the mockups. */
export type ComputersTabLinks = ComputerListLinks & {
  add?: string
  cloudComputer: string
}

/**
 * The Own computers tab of the org settings: the Linux servers that run
 * workspaces of the org, each workspace in its own container. Only an
 * admin adds a computer, sets its limit on its page, and removes it. The
 * note under the list says that each computer builds the setup of the
 * Cloud computer tab, and links to that tab.
 */
export function OwnComputersTab(props: {
  org: string
  computers: readonly OwnComputer[]
  access: ComputersAccess
  links: ComputersTabLinks
}) {
  const { access, links } = props
  const admin = access === 'admin'
  const intro = ownComputerWords.intro(props.org)
  const note = ownComputerWords.setupNote
  const add = <ActionButton icon={Plus}>{ownComputerWords.add}</ActionButton>
  return (
    <Section
      actions={
        admin && links.add ? (
          <ScreenLink asChild to={links.add}>
            {add}
          </ScreenLink>
        ) : admin ? (
          add
        ) : undefined
      }
      description={
        access === 'member' && props.computers.length > 0
          ? `${intro} ${ownComputerWords.memberNote}`
          : intro
      }
      title={ownComputerWords.tab}
    >
      {props.computers.length === 0 ? (
        <SectionText muted>{emptyText(access, props.org)}</SectionText>
      ) : (
        <OwnComputerList
          admin={admin}
          computers={props.computers}
          links={links}
        />
      )}
      <SectionText muted>
        {note.before}
        <ScreenLink className={styles.link} to={links.cloudComputer}>
          {note.link}
        </ScreenLink>
        {note.after}
      </SectionText>
    </Section>
  )
}
