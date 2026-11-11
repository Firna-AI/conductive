import { useState } from 'react'
import type { BannerState } from '../../shared/github'
import {
  scenarioValues,
  type BarScenario,
} from '../../test-support/fake-bar-dev'
import {
  bannerStates,
  modes,
  schemes,
  turns,
  viewers,
  type DevOptions,
} from './devOptions'
import { samples } from './devSamples'
import styles from './DevPage.module.css'

function Choice<T extends string>(props: {
  label: string
  value: T
  values: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <label className={styles.control}>
      {props.label}
      <select
        onChange={(event) => {
          const next = props.values.find((item) => item === event.target.value)
          if (next) props.onChange(next)
        }}
        value={props.value}
      >
        {props.values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  )
}

/** The controls of the development page. They change the fake API. */
export function DevControls(props: {
  options: DevOptions
  note: string
  onChange: (options: DevOptions) => void
  onEmit: (state: BannerState) => void
  onRecover: () => void
}) {
  const { options, onChange } = props
  const [live, setLive] = useState<BannerState>('merged')
  const answer = <K extends keyof BarScenario>(key: K, label: string) => (
    <Choice
      label={label}
      onChange={(value: BarScenario[K]) =>
        onChange({
          ...options,
          scenario: { ...options.scenario, [key]: value },
        })
      }
      value={options.scenario[key]}
      values={scenarioValues[key]}
    />
  )
  return (
    <div className={styles.controls}>
      <Choice
        label="State"
        onChange={(state) => onChange({ ...options, state })}
        value={options.state}
        values={bannerStates}
      />
      <Choice
        label="Scheme"
        onChange={(scheme) => onChange({ ...options, scheme })}
        value={options.scheme}
        values={schemes}
      />
      <Choice
        label="Viewer"
        onChange={(viewer) => onChange({ ...options, viewer })}
        value={options.viewer}
        values={viewers}
      />
      <Choice
        label="GitHub"
        onChange={(github) => onChange({ ...options, github })}
        value={options.github}
        values={modes}
      />
      <Choice
        label="Sample"
        onChange={(sample) => onChange({ ...options, sample })}
        value={options.sample}
        values={samples}
      />
      <Choice
        label="Turn"
        onChange={(turn) => onChange({ ...options, turn })}
        value={options.turn}
        values={turns}
      />
      {answer('access', 'Access')}
      {answer('method', 'Method')}
      {answer('merge', 'Merge')}
      {answer('work', 'Local work')}
      {answer('continue', 'Continue')}
      <Choice
        label="Live event"
        onChange={setLive}
        value={live}
        values={bannerStates}
      />
      <button onClick={() => props.onEmit(live)} type="button">
        Send
      </button>
      {options.github === 'error' ? (
        <button onClick={props.onRecover} type="button">
          Let GitHub answer
        </button>
      ) : null}
      <span aria-live="polite" className={styles.note}>
        {props.note}
      </span>
    </div>
  )
}
