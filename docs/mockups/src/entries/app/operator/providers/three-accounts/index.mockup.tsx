import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorProvidersThreeAccounts = defineScreen({
  title: 'Three accounts',
  description:
    'The settings of the Worker have a third account, e2b-us, so one slider does not fit. Each account has a field in whole percent, in the ID order of the reply, and a line under the fields gives the total. The saved weights give boat 80%, e2b 10%, and e2b-us 10%, with the time and the operator of the change. Orgs by account lists every account, e2b-us with no org.',
  rationale:
    'The settings can name any number of accounts, and the tab must show and set the weight of each one, so it drops no account. A field for each account keeps the approved rule: whole percentages for configured accounts that add up to 100. The fields take the place of the slider only when three or more accounts make a slider impossible.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'saved', accounts: 'three', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'uneven',
      title: 'Total not 100%',
      description:
        'The operator typed 20 for e2b-us, so the weights add up to 110%. The line under the fields gives the total and says that Save weights needs 100%. Save weights stays off until the total is 100%.',
      props: { weights: 'moved' },
    },
  ],
})
