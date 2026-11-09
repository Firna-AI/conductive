import { useCallback, useEffect } from 'react'
import { useNavigation } from '../../app/navigation'
import { routes, type Route } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import { useApp } from '../context'
import { Alone, Loading } from '../layout/Alone'
import { WaitlistScreen } from './WaitlistScreen'

/**
 * What a person without app access sees at every address: the waitlist.
 * A join link uses its code, and its address becomes `/`, so a reload of
 * the page uses the code no more. While the code of the link runs, the app
 * shows its loading state, so a code that works opens the app with no
 * waitlist in between. The app reads the app access again each time that
 * the person comes back to the page, and sets no timer.
 */
export function Waiting(props: { route: Route; user: User }) {
  const { waitlist } = useApp()
  const { onFocus } = useServices()
  const navigation = useNavigation()
  const { code } = useStore(waitlist.state)
  const { route } = props
  const open = useCallback((to: string) => navigation.replace(to), [navigation])
  useEffect(() => waitlist.open(), [waitlist])
  useEffect(
    () => onFocus(() => void waitlist.refresh(open)),
    [onFocus, waitlist, open],
  )
  useEffect(() => {
    if (route.screen !== 'join') return
    open(routes.home())
    void waitlist.join(route.code, route.error, open)
  }, [route, waitlist, open])
  const linkRuns = code.state === 'using' && code.from === 'link'
  if (route.screen === 'join' || linkRuns) return <Loading />
  return (
    <Alone ownBar>
      <WaitlistScreen open={open} user={props.user} />
    </Alone>
  )
}
