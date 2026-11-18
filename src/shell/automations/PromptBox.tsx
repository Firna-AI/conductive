import type { AgentModel } from '../../shared/generated/AgentModel'
import { useId } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Plug } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import form from '../../../docs/mockups/src/components/automations/form.module.css'
import styles from '../../../docs/mockups/src/components/automations/PromptBox.module.css'
import { effortLabels, modelLabel } from '../../shared/agents'
import { agentNames } from '../account/labels'
import { ModelPicker } from '../ui/ModelPicker'

/**
 * Whose logins the runs use, for the line under the prompt: `login` names
 * the owner of the agent login, and `github` the owner of the GitHub
 * access, such as "Acme's" and "your".
 */
export interface RunLogins {
  login: string
  github: string
}

/**
 * Whose agent login and GitHub access the runs use, under the prompt, such
 * as "Runs use your Claude login and GitHub access." When the agent login
 * has another owner, the line names both, such as "Runs use Acme's Claude
 * login and your GitHub access." for the org login.
 */
function Logins(props: RunLogins & { choice: AgentChoice }) {
  const agent = agentNames[props.choice.agent]
  return (
    <p className={styles.logins}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span>
        {props.login === props.github
          ? `Runs use ${props.github} ${agent} login and GitHub access.`
          : `Runs use ${props.login} ${agent} login and ${props.github} GitHub access.`}
      </span>
    </p>
  )
}

/**
 * The prompt of an automation, which the owner writes, with the model and the
 * effort of its runs at the bottom of the box, as in a composer. The line
 * under the box names the logins of the runs. A run takes the default login
 * of the owner (org login decision 5 A), so `login` names the org, such as
 * "Acme's", while that is the org login, and else "your".
 */
export function PromptEditor(props: {
  prompt: string
  choice: AgentChoice
  models: readonly AgentModel[]
  login: string
  changePrompt: (prompt: string) => void
  changeChoice: (choice: AgentChoice) => void
}) {
  const heading = useId()
  const { field } = useControlSizes()
  return (
    <section aria-labelledby={heading} className={styles.wrap}>
      <h2 className={form.label} id={heading}>
        Prompt
      </h2>
      <div className={styles.box}>
        <InputFrame
          accessibilityLabel="Prompt"
          focusIndicator="none"
          maxLines={10}
          multiline
          numberOfLines={4}
          onChangeText={props.changePrompt}
          placeholder="What should this automation do?"
          size={field}
          value={props.prompt}
          variant="seamless"
        />
        <div className={styles.bar}>
          <ModelPicker
            change={props.changeChoice}
            choice={props.choice}
            models={props.models}
          />
        </div>
      </div>
      <Logins choice={props.choice} github="your" login={props.login} />
    </section>
  )
}

/**
 * The prompt and the model as another member reads them. A suspended org
 * starts no run, so its page names no logins.
 */
export function PromptFacts(props: {
  prompt: string
  choice: AgentChoice
  models: readonly AgentModel[]
  /** Whose logins the runs use, or null for none. */
  logins: RunLogins | null
}) {
  const heading = useId()
  const { choice } = props
  return (
    <section aria-labelledby={heading} className={styles.wrap}>
      <h2 className={form.label} id={heading}>
        Prompt
      </h2>
      <div className={styles.readOnly}>
        <p className={styles.text}>{props.prompt}</p>
        <span className={styles.model}>
          {modelLabel(props.models, choice)}{' '}
          <span className={styles.effort}>{effortLabels[choice.effort]}</span>
        </span>
      </div>
      {props.logins ? <Logins choice={choice} {...props.logins} /> : null}
    </section>
  )
}
