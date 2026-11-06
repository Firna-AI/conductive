import { Input } from '@firna/ui/input'
import { useToast } from '@firna/ui/toast'
import { Copy, TriangleAlert } from 'lucide-react'
import { productName } from '../../../docs/mockups/src/brand'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/BoatKey.module.css'
import type { SecretForm } from '../../app/secret-form'
import { useServices } from '../../app/services'
import type { BoatKeyProblem } from '../../app/settings-actions'
import { useStore } from '../../app/store'
import { IconButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'

/** The pages of Boat where an admin signs up and makes a key (decision 47). */
const boatPages = {
  signUp: 'https://boat.dev',
  dashboard: 'https://boat.dev/dashboard',
} as const

/**
 * The custom actions that the key needs. Boat's `ci` preset deletes only the
 * sandboxes that its own key created, so the screen asks for these instead.
 */
const boatKeyActions = [
  'account.read',
  'sandbox.create',
  'sandbox.read',
  'sandbox.update',
  'sandbox.stop',
  'sandbox.resume',
  'sandbox.fork',
  'sandbox.delete',
  'exec',
  'snapshot.read',
  'snapshot.write',
  'file.read',
  'host',
  'desktop',
] as const

/** How to make a key. The Boat key tab and Get started both say it. */
export const makeKeyText =
  'Make an API key in the Boat dashboard. Choose Custom actions, add the actions below, and limit the key to one environment.'

/** The actions that the key needs, in one block with a copy button. */
export function BoatKeyActions() {
  const { copy } = useServices()
  const { toast } = useToast()
  const text = boatKeyActions.join(', ')
  return (
    <div className={styles.actions}>
      <code aria-label="Actions of the key" className={styles.actionList}>
        {text}
      </code>
      <IconButton
        icon={Copy}
        label="Copy the actions"
        onPress={() => {
          copy(text).then(
            () => toast({ title: 'The actions are copied.', tone: 'success' }),
            () =>
              toast({
                title: "The actions weren't copied.",
                description: 'Select the text, and copy it.',
                tone: 'error',
              }),
          )
        }}
        quiet
      />
    </div>
  )
}

/** The pages of Boat where an admin signs up and makes a key. */
export function BoatLinks() {
  return (
    <div className={styles.links}>
      <ExternalLink href={boatPages.signUp}>Create a Boat account</ExternalLink>
      <ExternalLink href={boatPages.dashboard}>
        Open the Boat dashboard
      </ExternalLink>
    </div>
  )
}

/**
 * The field of a Boat API key. A pasted key shows only as dots. The key
 * leaves the browser once, when the user saves it.
 */
export function BoatKeyField(props: { form: SecretForm; submit: () => void }) {
  const { field } = useControlSizes()
  const value = useStore(props.form.value)
  const state = useStore(props.form.state)
  return (
    <Input
      autoComplete="off"
      editable={!state.saving}
      error={state.missing ? 'Paste the key first.' : null}
      hint={`${productName} tests the key when you save it, and never shows it again.`}
      invalid={state.error !== null}
      label="API key"
      onChangeText={(text) => props.form.set(text)}
      onSubmitEditing={props.submit}
      placeholder="Paste the key"
      secureTextEntry
      size={field}
      value={value}
    />
  )
}

/** Why Boat refused a key, with the one way forward. */
export function BoatKeyProblemNotice(props: {
  problem: BoatKeyProblem
  orgName: string
  /** The list of the key's actions shows above the field. */
  actionsAbove?: boolean
}) {
  switch (props.problem) {
    case 'refused':
      return (
        <Notice
          body={
            props.actionsAbove === false
              ? 'Check the expiry and the custom actions of the key, then save a new key here.'
              : 'Make a new key with every action above, then save it here.'
          }
          icon={TriangleAlert}
          title="Boat refused this key"
          tone="danger"
        />
      )
    case 'other-account':
      return (
        <Notice
          body={`The cloud computers of ${props.orgName} are in the Boat account of the saved key, and a key of another account can't reach them. Make the new key in that account. The saved key stays in use.`}
          icon={TriangleAlert}
          title="This key is for another Boat account"
          tone="danger"
        />
      )
    case 'unavailable':
      return (
        <Notice
          body="Try again in a moment."
          icon={TriangleAlert}
          title="Boat could not check the key"
          tone="danger"
        />
      )
  }
}
