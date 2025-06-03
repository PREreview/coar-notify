import { Function, Struct } from 'effect'

const servers = {
  advance: 'Advance',
  africarxiv: 'AfricArXiv Preprints',
  arxiv: 'arXiv',
  biorxiv: 'bioRxiv',
  chemrxiv: 'ChemRxiv',
  eartharxiv: 'EarthArXiv',
  ecoevorxiv: 'EcoEvoRxiv',
  edarxiv: 'EdArXiv',
  engrxiv: 'engrXiv',
  'lifecycle-journal': 'Lifecycle Journal',
  osf: 'OSF',
  medrxiv: 'medRxiv',
  metaarxiv: 'MetaArXiv',
  neurolibre: 'NeuroLibre',
  'osf-preprints': 'OSF Preprints',
  'preprints.org': 'Preprints.org',
  psyarxiv: 'PsyArXiv',
  'research-square': 'Research Square',
  scielo: 'SciELO Preprints',
  socarxiv: 'SocArXiv',
  techrxiv: 'TechRxiv',
  zenodo: 'Zenodo',
} as const

export type PreprintServer = keyof typeof servers

export const getName: (server: PreprintServer) => string = Function.flip(Struct.get)(servers)
