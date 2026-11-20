import { InputFrame } from '@firna/ui/input'
import { Plug } from 'lucide-react'
import { effortLabels } from '../../../../../src/shared/agents'
import type { AgentChoice } from '../../fixtures/agents'
import { defined } from '../../defined'
import { noop } from '../../noop'
import { modelPicker } from '../../entries/components/chat/ModelPicker.mockup'
import { useControlSizes } from '../common/touch'
import form from './form.module.css'
import styles from './PromptBox.module.css'

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

/**
 * The prompt of an automation, with the model and the effort of its runs at
 * the bottom of the box, as in a composer. The owner edits both. Another
 * member reads them. The line under the box names whose logins the runs
 * use (decision 502). A run takes the default login of the owner, which
 * can be the org login (decision 5 A of the org logins plan), so the line
 * can name the org. `open` draws the menu of the picker open, and the menu
 * leaves out `hiddenModels`.
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
            placeholder="What should this automation do?"
            size={field}
            value={props.prompt}
            variant="seamless"
          />
          <div className={styles.bar}>
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
        <p className={styles.logins}>
          <Plug aria-hidden className={styles.icon} size={12} />
          <span>
            {loginsLine(
              props.agent,
              props.whose,
              props.loginWhose ?? props.whose,
            )}
          </span>
        </p>
      ) : null}
    </section>
  )
}
