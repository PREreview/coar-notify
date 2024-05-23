import { GetWorkError } from '../../src/OpenAlex/OpenAlexApi.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const openAlexGetWorkError = (): fc.Arbitrary<GetWorkError> =>
  fc.string().map(message => new GetWorkError({ message }))
