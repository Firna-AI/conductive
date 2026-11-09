import { InputFrame } from '@firna/ui/input'
import { Plug } from 'lucide-react'
import { effortLabels, type AgentChoice } from '../../fixtures/agents'
import { noop } from '../../noop'
import { ModelPicker } from '../chat/ModelPicker'
import { useControlSizes } from '../common/touch'
import form from './form.module.css'
import styles from './PromptBox.module.css'

/**
 * The prompt of a routine, with the model and the effort of its runs at
 * the bottom of the box, as in a composer. The owner edits both. Another
 * member reads them. The line under the box names whose logins the runs
 * use (decision 202).
 */
export function PromptBox(props: {
  prompt: string
  choice: AgentChoice
  readOnly: boolean
  /** Whose logins the runs use, such as "your" or "Cal's". */
  whose?: string
  /** The name of the agent of the model, such as "Claude". */
  agent: string
}) {
  const { field } = useControlSizes()
  const { choice } = props
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
            placeholder="What should this routine do?"
            size={field}
            value={props.prompt}
            variant="seamless"
          />
          <div className={styles.bar}>
            <ModelPicker choice={choice} />
          </div>
        </div>
      )}
      {props.whose ? (
        <p className={styles.logins}>
          <Plug aria-hidden className={styles.icon} size={12} />
          <span>
            {`Runs use ${props.whose} ${props.agent} login and GitHub access.`}
          </span>
        </p>
      ) : null}
    </section>
  )
}
