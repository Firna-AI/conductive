import { defineScreen } from '@mokly/mokly'
import { PhoneApp } from '../../../../components/phone/PhoneApp'
import { servicesWorkspace } from '../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../screens/workspaceState'

export const phoneBrowserTool = defineScreen({
  title: 'Preview tool',
  description:
    'The Preview tool of the phone app lists the services, then the servers that no service runs, then the Other port row, as the web app lists them. It shows no page in a frame, no tabs of open previews, and no "+". A press on any port of a service or of a server opens the in-app browser, which shows the page of the authorizer first, as phone-app/browser/opening shows, and then the preview, as phone-app/browser shows. The Preview tab of the phone opens this page. The desktop layout of a tablet lists the same rows in the tools panel, and the centre row has no Preview tab. The web app keeps its frame and its tabs, as app/tools/preview shows.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: previews open in the in-app browser with the 60-second grant, so code in a preview never runs with the app session. A frame in the phone app would run the page inside the app, so each port opens the browser. The browser keeps no page in the app, so the tool needs no tabs and no "+", and its list always shows. Each press asks the server for a new launch with its own grant, so each press shows the page of the authorizer first. The catalogue draws the page of one server only, so every port opens that first page, whose host is the same for every port.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, ports: 'detected', tab: 'session' },
  useCasePaths: ['user-flows/open-a-preview-on-a-phone'],
  render: (props, context) => (
    <PhoneApp>
      <WorkspaceScreen state={props} viewport={context.viewport} />
    </PhoneApp>
  ),
})
