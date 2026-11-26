import { Fragment, type ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { KeyRound, Plug, TriangleAlert, type LucideIcon } from 'lucide-react'
import { effortLabels } from '../../../../../src/shared/agents'
import type { AgentChoice } from '../../fixtures/agents'
import { defined } from '../../defined'
import { noop } from '../../../../../src/ui/noop'
import {
  CapabilitiesButton,
  type CapabilitiesControl,
} from '../capabilities/CapabilitiesButton'
import { runSecretsWords } from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import { modelPicker } from '../../entries/components/chat/ModelPicker.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import form from '../../../../../src/ui/components/automations/form.module.css'
import styles from '../../../../../src/ui/components/automations/PromptBox.module.css'

/**
 * Whose logins the runs use, in words: "Runs use your Claude login and
 * GitHub access." When the agent login is not the one of the owner of the
 * GitHub access, the line names both, such as "Runs use Acme's Claude login
 * and your GitHub access." for the org login.
 */
function loginsLine(agent: string, github: string, login: string): string {
  if (login === github) {
    return `Runs use ${github} ${agent} login and GitHub access.`
  }
  return `Runs use ${login} ${agent} login and ${github} GitHub access.`
}

/** A muted line under the box with its icon, as under a composer. */
function Caption(props: {
  icon: LucideIcon
  warning?: boolean
  children: ReactNode
}) {
  const Icon = props.icon
  return (
    <p className={styles.caption}>
      <Icon
        aria-hidden
        className={classes(styles.icon, props.warning && styles.warning)}
        size={12}
      />
      <span>{props.children}</span>
    </p>
  )
}

/** Names in a sentence, such as "A and B", or "A, B, and C". */
const nameList = new Intl.ListFormat('en', { type: 'conjunction' })

/**
 * The line that names the secrets that each run workspace pre-approves,
 * each in the font of an environment variable, such as "Runs can use
 * FIGMA_TOKEN and VERCEL_TOKEN with no question."
 */
function RunSecrets(props: { names: readonly string[] }) {
  return (
    <Caption icon={KeyRound}>
      {runSecretsWords.lead}{' '}
      {nameList.formatToParts(props.names).map((part, index) =>
        part.type === 'element' ? (
          <code className={styles.secret} key={part.value}>
            {part.value}
          </code>
        ) : (
          <Fragment key={index}>{part.value}</Fragment>
        ),
      )}{' '}
      {runSecretsWords.tail}
    </Caption>
  )
}

/**
 * The prompt of an automation, with the model and the effort of its runs at
 * the bottom of the box, as in a composer. The owner edits both, and gets
 * the Capabilities icon before the model picker (automation capabilities
 * decision 1 A). Another member reads them. The lines under the box say
 * what the runs use, for every member. The first names whose logins the
 * runs use (decision 502). A run takes the default login of the owner,
 * which can be the org login (decision 5 A of the org logins plan), so the
 * line can name the org. The next names the secrets that each run
 * workspace pre-approves. While the triggers have a pull request trigger,
 * a hint follows it (automation capabilities decision 3 A). `open` draws
 * the menu of the picker open, and the menu leaves out `hiddenModels`.
 */
export function PromptBox(props: {
  prompt: string
  choice: AgentChoice
  readOnly: boolean
  /** Whose GitHub access the runs use, such as "your" or "Cal's". */
  whose?: string
  /** Whose agent login the runs use, such as "Acme's", when it differs. */
  loginWhose?: string
  /** The name of the agent of the model, such as "Claude". */
  agent: string
  open?: boolean
  hiddenModels?: readonly string[]
  /** The Capabilities icon of the owner, and its control when it is open. */
  capabilities?: CapabilitiesControl
  /** The names of the secrets that each run workspace pre-approves. */
  secrets?: readonly string[]
  /** The triggers have a pull request trigger. */
  pullRequest?: boolean
}) {
  const { field } = useControlSizes()
  const { choice } = props
  const secrets = props.secrets ?? []
  return (
    <section aria-labelledby="prompt-heading" className={styles.wrap}>
      <h2 className={form.label} id="prompt-heading">
        Prompt
      </h2>
      {props.readOnly ? (
        <div className={styles.readOnly}>
          <p className={styles.text}>{props.prompt}</p>
          <span className={styles.model}>
            {choice.model}{' '}
            <span className={styles.effort}>{effortLabels[choice.effort]}</span>
          </span>
        </div>
      ) : (
        <div className={styles.box}>
          <InputFrame
            accessibilityLabel="Prompt"
            focusIndicator="none"
            maxLines={10}
            multiline
            numberOfLines={4}
            onChangeText={noop}
            placeholder="What should this automation do?"
            size={field}
            value={props.prompt}
            variant="seamless"
          />
          <div className={styles.bar}>
            {props.capabilities ? (
              <CapabilitiesButton
                {...props.capabilities}
                placement="above-start"
              />
            ) : null}
            <modelPicker.Component
              choice={choice}
              moklyInstance="prompt-model"
              {...defined({
                hiddenModels: props.hiddenModels,
                open: props.open,
              })}
            />
          </div>
        </div>
      )}
      {props.whose ? (
        <Caption icon={Plug}>
          {loginsLine(
            props.agent,
            props.whose,
            props.loginWhose ?? props.whose,
          )}
        </Caption>
      ) : null}
      {secrets.length > 0 ? <RunSecrets names={secrets} /> : null}
      {secrets.length > 0 && props.pullRequest ? (
        <Caption icon={TriangleAlert} warning>
          {runSecretsWords.pullRequest}
        </Caption>
      ) : null}
    </section>
  )
}
