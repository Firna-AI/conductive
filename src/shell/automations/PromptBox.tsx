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
 * Whose agent login and GitHub access the runs use, under the prompt, such
 * as "Runs use your Claude login and GitHub access." `login` names the
 * owner of the agent login when it is not `whose`, the owner of the GitHub
 * access: the line then names both, such as "Runs use Acme's Claude login
 * and your GitHub access." for the org login.
 */
function Logins(props: { whose: string; login?: string; choice: AgentChoice }) {
  const agent = agentNames[props.choice.agent]
  const login = props.login ?? props.whose
  return (
    <p className={styles.logins}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span>
        {login === props.whose
          ? `Runs use ${props.whose} ${agent} login and GitHub access.`
          : `Runs use ${login} ${agent} login and ${props.whose} GitHub access.`}
      </span>
    </p>
  )
}

/**
 * The prompt of an automation, which the owner writes, with the model and the
 * effort of its runs at the bottom of the box, as in a composer. The line
 * under the box names the logins of the runs. A run takes the default login
 * of the owner (org login decision 5 A), so `login` names the org, such as
 * "Acme's", while that is the org login.
 */
export function PromptEditor(props: {
  prompt: string
  choice: AgentChoice
  models: readonly AgentModel[]
  login?: string
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
      <Logins choice={props.choice} login={props.login} whose="your" />
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
  /** Whose logins the runs use, such as "Cal's", or none. */
  whose: string | null
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
      {props.whose ? <Logins choice={choice} whose={props.whose} /> : null}
    </section>
  )
}
