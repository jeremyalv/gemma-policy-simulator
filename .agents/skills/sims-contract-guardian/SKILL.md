---
name: sims-contract-guardian
description: >
  Contract compliance guardian for Gemma Policy Simulator (SIMS) frontend development.
  Use this skill before writing ANY frontend code, API call, component, or data type
  for the SIMS project. Validates requests against the frozen V1 API contract, flags
  violations, and produces a corrected, contract-compliant plan before implementation begins.
  Trigger on: "buat komponen", "buat halaman", "buat form", "panggil API", "fetch data",
  "tampilkan hasil", "polling", "handle error", atau request apapun yang menyentuh API SIMS.
---

# SIMS V1 Contract Guardian

Sebelum menulis satu baris kode pun, jalankan **Contract Compliance Check** terhadap request user.
Tujuan skill ini: pastikan semua kode frontend yang dihasilkan **100% sesuai** dengan V1 contract
yang sudah di-freeze pada 2026-04-18.

---

## Langkah Wajib (Jalankan Setiap Kali)

### Step 1 — Parse Request User
Identifikasi:
- Endpoint mana yang akan disentuh?
- Shape request/response apa yang diharapkan user?
- Ada asumsi salah tentang struktur data?
- Ada filter, field, atau status yang disebutkan?

### Step 2 — Jalankan Contract Compliance Check
Cocokkan setiap detail dengan referensi di bawah. Tandai setiap item:
- ✅ Sesuai contract
- ⚠️ Perlu klarifikasi
- ❌ Melanggar contract — wajib diperbaiki sebelum implementasi

### Step 3 — Laporkan Temuan
Format output:

```
## Contract Check Report

### ✅ Hal yang sudah benar
- [list]

### ❌ Pelanggaran Contract
- [field/asumsi yang salah] → [yang benar sesuai contract]

### ⚠️ Hal yang perlu diperhatikan
- [edge case atau gotcha penting]

### 📋 Rencana Implementasi yang Compliant
- [step-by-step plan yang sudah disesuaikan]
```

### Step 4 — Implementasi
Baru boleh mulai menulis kode setelah report di atas selesai dan disetujui.

---

## REFERENSI CONTRACT V1 (Frozen 2026-04-18)

### Base URL
```
http://localhost:8000/api/v1
```

---

### Response Envelope — WAJIB di semua response

Semua response — sukses maupun error — SELALU dibungkus envelope ini:

```typescript
// SUCCESS
{
  data: T,        // payload aktual
  error: null,
  meta: {
    request_id: string,
    device_profile?: string,  // hanya di run/status
    total?: number,           // hanya di list
    page?: number,
    limit?: number
  }
}

// ERROR
{
  data: null,
  error: {
    code: string,   // lihat Error Codes di bawah
    message: string
  },
  meta: { request_id: string }
}
```

**❌ Jangan akses `response.id` atau `response.title` langsung — selalu `response.data.id`**

---

### Simulation Lifecycle
```
pending → running → completed
                 → failed
```
- `pending`: baru dibuat, belum di-run
- `running`: sedang proses, bisa di-poll
- `completed`: selesai, bisa ambil results
- `failed`: gagal, tidak ada results

**Lifecycle Rules:**
- Clarification HANYA boleh di-generate saat status = `pending`
- Run HANYA boleh di-trigger saat status = `pending`
- Results HANYA bisa diambil saat status = `completed`
- Attempt run saat sudah `running` → 409 LIFECYCLE_CONFLICT

---

### HTTP Status Codes
| Code | Makna |
|------|-------|
| 200 | Success |
| 201 | Created (POST /simulations) |
| 202 | Accepted async (POST /run) |
| 400 | Bad request / validation error |
| 404 | Resource not found |
| 409 | Lifecycle conflict |
| 500 | Internal / Ollama runtime error |

---

### Error Codes (`error.code`)
| Code | Kapan Muncul |
|------|-------------|
| `VALIDATION_ERROR` | Input tidak valid (sample_size out of range, dll) |
| `UNSUPPORTED_FILTER` | Filter key tidak didukung dataset |
| `NOT_FOUND` | Simulation/clarification ID tidak ada |
| `LIFECYCLE_CONFLICT` | Aksi tidak sesuai dengan status saat ini |

---

## ENDPOINT REFERENCE

### POST `/simulations` → 201
Buat simulation draft. **Tidak menjalankan inference.**

**Request body:**
```typescript
{
  title: string,           // required
  policy_text: string,     // required
  dataset: string,         // required, "nemotron_usa"
  sample_size: number,     // required, integer 20–2000
  filters?: FilterSet      // optional
}
```

**FilterSet — nemotron_usa (FROZEN):**
```typescript
{
  states?: string[],            // ✅ supported
  age_range?: [number, number], // ✅ supported, [min, max], min <= max
  sex?: string[],               // ✅ supported
  marital_status?: string[],    // ✅ supported
  education_level?: string[],   // ✅ supported
  occupation?: string[]         // ✅ supported
}
```

**Filter yang TIDAK BOLEH ada (→ 400 UNSUPPORTED_FILTER):**
- ❌ `income_brackets`
- ❌ `household_income`
- ❌ `ethnicity`

**Rules:**
- Rejection bersifat STRICT: tidak ada partial acceptance, tidak ada silent key dropping
- Mixed supported + unsupported → tetap 400

**Response 201:**
```typescript
{
  data: {
    id: string,           // "sim_..."
    title: string,
    policy_text: string,
    status: "pending",    // selalu pending saat baru dibuat
    dataset: string,
    sample_size: number,
    filters?: FilterSet,
    created_at: string    // ISO 8601
  },
  error: null,
  meta: { request_id: string }
}
```

---

### POST `/simulations/{id}/run` → 202
Trigger async inference. Non-blocking — langsung return tanpa tunggu selesai.

**Request body (semua optional):**
```typescript
{
  profile?: "interactive" | "balanced" | "thorough" | "auto",
  max_duration_seconds?: number,    // integer >= 1
  allow_sample_clamp?: boolean,     // default: true
  use_refined_prompt?: boolean      // default: true
}
```

**`use_refined_prompt` behavior:**
- `true` + ada `refined_policy_text` → pakai refined
- `true` + tidak ada refined → pakai base `policy_text`
- `false` → selalu pakai base `policy_text`

**Idempotency:** Support header `Idempotency-Key: <uuid>` untuk prevent double-run.

**Response 202:**
```typescript
{
  data: {
    id: string,
    status: "running",
    started_at: string,           // ISO 8601
    estimated_seconds: number,
    runtime_profile: RuntimeProfile,
    effective_sample_size: number  // bisa lebih kecil dari sample_size jika di-clamp
  },
  error: null,
  meta: {
    request_id: string,
    device_profile: string        // e.g. "m1_pro_16gb"
  }
}
```

**Errors:** 404 NOT_FOUND, 409 LIFECYCLE_CONFLICT (sudah running/completed)

---

### GET `/simulations/{id}/status` → 200
Poll progress. Panggil setiap **2–3 detik** saat status = `running`.

**Response 200:**
```typescript
{
  data: {
    id: string,
    status: SimulationStatus,
    agents_total: number,
    agents_completed: number,
    progress_pct: number,               // 0.0–100.0
    estimated_seconds_remaining: number,
    runtime_profile: RuntimeProfile,
    effective_sample_size: number
  },
  error: null,
  meta: { request_id: string, device_profile: string }
}
```

**Stop polling saat:** `status === "completed"` atau `status === "failed"`

---

### GET `/simulations/{id}/results` → 200
Fetch hasil lengkap. **Hanya valid setelah status = `completed`.**

**Response 200:**
```typescript
{
  data: {
    id: string,
    summary: {
      mean_approval: number,            // skala 1–5, BUKAN persentase
      approval_distribution: {
        "1": number, "2": number, "3": number, "4": number, "5": number
      },
      dominant_emotion: string,         // "anger"|"concern"|"neutral"|"hope"|"joy"
      behavioral_change_pct: number
    },
    run_config: {
      runtime_profile: RuntimeProfile,
      effective_sample_size: number
    },
    demographic_breakdown: {
      by_age_group: {
        [group: string]: { mean_approval: number, count: number }
      },
      by_marital_status: {
        [status: string]: { mean_approval: number, count: number }
      },
      by_state: {
        [state: string]: number         // langsung number, bukan objek!
      },
      by_occupation_group: {
        [group: string]: any
      }
    },
    emotion_profile: {
      anger: number,     // persentase 0–100
      concern: number,
      neutral: number,
      hope: number,
      joy: number
    },
    representative_quotes: Array<{
      persona_id: string,
      name: string,
      age: number,
      occupation: string,
      city: string,
      state: string,
      approval: number,   // integer 1–5
      emotion: string,
      rationale: string
    }>,
    raw_responses_url: string  // "/api/v1/simulations/{id}/export"
  },
  error: null,
  meta: { request_id: string }
}
```

**⚠️ Gotcha: `by_state` berbeda shape dengan `by_age_group` dan `by_marital_status`:**
- `by_age_group["18-34"]` → `{ mean_approval, count }` (objek)
- `by_state["CA"]` → `3.5` (langsung number)

---

### GET `/simulations` → 200
List semua simulasi dengan pagination.

**Query params:**
```
?page=1&limit=20&status=completed&sort=created_at:desc
```
- `page`: integer >= 1, default 1
- `limit`: integer 1–200, default 20
- `status`: filter by SimulationStatus (optional)
- `sort`: format `field:asc|desc`

**Response 200:**
```typescript
{
  data: Array<{
    id: string,
    title: string,
    status: SimulationStatus,
    sample_size: number,
    mean_approval: number | null,   // null jika belum completed
    created_at: string,
    completed_at: string | null     // null jika belum completed
  }>,
  error: null,
  meta: {
    total: number,
    page: number,
    limit: number,
    request_id: string
  }
}
```

---

### DELETE `/simulations/{id}` → 200

**Response 200:**
```typescript
{
  data: { id: string, deleted: true },
  error: null,
  meta: { request_id: string }
}
```

---

### POST `/simulations/{id}/clarifications/generate` → 200
Generate pertanyaan klarifikasi berikutnya. **Hanya untuk simulasi berstatus `pending`.**

**Request body:**
```typescript
{ focus: string }  // e.g. "policy_scope", "rebate_eligibility"
```

**Response 200:**
```typescript
{
  data: {
    clarification_id: string,   // "cl_..."
    simulation_id: string,
    question_text: string,
    rationale: string,
    status: "open" | "resolved",
    turn_index: number          // mulai dari 1, maks 3
  },
  error: null,
  meta: { request_id: string }
}
```

**Errors:** 404 NOT_FOUND, 409 LIFECYCLE_CONFLICT (non-pending), 500 (Ollama gagal)

---

### POST `/clarifications/{clarification_id}/answer` → 200
Jawab klarifikasi, terima refined prompt + pertanyaan berikutnya (jika ada).

**Request body:**
```typescript
{
  simulation_id: string,
  user_response: string
}
```

**Response 200:**
```typescript
{
  data: {
    simulation_id: string,
    clarification_status: "none" | "in_progress" | "resolved",
    refined_policy_text: string,
    next_clarification_id: string | null,
    next_question_text: string | null
  },
  error: null,
  meta: { request_id: string }
}
```

**Rules:**
- Max 3 turn. Turn ke-3 selalu menghasilkan `clarification_status: "resolved"`
- Jika `next_clarification_id === null` → loop selesai
- Clarification transcript (history Q&A) **tidak disimpan backend** — simpan di frontend state jika perlu ditampilkan

---

### GET `/simulations/{id}/clarifications` → 200
Cek state klarifikasi saat ini (ephemeral).

**Response 200:**
```typescript
{
  data: {
    simulation_id: string,
    clarification_status: "none" | "in_progress" | "resolved",
    has_open_question: boolean,
    latest_refined_policy_text: string
  },
  error: null,
  meta: { request_id: string }
}
```

---

### POST `/simulations/{id}/challenge` → 200 *(di OpenAPI, belum diimplementasi backend)*
Generate challenge dari weak outcomes pasca-run.

**Request:** `{ focus: string }`

**Response:**
```typescript
{
  data: {
    challenge_id: string,
    challenge_text: string,
    evidence: {
      segment: string,
      mean_approval: number,
      top_concern: string
    }
  }
}
```

---

### POST `/challenges/{challenge_id}/followup` → 200 *(di OpenAPI, belum diimplementasi backend)*

**Request:** `{ simulation_id: string, user_response: string }`

**Response:**
```typescript
{
  data: {
    followup_text: string,
    suggested_policy_refinement: string,
    next_challenge_id: string
  }
}
```

---

### GET `/datasets` → 200

**Response 200:**
```typescript
{
  data: Array<{
    id: string,                 // "nemotron_usa" | "sims_indo_v1"
    name: string,
    description: string,
    size?: number,
    attributes?: string[],
    license?: string,
    status?: string             // "coming_v2" jika belum tersedia
  }>,
  error: null,
  meta: { request_id: string }
}
```

---

### GET `/simulations/{id}/export` → 200 CSV
Download raw per-agent responses.

**Response:** `Content-Type: text/csv` — stream langsung, bukan JSON envelope.
**⚠️ Ini satu-satunya endpoint yang tidak pakai JSON envelope.**

---

## SEGMENTASI YANG DIDUKUNG (V1 Frozen)

| Segmentation Key | Status |
|---|---|
| `by_age_group` | ✅ supported |
| `by_marital_status` | ✅ supported |
| `by_state` | ✅ supported |
| `by_occupation_group` | ✅ supported |
| `by_income_bracket` | ❌ unsupported — jangan tampilkan di UI |
| `by_ethnicity` | ❌ unsupported — jangan tampilkan di UI |

---

## ENUM VALUES LENGKAP

```typescript
type SimulationStatus = "pending" | "running" | "completed" | "failed"

type RuntimeProfile = "interactive" | "balanced" | "thorough" | "auto"

type ClarificationStatus = "none" | "in_progress" | "resolved"

type ClarificationQuestionState = "open" | "resolved"

type Emotion = "anger" | "concern" | "neutral" | "hope" | "joy"
```

---

## COMMON PITFALLS — CHECKLIST SEBELUM KODING

### 1. Response Envelope
- [ ] Semua field diakses via `response.data.*`, bukan `response.*`
- [ ] Error dicek via `response.error !== null`, bukan HTTP status saja
- [ ] List pagination ambil dari `response.meta.total`, bukan `response.data.length`

### 2. Approval Scale
- [ ] `mean_approval` adalah skala **1–5**, bukan persentase
- [ ] Jangan tampilkan sebagai "3.2%" — tampilkan sebagai "3.2 / 5"
- [ ] `approval_distribution` key adalah string "1"–"5", bukan integer

### 3. Async Polling Pattern
- [ ] Setelah `POST /run` (202) → langsung mulai polling `/status`
- [ ] Interval polling: 2–3 detik
- [ ] Stop polling: `status === "completed"` ATAU `status === "failed"`
- [ ] Setelah completed: fetch `/results`
- [ ] Handle timeout: jika `estimated_seconds_remaining` sudah lewat jauh, tampilkan warning

### 4. Filter Validation (client-side)
- [ ] Form TIDAK menawarkan field `income_brackets`, `household_income`, `ethnicity`
- [ ] Validasi `sample_size` antara 20–2000 sebelum submit
- [ ] Validasi `age_range[0] <= age_range[1]`
- [ ] `age_range` dikirim sebagai array 2 elemen: `[min, max]`

### 5. Clarification Flow
- [ ] Tampilkan tombol "Skip" agar user bisa langsung run tanpa clarification
- [ ] Simpan history Q&A di **frontend state** (tidak persisted di backend)
- [ ] Setelah `clarification_status === "resolved"` atau `next_clarification_id === null` → stop loop
- [ ] Max 3 turn — jangan izinkan turn ke-4
- [ ] `turn_index` mulai dari 1
- [ ] Clarification hanya bisa di-generate saat `simulation.status === "pending"`

### 6. `effective_sample_size`
- [ ] Tampilkan `effective_sample_size` (dari run/status/results) jika berbeda dari `sample_size` yang diminta
- [ ] Ini terjadi jika `allow_sample_clamp: true` dan device tidak kuat

### 7. `by_state` vs `by_age_group`
- [ ] `by_age_group["18-34"]` → objek `{ mean_approval, count }`
- [ ] `by_state["CA"]` → langsung number (mean_approval saja)
- [ ] Jangan treat keduanya dengan cara yang sama

### 8. Idempotency
- [ ] Tombol "Run" yang bisa diklik ganda → kirim header `Idempotency-Key: <uuid>`
- [ ] Generate UUID baru per klik, bukan per session

### 9. Export Endpoint
- [ ] `/export` tidak return JSON — return CSV stream
- [ ] Handle dengan `window.open()` atau `<a href download>`, bukan `fetch().json()`

### 10. `sims_indo_v1` Dataset
- [ ] Status: `"coming_v2"` — jangan enable di UI untuk V1
- [ ] Tampilkan sebagai "Coming soon" jika perlu ditampilkan

### 11. Endpoint yang Ada di Contract tapi Belum Diimplementasi Backend
- [ ] `GET /datasets` — endpoint ada, mungkin stub
- [ ] `GET /simulations/{id}/results` — endpoint ada, inference belum berjalan sungguhan
- [ ] `GET /simulations/{id}/export` — endpoint ada, CSV belum diimplementasi
- [ ] `POST /simulations/{id}/challenge` — ada di OpenAPI, belum di backend
- [ ] `POST /challenges/{id}/followup` — ada di OpenAPI, belum di backend
- [ ] **Rencanakan UI dengan mock data untuk endpoint-endpoint ini**

---

## POLA KODE YANG DIREKOMENDASIKAN

### API Client Layer (TypeScript)
```typescript
// Selalu unwrap envelope
async function fetchSimulation(id: string): Promise<SimulationDraft> {
  const res = await fetch(`/api/v1/simulations/${id}`)
  const json = await res.json()
  if (json.error) throw new ApiError(json.error.code, json.error.message)
  return json.data
}
```

### Polling Hook
```typescript
// React example
async function pollStatus(simId: string, onUpdate: (s: StatusData) => void) {
  while (true) {
    const status = await getSimulationStatus(simId)
    onUpdate(status)
    if (status.status === 'completed' || status.status === 'failed') break
    await sleep(2500) // 2-3 detik
  }
}
```

### Filter Form Guard
```typescript
const UNSUPPORTED_FILTERS = ['income_brackets', 'household_income', 'ethnicity']
// Jangan render field ini di form
```

### Approval Display
```typescript
// ✅ Benar
`${meanApproval.toFixed(1)} / 5`

// ❌ Salah
`${meanApproval}%`
```

---

## PLANNED V2 ENDPOINTS (Jangan Implement di V1)
- `POST /simulations/compare`
- `GET /simulations/{id}/recommendations`
- Indonesia dataset (`sims_indo_v1`)

---

## REFERENSI FILE CONTRACT
- `docs/contracts/frontend-backend-v1.md` — human-readable contract
- `packages/contracts/openapi/v1.json` — canonical OpenAPI 3.1 spec
- `packages/contracts/python/contracts_v1.py` — TypedDict types (Python)
- `apps/client/AGENTS.md` — client-specific guidance
