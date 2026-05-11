/**
 * SIMS API — Public barrel export
 * Import everything from '@/api' in components and hooks.
 */

export { api, apiFetch } from './client'
export type { FetchOptions } from './client'

export {
  createSimulation,
  listSimulations,
  deleteSimulation,
  runSimulation,
  getSimulationStatus,
  getSimulationResults,
} from './endpoints/simulations'

export type {
  SimulationStatus,
  RuntimeProfile,
  FilterSet,
  SimulationDraft,
  SimulationListItem,
  SimulationStatusData,
  RunTelemetry,
  SimulationResultsData,
  RunAcceptedData,
  DeleteSimulationData,
  CreateSimulationParams,
  RunSimulationParams,
  ListSimulationsParams,
  ListSimulationsResponse,
} from './endpoints/simulations'

export {
  generateClarification,
  answerClarification,
  getClarificationState,
} from './endpoints/clarifications'

export type {
  ClarificationStatus,
  ClarificationQuestionData,
  ClarificationAnswerData,
  ClarificationStateData,
} from './endpoints/clarifications'

export {
  generateChallenge,
  submitChallengeFollowup,
} from './endpoints/challenge'

export type {
  ChallengeData,
  ChallengeFollowupData,
} from './endpoints/challenge'

export { listDatasets } from './endpoints/datasets'
export type { DatasetItem } from './endpoints/datasets'

export { downloadSimulationCsv, getExportUrl, fetchSimulationCsv } from './endpoints/export'

export { ApiError, unwrap } from '@/lib/envelope'
export type { ApiErrorCode, ApiMeta, ApiEnvelope } from '@/lib/envelope'

// ── Convenience re-exports from OpenAPI schema ────────────────────────────────
import type { components } from './types.gen'
export type ApprovalDistribution = components['schemas']['ApprovalDistribution']
export type DemographicBreakdown = components['schemas']['DemographicBreakdown']
export type EmotionProfile       = components['schemas']['EmotionProfile']
export type RepresentativeQuote  = components['schemas']['RepresentativeQuote']
