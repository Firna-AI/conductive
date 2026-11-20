import { useEffect, useState } from 'react'
import { OperatorPause } from '../../app/operator-pause'
import { OperatorSwitch } from '../../app/operator-switch'
import type { OperatorView } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import { useApp } from '../context'
import { PhoneFrame } from '../layout/frames'
import { NotAvailable, RailFrame } from '../OrgRoutes'
import { useViewport } from '../ui/viewport'
import { CodesTab } from './CodesTab'
import { OrgPage } from './OrgPage'
import { OrgsTab } from './OrgsTab'
import { OverviewTab } from './OverviewTab'
import { PauseContext } from './pause-context'
import { ProvidersTab } from './ProvidersTab'
import { SwitchContext } from './switch-context'
import { UserPage } from './UserPage'
import { UsersTab } from './UsersTab'
import { WaitlistTab } from './WaitlistTab'

function OperatorBody(props: { view: OperatorView; user: User }) {
  const { view } = props
  switch (view.page) {
    case 'overview':
      return <OverviewTab />
    case 'orgs':
      return <OrgsTab search={view.search} />
    case 'users':
      return <UsersTab search={view.search} />
    case 'waitlist':
      return <WaitlistTab search={view.search} />
    case 'codes':
      return <CodesTab search={view.search} />
    case 'providers':
      return <ProvidersTab />
    case 'org':
      return <OrgPage key={view.id} orgId={view.id} />
    case 'user':
      return (
        <UserPage
          githubId={view.githubId}
          key={view.githubId}
          self={view.githubId === props.user.githubId}
        />
      )
  }
}

/**
 * The page of a view: a new page reads the pause and the switch again, a
 * new search does not.
 */
function pageOf(view: OperatorView): string {
  switch (view.page) {
    case 'org':
      return `org:${view.id}`
    case 'user':
      return `user:${view.githubId}`
    default:
      return view.page
  }
}

/**
 * The pages of an operator. Each page reads the pause of sign-ups and the
 * waitlist switch when it opens, as it reads its own data, so that its
 * notices are up to date. Each read keeps its own state, so a failure of
 * one leaves the other in place.
 */
function OperatorScreen(props: { view: OperatorView; user: User }) {
  const app = useApp()
  const [pause] = useState(() => new OperatorPause(app))
  const [waitlist] = useState(() => new OperatorSwitch(app))
  const page = pageOf(props.view)
  useEffect(() => pause.state.watch(), [pause, page])
  useEffect(() => waitlist.state.watch(), [waitlist, page])
  return (
    <PauseContext.Provider value={pause}>
      <SwitchContext.Provider value={waitlist}>
        <OperatorBody user={props.user} view={props.view} />
      </SwitchContext.Provider>
    </PauseContext.Provider>
  )
}

/**
 * The operator section, with the rail on desktop and alone on a phone. It has
 * no sidebar, also in the Mac app. A person who is not an operator gets the
 * not-found page of the app, as at any unknown address, and the app sends no
 * operator request. So does an operator whose operator request the API refuses.
 */
export function OperatorRoutes(props: { view: OperatorView; user: User }) {
  const operator = useStore(useApp().account.account)?.operator === true
  const phone = useViewport() === 'phone'
  const page = operator ? (
    <OperatorScreen user={props.user} view={props.view} />
  ) : (
    <NotAvailable title="This page is not available" />
  )
  if (phone) return <PhoneFrame>{page}</PhoneFrame>
  return (
    <RailFrame current={operator ? 'operator' : null} user={props.user}>
      {page}
    </RailFrame>
  )
}
