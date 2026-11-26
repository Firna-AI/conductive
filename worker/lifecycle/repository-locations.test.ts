import { expect, it } from 'vitest'

import { addedRepositoryLocation } from './repository-locations'

it('keeps recorded names and variables and applies owner and number suffixes to the new folder', () => {
  const recorded = [
    {
      repositoryId: 'first',
      directory: '/home/user/code/Billing',
      variable: 'CONDUCTIVE_REPOSITORY_BILLING_DIR',
    },
    {
      repositoryId: 'second',
      directory: '/home/user/code/Example_Billing_3',
      variable: 'CONDUCTIVE_REPOSITORY_EXAMPLE_BILLING_3_DIR',
    },
  ]
  const location = addedRepositoryLocation(
    { id: 'added', fullName: 'Example/billing' },
    recorded,
    ['EXAMPLE-BILLING', 'example-BILLING-2'],
  )
  expect(location).toEqual({
    repositoryId: 'added',
    directory: '/home/user/code/Example-billing-3',
    variable: 'CONDUCTIVE_REPOSITORY_EXAMPLE_BILLING_3_2_DIR',
  })
})
