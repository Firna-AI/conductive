import { useState } from 'react'
import { useToast } from '@firna/ui/toast'
import { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import { isOrgRefusal } from '../../app/suspension'

/**
 * A value through a secret form, such as the value of an env var or of a
 * secret. `save` sends the typed value with the write of its caller, and
 * closes the form after the save. The value leaves the browser once and
 * never comes back. A failed save shows its message under the field. A
 * refusal because the org is suspended also ends the permission, so the form
 * closes, and a toast shows the message instead. The value goes out as
 * typed: it may be empty, and its spaces stay.
 */
export function useValueForm(close: () => void) {
  const [form] = useState(() => new SecretForm({ raw: true }))
  const value = useStore(form.value)
  const state = useStore(form.state)
  const { toast } = useToast()
  const save = (name: string, write: (value: string) => Promise<void>) => {
    void form.submit(write).then((saved) => {
      if (saved) {
        close()
        return
      }
      const { error } = form.state.get()
      if (error && isOrgRefusal(error)) {
        toast({
          title: `${name} was not saved`,
          description: error.message,
          tone: 'error',
        })
      }
    })
  }
  return { form, value, state, save }
}
