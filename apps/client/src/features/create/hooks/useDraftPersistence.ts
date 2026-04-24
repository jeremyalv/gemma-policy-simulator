/**
 * useDraftPersistence — auto-save and restore CreatePage form drafts via localStorage.
 *
 * Key: 'infinipol:create-draft'
 * Saves on every form value change (debounced 500ms via useEffect deps).
 * Returns: { hasDraft, loadDraft, clearDraft, saveDraft }
 *
 * Contract: does NOT persist `from_simulation_id` state — that lives in router state only.
 */

import { useCallback } from 'react'
import { CREATE_FORM_DEFAULTS } from '../schema'
import type { CreateSimulationFormValues } from '../schema'

const DRAFT_KEY    = 'infinipol:create-draft'
const DRAFT_VERSION = 1

interface PersistedDraft {
  version: number
  savedAt: string
  values:  CreateSimulationFormValues
}

// ── Pure helpers (usable outside React) ──────────────────────────────────────

export function readDraft(): PersistedDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedDraft
    if (parsed.version !== DRAFT_VERSION) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeDraft(values: CreateSimulationFormValues): void {
  try {
    const draft: PersistedDraft = {
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      values,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // localStorage quota exceeded or private mode — silently ignore
  }
}

export function removeDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

// ── React hook ───────────────────────────────────────────────────────────────

export function useDraftPersistence() {
  const saveDraft = useCallback((values: CreateSimulationFormValues) => {
    // Don't persist an empty draft (default values only)
    const isEmpty =
      !values.title.trim() &&
      !values.policy_text.trim() &&
      values.sample_size === CREATE_FORM_DEFAULTS.sample_size &&
      values.dataset === CREATE_FORM_DEFAULTS.dataset

    if (isEmpty) {
      removeDraft()
    } else {
      writeDraft(values)
    }
  }, [])

  const loadDraft = useCallback((): CreateSimulationFormValues | null => {
    return readDraft()?.values ?? null
  }, [])

  const clearDraft = useCallback(() => {
    removeDraft()
  }, [])

  const draftMeta = readDraft()

  return {
    /** True when a non-empty draft exists in localStorage */
    hasDraft:   draftMeta !== null,
    /** ISO timestamp of when the draft was last saved */
    draftSavedAt: draftMeta?.savedAt ?? null,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}
