/**
 * InfiniPol API Envelope utilities.
 *
 * ALL responses from the backend use this shape:
 *   { data: T | null, error: { code, message } | null, meta: { request_id, ... } }
 *
 * This module provides the types and helpers to unwrap them.
 */

export interface ApiEnvelope<T> {
  data: T
  error: null
  meta: ApiMeta
}

export interface ApiErrorEnvelope {
  data: null
  error: ApiErrorBody
  meta: ApiMeta
}

export interface ApiMeta {
  request_id: string
  device_profile?: string
  total?: number
  page?: number
  limit?: number
}

export interface ApiErrorBody {
  code: string
  message: string
}

export type AnyEnvelope<T> = ApiEnvelope<T> | ApiErrorEnvelope

/** Known error codes from the V1 contract */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNSUPPORTED_FILTER'
  | 'NOT_FOUND'
  | 'LIFECYCLE_CONFLICT'
  | 'SIMULATION_NOT_COMPLETE'
  | 'SIMULATION_FAILED'
  | 'MODEL_RUNTIME_ERROR'
  | string // allow unknown codes gracefully

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly requestId?: string
  readonly httpStatus: number

  constructor(code: ApiErrorCode, message: string, httpStatus: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.httpStatus = httpStatus
    this.requestId = requestId
  }
}

/**
 * Unwrap envelope or throw ApiError.
 * Use this after every fetch call.
 */
export function unwrap<T>(envelope: AnyEnvelope<T>, httpStatus: number): T {
  if (envelope.error !== null) {
    throw new ApiError(
      envelope.error.code,
      envelope.error.message,
      httpStatus,
      envelope.meta?.request_id,
    )
  }
  return (envelope as ApiEnvelope<T>).data
}
