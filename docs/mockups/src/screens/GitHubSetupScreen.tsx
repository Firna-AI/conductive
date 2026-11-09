import type { SchemaProps, Viewport } from '@mokly/mokly'
import { SitePage } from '../components/marketing/SitePage'
import { TextPage } from '../components/marketing/TextPage'
import { githubSetupCopy } from './githubSetupCopy'

export const githubSetupSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['outcome'],
  properties: {
    /** An install or a change of one, or a request for an install. */
    outcome: { enum: ['installed', 'requested'] },
  },
} as const

export type GitHubSetupState = SchemaProps<typeof githubSetupSchema>

/**
 * The page that the browser shows after an install of the GitHub App that
 * started in the Mac app. The Mac app opens GitHub in the browser, and that
 * browser has no sign-in of the Mac app, so the page only sends the user
 * back. The page runs no script, so it has the look of the pages of the
 * site.
 */
export function GitHubSetupScreen(props: {
  state: GitHubSetupState
  viewport: Viewport
}) {
  const copy = githubSetupCopy[props.state.outcome]
  return (
    <SitePage bare viewport={props.viewport}>
      <TextPage lead={copy.text} title={copy.title} viewport={props.viewport} />
    </SitePage>
  )
}
