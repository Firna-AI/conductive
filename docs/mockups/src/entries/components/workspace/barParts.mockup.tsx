import { defineComponent } from '@mokly/mokly'
import {
  BarGitHubLink,
  Branches,
  GitHubLink,
  PullRequestNumber,
  StateLabel,
} from '../../../components/workspace/barParts'
import { barLabels } from '../../../../../../src/ui/components/workspace/barCopy'
import { prStatus } from '../../../components/workspace/prStatus'
import { pullRequest } from '../../../fixtures/pullRequests'
import { runWorkspaces } from '../../../fixtures/runWorkspaces'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { icons } from '../common/icons'
import { workspaceSchema } from '../workspaces/workspaceSchemas'
import { prStatusData, prStatusSchema } from './barSchemas'

/** A web address outside the app, such as a pull request on GitHub. */
const hrefSchema = { type: 'string', minLength: 1 } as const

/** A link to the pull request on GitHub, registered with Mokly. */
export const githubLink = defineComponent({
  slug: 'github-link',
  title: 'GitHub link',
  description:
    'A link to the pull request on GitHub: the GitHub mark, its words, and an arrow. When the bar has no room for the words, such as beside an action in a narrow column, the mark takes their place, and the link keeps its name as a tooltip. On desktop, the tooltip also names the key of Open PR on GitHub. Its own page shows Open on GitHub.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['href', 'label'],
    properties: { href: hrefSchema, label: { type: 'string' } },
  } as const,
  props: { href: pullRequest.url, label: barLabels.openOnGitHub },
  render: (props) => <GitHubLink href={props.href} label={props.label} />,
})

/** The number of the pull request, registered with Mokly. */
export const pullRequestNumber = defineComponent({
  slug: 'pull-request-number',
  title: 'Pull request number',
  description:
    'The number of the pull request at the start of the bar, which opens it on GitHub. An arrow after the number marks the link, so the bar needs no other link to the pull request. Its own page shows #482.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['number', 'href'],
    properties: {
      number: { type: 'integer', minimum: 1 },
      href: hrefSchema,
    },
  } as const,
  props: { number: pullRequest.number, href: pullRequest.url },
  render: (props) => (
    <PullRequestNumber href={props.href} number={props.number} />
  ),
})

/** The link of the bar to the pull request on GitHub, registered with Mokly. */
export const barGitHubLink = defineComponent({
  slug: 'bar-github-link',
  title: 'Bar GitHub link',
  description:
    'Open on GitHub, the link of the pull request bar to its pull request, as the top of the Checks tab of a phone shows it.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <BarGitHubLink />,
})

/** The branch and its base branch, registered with Mokly. */
export const branches = defineComponent({
  slug: 'branches',
  title: 'Branches',
  description:
    'The branch of a workspace and the base branch that its work goes to, with an arrow between them, as a bar without a pull request shows them. A long base branch, such as the head branch of a pull request, takes at most half of the line, so both names show their start. Its own page shows the branch of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['workspace'],
    properties: { workspace: workspaceSchema },
  } as const,
  props: { workspace: checkoutAutocomplete },
  render: (props) => <Branches workspace={props.workspace} />,
  variants: [
    {
      slug: 'long-base',
      title: 'Long base branch',
      description:
        'The workspace of a pull request run, whose base branch is the head branch of the pull request.',
      props: { workspace: runWorkspaces['pull-request'].workspace },
    },
  ],
})

/** The state of a pull request, registered with Mokly. */
export const stateLabel = defineComponent({
  slug: 'state-label',
  title: 'State label',
  description:
    'The state of a pull request in its bar and its row: an icon, or a spinner while the checks run, and its words. Its own page shows a pull request that is ready to merge.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: { status: prStatusSchema },
  } as const,
  props: { status: prStatusData(prStatus('ready-to-merge')) },
  render: (props) => {
    const { icon, ...status } = props.status
    return (
      <StateLabel
        status={{
          ...status,
          icon: icon === undefined ? undefined : icons[icon],
        }}
      />
    )
  },
  variants: [
    {
      slug: 'checks-running',
      title: 'Checks running',
      description: 'A spinner in place of the icon while the checks run.',
      props: { status: prStatusData(prStatus('checks-running')) },
    },
    {
      slug: 'checks-failed',
      title: 'Checks failed',
      description: 'The count of the checks that failed.',
      props: { status: prStatusData(prStatus('checks-failed')) },
    },
  ],
})
