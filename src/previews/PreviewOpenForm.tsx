import { useState } from 'react'
import { Globe } from 'lucide-react'
import { InputFrame } from '@firna/ui/input'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { useControlSizes } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage } from '../terminal/tool-parts/ToolStates'
import type { ToolError } from '../terminal/tool-parts/request'
import styles from './PreviewOpenForm.module.css'

/** A TCP port from the text of the port field, or null. */
function parsePort(text: string): number | null {
  const digits = text.trim()
  if (!/^\d{1,5}$/.test(digits)) return null
  const port = Number(digits)
  return port >= 1 && port <= 65535 ? port : null
}

/**
 * Asks for the port of a web server in the sandbox. The app does not
 * discover ports, so the user types one.
 */
export function PreviewOpenForm(props: {
  opening: boolean
  error: ToolError | null
  onOpen: (port: number) => void
}) {
  const [text, setText] = useState('')
  /** A press without a port number marks the field, and sends nothing. */
  const [missing, setMissing] = useState(false)
  const { field } = useControlSizes()
  const port = parsePort(text)
  const submit = () => {
    setMissing(port === null)
    if (port !== null && !props.opening) props.onOpen(port)
  }
  const change = (next: string) => {
    setText(next)
    setMissing(false)
  }
  return (
    <ToolMessage
      action={
        <div className={styles.form}>
          <div className={styles.open}>
            <div className={styles.port}>
              <InputFrame
                accessibilityLabel="Port"
                inputMode="numeric"
                invalid={missing || props.error !== null}
                onChangeText={change}
                onSubmitEditing={submit}
                placeholder="3000"
                size={field}
                value={text}
              />
            </div>
            <ToolButton busy={props.opening} onPress={submit} tone="primary">
              Open preview
            </ToolButton>
          </div>
          {props.error ? (
            <p className={styles.error} role="alert">
              The preview couldn&apos;t open. {props.error.message}
            </p>
          ) : null}
        </div>
      }
      body="Open a web server that runs in this sandbox."
      icon={Globe}
      title="Preview a port"
    />
  )
}
