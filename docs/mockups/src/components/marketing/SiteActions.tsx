import { createContext, useContext, type ReactNode } from 'react'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import styles from './SiteActions.module.css'

/**
 * The words of the main action while a new person waits for app access.
 * They promise a place on the waitlist, not use at once. The site shows
 * them at all times except during open sign-up.
 */
const startLabel = 'Join the waitlist'

/**
 * The words of the main action during open sign-up, while each sign-in
 * gets app access at once.
 */
const openStartLabel = 'Start free with GitHub'

/**
 * How a new person gets in: they wait on the waitlist, or open sign-up
 * gives them app access at the sign-in.
 */
export type SiteSignUp = 'waitlist' | 'open'

const SiteSignUpContext = createContext<SiteSignUp>('waitlist')

/** Gives each main action of a page the state of sign-up that it names. */
export function SiteSignUpProvider(props: {
  signUp: SiteSignUp
  children: ReactNode
}) {
  return (
    <SiteSignUpContext.Provider value={props.signUp}>
      {props.children}
    </SiteSignUpContext.Provider>
  )
}

/** The words of the main action in the state of sign-up of the page. */
export function useStartLabel(): string {
  return useContext(SiteSignUpContext) === 'open' ? openStartLabel : startLabel
}

/**
 * The main action of the site, which starts the GitHub sign-in. The first
 * sign-in of a new person puts them on the waitlist, or gives them app
 * access during open sign-up.
 */
export function StartButton(props: {
  to: string
  size: 'md' | 'lg'
  block?: boolean
}) {
  const label = useStartLabel()
  return (
    <ScreenLink asChild to={props.to}>
      <Button
        block={props.block}
        iconNode={<GitHubMark className={styles.mark} size={16} />}
        onPress={noop}
        size={props.size}
        tone="primary"
      >
        {label}
      </Button>
    </ScreenLink>
  )
}

/**
 * The two actions of the site: the main action, and sign in. Both go to
 * the GitHub sign-in, which also creates the account of a new person.
 * `stack` puts them under each other at full width, as on a phone.
 */
export function SiteActions(props: { to: string; stack?: boolean }) {
  return (
    <div className={classes(styles.actions, props.stack && styles.stack)}>
      <StartButton block={props.stack} size="lg" to={props.to} />
      <ScreenLink asChild to={props.to}>
        <Button block={props.stack} onPress={noop} size="lg" tone="secondary">
          Sign in
        </Button>
      </ScreenLink>
    </div>
  )
}
