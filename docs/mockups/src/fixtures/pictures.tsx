/**
 * The pictures of the image files of the mockups: screenshots of the
 * checkout form of Checkout address autocomplete on a phone. A screenshot
 * keeps its own colours in the light and the dark scheme of the app.
 */

/** The size of each screenshot in CSS px, as its PNG file gives it. */
export const screenshotSize = { width: 780, height: 1688 } as const

const font = "-apple-system, 'SF Pro Text', Inter, sans-serif"

/** A labelled field of the form, with its value. */
function Field(props: {
  y: number
  label: string
  value: string
  focused?: boolean
}) {
  const { y } = props
  return (
    <g>
      <text fill="#6b7280" fontSize="12" x="32" y={y}>
        {props.label}
      </text>
      <rect
        fill="#ffffff"
        height="44"
        rx="10"
        stroke={props.focused ? '#2563eb' : '#d1d5db'}
        strokeWidth={props.focused ? 2 : 1}
        width="326"
        x="32"
        y={y + 8}
      />
      <text fill="#111827" fontSize="15" x="46" y={y + 36}>
        {props.value}
      </text>
    </g>
  )
}

/** The list of address suggestions, which covers the postcode field. */
function Suggestions() {
  const rows = ['Lisboa', 'Porto', 'Braga']
  return (
    <g>
      <rect
        fill="#0f172a"
        height="150"
        opacity="0.08"
        rx="12"
        width="326"
        x="32"
        y="314"
      />
      <rect
        fill="#ffffff"
        height="150"
        rx="12"
        stroke="#e5e7eb"
        width="326"
        x="32"
        y="310"
      />
      {rows.map((city, index) => (
        <g key={city}>
          <text fill="#111827" fontSize="15" x="48" y={344 + index * 48}>
            12 Rua das Flores, {city}
          </text>
          {index > 0 ? (
            <rect
              fill="#f1f5f9"
              height="1"
              width="326"
              x="32"
              y={316 + index * 48}
            />
          ) : null}
        </g>
      ))}
    </g>
  )
}

/**
 * A screenshot of the checkout form on a phone. With `overlap`, the address
 * field has the focus, and its list of suggestions covers the postcode
 * field, as the attached screenshot shows. `label` names the picture for
 * screen readers, as the alt text of the image of the app does.
 */
export function CheckoutPicture(props: { label: string; overlap?: boolean }) {
  const overlap = props.overlap === true
  return (
    <svg
      aria-label={props.label}
      fontFamily={font}
      role="img"
      viewBox="0 0 390 844"
    >
      <rect fill="#f3f4f6" height="844" width="390" />
      <text fill="#111827" fontSize="15" fontWeight="600" x="32" y="32">
        9:41
      </text>
      <rect fill="#111827" height="11" rx="3" width="24" x="334" y="22" />
      <rect fill="#ffffff" height="52" width="390" y="48" />
      <path
        d="M26 64 l-8 10 l8 10"
        fill="none"
        stroke="#111827"
        strokeWidth="2"
      />
      <text
        fill="#111827"
        fontSize="17"
        fontWeight="600"
        textAnchor="middle"
        x="195"
        y="80"
      >
        Checkout
      </text>
      <rect fill="#ffffff" height="420" rx="16" width="358" x="16" y="116" />
      <text fill="#111827" fontSize="16" fontWeight="600" x="32" y="150">
        Shipping address
      </text>
      <Field label="Full name" value="Ana Costa" y={178} />
      <Field
        focused={overlap}
        label="Address"
        value={overlap ? '12 Rua das Fl' : '12 Rua das Flores'}
        y={250}
      />
      {overlap ? (
        <rect fill="#2563eb" height="20" width="1.5" x="142" y="270" />
      ) : null}
      <Field label="Postcode" value="1200-195" y={322} />
      <Field label="City" value="Lisboa" y={394} />
      <Field label="Country" value="Portugal" y={466} />
      {overlap ? <Suggestions /> : null}
      <rect fill="#111827" height="52" rx="12" width="358" x="16" y="760" />
      <text
        fill="#ffffff"
        fontSize="16"
        fontWeight="600"
        textAnchor="middle"
        x="195"
        y="792"
      >
        Continue to payment
      </text>
      <rect fill="#111827" height="5" rx="2.5" width="134" x="128" y="828" />
    </svg>
  )
}
