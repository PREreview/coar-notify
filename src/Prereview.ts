import type * as Doi from './Doi.js'

export function writeAPrereviewUrl(doi: Doi.Doi) {
  return new URL(
    `https://prereview.org/preprints/doi-${doi
      .toLowerCase()
      .replaceAll('-', '+')
      .replaceAll('/', '-')}/write-a-prereview`,
  )
}
