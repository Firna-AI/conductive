import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { useToast } from '@firna/ui/toast'
import { TriangleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/screens/forms.module.css'
import { routes } from '../../app/router'
import { asApiError } from '../../app/store'
import { useApp } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'

/**
 * Creates an org by its name. The org chooses its repositories in its
 * settings after the create, because no route lists them before the org
 * exists. The first org of Get started goes back to Get started; another
 * org opens. On a phone the actions sit in the footer.
 */
export function CreateOrgScreen(props: { first: boolean }) {
  const app = useApp()
  const go = useGo()
  const { toast } = useToast()
  const { field } = useControlSizes()
  const phone = useViewport() === 'phone'
  const [name, setName] = useState('')
  const cancelTo = props.first ? routes.getStarted() : routes.home()
  const create = useAction(async () => {
    const org = await app.createOrg(name.trim())
    if (!props.first) {
      go(routes.org(org.id))
      return
    }
    // The org exists now. A failed refresh warns, and Get started opens.
    await app.refreshGetStarted().catch((error: unknown) => {
      toast({
        title: "The steps didn't update.",
        description: asApiError(error).message,
        tone: 'error',
      })
    })
    go(routes.getStarted())
  })
  const named = name.trim() !== ''
  const submit = () => {
    if (named) create.run()
  }
  const actions = (
    <>
      <ActionButton disabled={create.pending} onPress={() => go(cancelTo)}>
        Cancel
      </ActionButton>
      <ActionButton
        busy={create.pending}
        disabled={!named}
        onPress={submit}
        tone="primary"
      >
        Create org
      </ActionButton>
    </>
  )
  return (
    <Page
      actions={phone ? actions : undefined}
      back={{ label: 'Cancel', to: cancelTo }}
      title="Create an org"
    >
      <div className={styles.form}>
        <Input
          editable={!create.pending}
          label="Name"
          onChangeText={(text) => {
            setName(text)
            create.reset()
          }}
          onSubmitEditing={submit}
          size={field}
          value={name}
        />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Repositories</span>
          <span className={styles.fieldHint}>
            After you create the org, choose its repositories in the org
            settings.
          </span>
        </div>
        {create.error ? (
          <Notice
            body={create.error.message}
            icon={TriangleAlert}
            title="The org wasn't created"
            tone="danger"
          />
        ) : null}
        {phone ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
}
