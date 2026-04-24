/**
 * Datasets API endpoints
 * Contract ref: docs/contracts/frontend-backend-v1.md — "Datasets"
 */

import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

export type DatasetItem = components['schemas']['DatasetItem']

/**
 * GET /datasets → 200
 * List available synthetic datasets.
 *
 * V1 returns: nemotron_usa (active) + sims_indo_v1 (coming_v2)
 */
export async function listDatasets(): Promise<DatasetItem[]> {
  return api.get<DatasetItem[]>('/datasets')
}
