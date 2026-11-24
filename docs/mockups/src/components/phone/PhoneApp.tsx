import { createContext, useContext, type ReactNode } from 'react'

const PhoneAppContext = createContext(false)

/**
 * Marks the screens inside it as the phone apps, as `MacApp` marks the Mac
 * app. The pages of the `phone-app` folder wrap the shared screens that
 * they draw in it.
 */
export function PhoneApp(props: { children: ReactNode }) {
  return (
    <PhoneAppContext.Provider value>{props.children}</PhoneAppContext.Provider>
  )
}

/**
 * The mark of the phone apps as the optional prop of a registered part,
 * such as the tabs of a phone or the tool of the tools panel, whose links
 * open the pages of the phone apps. A screen of another app gets no prop,
 * so its parts do not change. A part reads the mark only from this prop,
 * so that Changes compares it.
 */
export function usePhoneAppProp(): { phoneApp?: true } {
  return useContext(PhoneAppContext) ? { phoneApp: true } : {}
}
