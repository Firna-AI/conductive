import { defineScreen } from '@mokly/mokly'
import { PhoneApp } from '../../../../components/phone/PhoneApp'
import { phoneToolSchema } from '../../../../screens/phoneToolState'
import { servicesWorkspace } from '../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'

export const phoneBrowserTool = defineScreen({
  title: 'Preview tool',
  description:
    'The Preview tool of the phone app lists the services, then the servers that no service runs, then the Other port row, as the web app lists them. It shows no page in a frame, no tabs of open previews, and no "+". A press on any port of a service or of a server opens the in-app browser, which shows the page of the authorizer first, as phone-app/browser/opening shows, and then the preview, as phone-app/browser shows. Show log and the menu of a service open their views over this tool, as the variants show. A control whose view the phone pages do not draw, such as the session that started a service, shows without a link. The Preview tab of the phone opens this page. The desktop layout of a tablet lists the same rows in the tools panel, and the centre row has no Preview tab. The web app keeps its frame and its tabs, as app/tools/preview shows.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: previews open in the in-app browser with the 60-second grant, so code in a preview never runs with the app session. A frame in the phone app would run the page inside the app, so each port opens the browser. The browser keeps no page in the app, so the tool needs no tabs and no "+", and its list always shows. Each press asks the server for a new launch with its own grant, so each press shows the page of the authorizer first. The catalogue draws the page of one server only, so every port opens that first page, whose host is the same for every port. The controls of the page offer no state that only the web app draws: no preview in a frame, no "+", and no Preview tab. A link of a phone page opens a phone page or a shared page that the phone apps show in the same way, or it has no link.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: phoneToolSchema,
  props: { ...servicesWorkspace, ports: 'detected', tab: 'session' },
  useCasePaths: ['user-flows/open-a-preview-on-a-phone'],
  render: (props, context) => (
    <PhoneApp>
      <WorkspaceScreen state={props} viewport={context.viewport} />
    </PhoneApp>
  ),
  variants: [
    {
      slug: 'log',
      title: 'Log of web',
      description:
        'Show log of web opens its log over the Preview tool: a sheet on a phone, and a dialog on a tablet. It shows the state of web, the end of its output, Reload, and Close. Close shows the tool again.',
      props: { serviceView: 'log' },
    },
    {
      slug: 'log-empty',
      title: 'Empty log',
      description:
        'Show log of worker opens its log, which says that worker has printed nothing yet, with Reload and Close.',
      props: { serviceView: 'log-empty' },
    },
    {
      slug: 'menu',
      title: 'Menu of web',
      description:
        'The menu of web with Restart and Stop: a sheet on a phone, and beside its button in the row on a tablet.',
      props: { serviceView: 'menu' },
    },
  ],
})
