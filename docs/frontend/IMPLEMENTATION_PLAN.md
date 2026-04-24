# SIMS Frontend — Implementation Plan (8 Days)

> **Proyek:** Gemma Policy Simulator (SIMS) — Frontend Prototype
> **Timeline:** 8 hari kerja
> **Eksekutor AI:** Claude Sonnet (via Claude Code)
> **Token Budget:** 2× kapasitas Claude Pro per hari (≈ 16× total)
> **Output:** Prototype frontend yang contract-compliant, bisa di-deploy sebagai web app (self-hosted VPS atau cloud) maupun lokal, dan siap di-personalisasi per institusi/negara.
> **Dataset:** NVIDIA Nemotron-Personas-USA (1M records, CC BY 4.0) — US pilot, arsitektur dirancang global-first untuk ekspansi multi-negara.
> **Deployment target:** Web app (primary) + self-hosted (secondary). Bukan offline-only.

---

## 0. Executive Summary

### Keputusan Arsitektural Utama
1. **Desain base:** Opsi 2 "Document Studio" — paling cepat dibangun, paling mudah di-demo ke stakeholder, theming paling simpel.
2. **Results page:** Hybrid — pinjam elemen dashboard dari Opsi 3 "Analyst Workbench" karena results butuh density visual tinggi.
3. **Tech stack:** React + Vite + TypeScript + Tailwind CSS + Mantine UI + Recharts + Nivo + TanStack Query.
4. **Theming:** Multi-tenant via CSS Custom Properties + config file per institusi. Default theme: global-neutral (US pilot), extensible per negara/institusi.
5. **Web-deployable:** Dirancang sebagai web app yang bisa di-host di VPS/cloud maupun dijalankan lokal. Asset statis (map TopoJSON, fonts) di-bundle untuk reliabilitas, bukan untuk offline-first.
6. **Global-first architecture:** Semua string UI via i18n keys dari awal (EN default). Map component dirancang swappable per negara. Dataset selector extensible untuk negara lain.
7. **Contract compliance:** Semua API call go through single typed adapter layer yang auto-generate dari `packages/contracts/openapi/v1.json`.

### Deliverables Akhir (Day 8)
- ✅ Prototype frontend berjalan sebagai web app (localhost dev + production build siap deploy VPS/cloud)
- ✅ 7 halaman fungsional: Dashboard, Create, Clarification, Progress, Results, Challenge, **Policy Comparison**
- ✅ 4 theme template: Global Default (US), Gov Formal, Think Tank Modern, Academic Warm
- ✅ Type-safe API client dari OpenAPI
- ✅ Mock data mode untuk development tanpa backend
- ✅ Docker Compose untuk self-hosted deploy satu-perintah
- ✅ Dokumentasi theming, customization, dan cara tambah dataset negara baru
- ✅ Challenge & Policy Refinement loop (post-run)
- ✅ Policy Comparison panel — bandingkan hasil simulasi dengan kebijakan serupa (V1: static database)

---

## 1. Design Direction

### 1.1 Overall Aesthetic
**"Institutional clarity with editorial warmth."**

Tool ini digunakan oleh policymaker, researcher, dan analis di lembaga pemerintah atau think tank. Desain harus:
- **Serius tapi tidak kaku** — hindari "corporate dashboard" yang dingin
- **Trustworthy** — typography dan spacing yang "institutional"
- **Data-forward** — charts dan angka adalah hero, bukan decoration
- **Calm** — user akan habiskan waktu lama di page ini, jangan bikin cape

### 1.2 Color System

#### Semantic Color Tokens (akan dipakai seluruh aplikasi)

```css
/* === Core Neutrals === */
--color-bg-base: #FAFAF8;      /* warm off-white, main background */
--color-bg-surface: #FFFFFF;   /* cards, modals */
--color-bg-subtle: #F4F2ED;    /* input background, subtle separators */
--color-bg-muted: #EFEDE6;     /* disabled state */

--color-text-primary: #1C1917;    /* headings, primary text */
--color-text-secondary: #44403C;  /* body, labels */
--color-text-tertiary: #78716C;   /* hints, captions */
--color-text-disabled: #A8A29E;

--color-border-subtle: #E7E5E0;
--color-border-default: #D6D3CE;
--color-border-strong: #A8A29E;

/* === Brand Accents (Default Theme - "Government Green") === */
--color-accent-primary: #1B4332;      /* deep green - buttons, links */
--color-accent-primary-hover: #2D5F4A;
--color-accent-primary-subtle: #E8F0EB;

--color-accent-secondary: #C8A951;    /* gold - highlights, badges */
--color-accent-secondary-subtle: #FDF6E3;

/* === Status Colors === */
--color-status-success: #15803D;    /* completed */
--color-status-warning: #B45309;    /* pending/running */
--color-status-error: #B91C1C;      /* failed */
--color-status-info: #1E40AF;       /* informational */

/* === Data Visualization Palette ===
   Dirancang untuk approval 1-5 (skala divergent) dan emotion (5 kategori) */

/* Approval: diverging scale */
--color-data-approval-1: #B91C1C;   /* sangat tidak setuju - deep red */
--color-data-approval-2: #EA580C;   /* tidak setuju - orange */
--color-data-approval-3: #A8A29E;   /* netral - gray */
--color-data-approval-4: #65A30D;   /* setuju - lime */
--color-data-approval-5: #15803D;   /* sangat setuju - deep green */

/* Emotion: categorical palette */
--color-data-emotion-anger: #B91C1C;     /* red */
--color-data-emotion-concern: #B45309;   /* amber */
--color-data-emotion-neutral: #78716C;   /* warm gray */
--color-data-emotion-hope: #0369A1;      /* blue */
--color-data-emotion-joy: #15803D;       /* green */
```

#### Theme Variants (untuk multi-institusi)

> **Naming convention:** Theme names bersifat role-based, bukan country-specific, supaya bisa dipakai institusi mana saja di dunia.

**Theme: `global-default`** ← default untuk US pilot & global rollout
- Primary: `#1B4332` (deep green — netral, institutional)
- Secondary: `#C8A951` (gold)

**Theme: `gov-formal`** (kementerian, badan negara — manapun)
- Primary: `#003366` (navy)
- Secondary: `#D4AF37` (gold)

**Theme: `think-tank-modern`** (research institute, think tank)
- Primary: `#6366F1` (indigo)
- Secondary: `#F59E0B` (amber)

**Theme: `academic-warm`** (universitas, lembaga riset akademik)
- Primary: `#7C2D12` (maroon)
- Secondary: `#CA8A04` (mustard)

Theme di-switch via satu config file JSON per institusi, tanpa rebuild aplikasi.

**Lokalisasi tema:** Tiap negara bisa punya sub-theme (e.g., `gov-formal-id` untuk Indonesia, `gov-formal-us` untuk Amerika) yang hanya override logo, nama institusi, dan aksen warna spesifik.

### 1.3 Typography

```css
/* Font stack - semua self-hosted (offline-first) */
--font-serif: "Source Serif 4", "Lora", Georgia, serif;  /* headings */
--font-sans: "IBM Plex Sans", -apple-system, sans-serif; /* body */
--font-mono: "JetBrains Mono", ui-monospace, monospace;  /* numbers, code */

/* Type scale - modular scale 1.25 */
--text-xs: 0.75rem;    /* 12px - captions, labels */
--text-sm: 0.875rem;   /* 14px - body small */
--text-base: 1rem;     /* 16px - body default */
--text-lg: 1.125rem;   /* 18px - lead */
--text-xl: 1.25rem;    /* 20px - h4 */
--text-2xl: 1.563rem;  /* 25px - h3 */
--text-3xl: 1.953rem;  /* 31px - h2 */
--text-4xl: 2.441rem;  /* 39px - h1 */
--text-5xl: 3.052rem;  /* 49px - display */

/* Line heights */
--leading-tight: 1.2;   /* headings */
--leading-normal: 1.5;  /* body */
--leading-relaxed: 1.7; /* long reads */
```

**Rules:**
- Semua heading (`h1`, `h2`, `h3`) pakai `--font-serif`
- Body, labels, buttons pakai `--font-sans`
- Semua angka di chart/metric pakai `--font-mono` dengan `tabular-nums` feature

### 1.4 Spacing & Layout

```css
/* 4px baseline grid */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-24: 6rem;    /* 96px */

/* Max widths */
--max-w-prose: 65ch;      /* untuk teks kebijakan, rationale */
--max-w-content: 860px;   /* document-style content */
--max-w-dashboard: 1440px; /* results page */
```

### 1.5 Component Primitives

Semua component lean pada Mantine UI sebagai base, lalu override via theme:
- `Button`, `TextInput`, `Textarea`, `Select`, `Chip`, `Modal`, `Drawer`
- Custom: `PolicyCard`, `ApprovalGauge`, `EmotionRadar`, `StateHeatmap`, `PersonaQuoteCard`

---

## 2. Personas

### Persona 1: **Dr. Rania — Policy Researcher (Primary)**
- **Umur:** 38
- **Jabatan:** Senior Research Fellow di think tank kebijakan publik
- **Tech-savviness:** Menengah-tinggi (familiar dengan Excel, R, Tableau)
- **Goal:** Menguji reaksi publik terhadap draft kebijakan fiskal sebelum dipresentasikan ke DPR
- **Pain points:**
  - Survei online mahal dan lambat (2-3 minggu)
  - Focus group bias ke demografi tertentu
  - Butuh hasil yang defensible dan reproducible
- **Frekuensi pakai:** 3-5 simulasi per minggu
- **Device:** MacBook Pro 14", kadang iPad untuk preview hasil
- **Kebutuhan UI khusus:**
  - Filter demografi yang granular
  - Export ke PDF untuk laporan
  - History simulasi dengan labeling

### Persona 2: **Bapak Hendra — Senior Policymaker**
- **Umur:** 54
- **Jabatan:** Direktur di kementerian
- **Tech-savviness:** Rendah-menengah (mostly email + PowerPoint)
- **Goal:** Memahami implikasi kebijakan yang disiapkan stafnya, bukan membangun simulasi sendiri
- **Pain points:**
  - Laporan teknis terlalu panjang
  - Butuh "bottom line" cepat: apakah kebijakan akan diterima publik?
- **Frekuensi pakai:** 1-2× seminggu, review hasil yang sudah jadi
- **Device:** Laptop kantor (Windows, 15"), occasionally smartphone
- **Kebutuhan UI khusus:**
  - Ringkasan eksekutif di atas
  - Chart sederhana dengan caption naratif
  - Print-friendly layout

### Persona 3: **Sinta — Research Assistant**
- **Umur:** 26
- **Jabatan:** Junior analyst
- **Tech-savviness:** Tinggi (developer background, comfortable dengan JSON/API)
- **Goal:** Menjalankan banyak simulasi dengan parameter variatif, compare hasilnya
- **Pain points:**
  - Manual data entry berulang
  - Susah komparasi antar simulasi
- **Frekuensi pakai:** Harian, 5-10 simulasi
- **Device:** Linux desktop, dual monitor
- **Kebutuhan UI khusus:**
  - Keyboard shortcut
  - Duplicate/clone simulasi
  - JSON export / raw data access

### Persona 4: **Prof. Andi — Academic Researcher**
- **Umur:** 54
- **Jabatan:** Guru Besar Ilmu Politik di universitas negeri, peneliti kebijakan publik
- **Tech-savviness:** Menengah (terbiasa SPSS, Stata; tidak familiar dengan tool modern)
- **Goal:** Menggunakan simulasi sebagai material mengajar + publikasi jurnal ilmiah
- **Pain points:**
  - Butuh metodologi yang defensible untuk peer review
  - Butuh akses ke raw data untuk re-analisis
  - Mahasiswa butuh onboarding yang mudah
- **Frekuensi pakai:** 2-3× per bulan, sering berdampingan dengan mahasiswa
- **Device:** Laptop kampus (Windows), proyektor kelas untuk demo
- **Kebutuhan UI khusus:**
  - Citation generator (metodologi, model version, dataset version)
  - Export raw CSV untuk re-analisis
  - Layout yang screenshot-friendly untuk slide

### Persona 5: **Mbak Dewi — NGO Program Manager**
- **Umur:** 42
- **Jabatan:** Manajer program advokasi di NGO lingkungan
- **Tech-savviness:** Rendah-menengah (familiar dengan Google Workspace, Canva)
- **Goal:** Menguji framing kampanye & kebijakan alternatif sebelum lobi ke pemerintah
- **Pain points:**
  - Budget survei terbatas, butuh alternatif cepat
  - Harus argumen data-driven saat advokasi
  - Butuh narasi yang bisa dipakai komunikasi publik
- **Frekuensi pakai:** 1-2× per minggu
- **Device:** MacBook Air, tablet saat rapat lapangan
- **Kebutuhan UI khusus:**
  - Narasi otomatis di ringkasan eksekutif
  - Kutipan persona yang "shareable" di social media
  - Filter lokasi spesifik (provinsi terdampak)

### Persona 6: **Raka — Data Journalist**
- **Umur:** 31
- **Jabatan:** Reporter investigasi di media nasional, fokus kebijakan publik
- **Tech-savviness:** Tinggi (Python pandas, Flourish, Datawrapper)
- **Goal:** Membangun narasi berita dari data simulasi, visualisasi untuk artikel
- **Pain points:**
  - Deadline ketat, butuh hasil dalam jam, bukan hari
  - Butuh embeddable chart untuk artikel online
  - Harus verify claim kebijakan pejabat dengan data
- **Frekuensi pakai:** Situational, 3-5× sebulan saat ada isu kebijakan besar
- **Device:** Dual monitor, MacBook Pro + iPad Pro untuk sketch
- **Kebutuhan UI khusus:**
  - Embeddable chart (iframe/SVG export)
  - Copy-to-clipboard data point tunggal
  - Snapshot comparable antar simulasi

### Persona 7: **Wendy — Legislative Staff**
- **Umur:** 28
- **Jabatan:** Staf ahli di DPR/Sekjen, support anggota legislatif
- **Tech-savviness:** Menengah (Excel heavy user, familiar dashboard BI)
- **Goal:** Menyiapkan briefing paper & naskah akademik untuk draft RUU
- **Pain points:**
  - Waktu sempit antar sidang
  - Harus adaptasi output ke format dokumen parlementer
  - Butuh konteks historis (simulasi kebijakan serupa masa lalu)
- **Frekuensi pakai:** 4-6× per minggu saat periode sidang
- **Device:** Laptop kantor Windows, printer dekat
- **Kebutuhan UI khusus:**
  - Export PDF dengan cover letter template DPR
  - History search by keyword (judul + policy_text)
  - Bookmark / tag simulasi per komisi

### Persona 8: **Ibu Maya — Local Government Official**
- **Umur:** 47
- **Jabatan:** Kepala bidang di Bappeda Provinsi
- **Tech-savviness:** Menengah (e-government platforms, SPSS dasar)
- **Goal:** Menguji kebijakan daerah sebelum diajukan ke gubernur/DPRD
- **Pain points:**
  - Data demografi nasional tidak selalu represent lokal
  - Butuh filter provinsi/kabupaten spesifik
  - Budget IT daerah terbatas, butuh tool yang ringan
- **Frekuensi pakai:** 2× per minggu
- **Device:** PC kantor (spec rendah), Windows 10
- **Kebutuhan UI khusus:**
  - Filter geografis granular (turun ke kota/kabupaten jika data memungkinkan)
  - Runtime profile "interactive" default (device tidak kuat)
  - Offline-first wajib (koneksi intermitten)

### Persona 9: **Marcus — International Consultant**
- **Umur:** 39
- **Jabatan:** Senior consultant di World Bank / UNDP, lintas negara
- **Tech-savviness:** Tinggi (R, Python, GIS tools)
- **Goal:** Benchmark kebijakan lintas negara, advise pemerintah klien
- **Pain points:**
  - Butuh dataset yang comparable antar negara
  - Bahasa bisa jadi barrier (tidak semua tim lokal fluent Inggris)
  - Harus deliver hasil dalam format yang bisa direview senior economist
- **Frekuensi pakai:** 5-10× per proyek, proyek 3 bulan
- **Device:** MacBook Pro, traveling (airport, hotel)
- **Kebutuhan UI khusus:**
  - Multi-language (EN/ID minimum)
  - Switch dataset antar negara (Nemotron USA vs future ID vs future MY)
  - Comparison view antar simulasi (V2, ketinggalan di V1)

### Persona 10: **Arif — Graduate Student**
- **Umur:** 24
- **Jabatan:** Mahasiswa S2 Kebijakan Publik (MKP), sambil magang di think tank
- **Tech-savviness:** Tinggi (digital native, familiar dengan banyak tool modern)
- **Goal:** Menulis thesis + portfolio project untuk melamar kerja
- **Pain points:**
  - Tidak ada budget untuk tool berbayar
  - Butuh dokumentasi yang self-explanatory (tidak ada mentor IT)
  - Ingin eksperimen banyak skenario cepat
- **Frekuensi pakai:** Harian, 8-15 simulasi eksperimental
- **Device:** Laptop pribadi (spec rendah ke menengah), sering di kafe
- **Kebutuhan UI khusus:**
  - Duplicate simulasi untuk variasi parameter cepat
  - Keyboard shortcut untuk power user
  - Tutorial / tooltip kontekstual
  - Mode offline saat internet kafe bermasalah

### Persona Priority untuk Prototype

| Persona | Priority V1 | Alasan |
|---|---|---|
| Dr. Rania (Policy Researcher) | 🟢 Primary | Core user, fitur dirancang around-nya |
| Bapak Hendra (Senior Policymaker) | 🟢 Primary | Dilayani lewat Executive Summary di Results |
| Mbak Dewi (NGO Analyst) | 🟢 Primary | Narasi otomatis + shareable quotes |
| Wendy (Legislative Staff) | 🟡 Secondary | Export PDF + search by keyword |
| Ibu Maya (Local Gov) | 🟡 Secondary | Offline-first + runtime profile rendah |
| Prof. Andi (Academic) | 🟡 Secondary | CSV export + citation metadata |
| Raka (Journalist) | 🔵 Tertiary | Embeddable chart (V2) |
| Sinta (Research Asst) | 🔵 Tertiary | Keyboard shortcut (bonus) |
| Arif (Grad Student) | 🔵 Tertiary | Duplicate simulation (V2) |
| Marcus (Intl Consultant) | ⚪ Backlog | Multi-dataset + multi-language (V2) |

🎯 **V1 fokus melayani Primary tier (3 persona)**. Secondary tier dapat dukungan parsial via export + filter. Tertiary + Backlog di-defer ke V2.

---

## 3. Use Cases

### UC-01: Buat Simulasi Baru
**Actor:** Dr. Rania
**Preconditions:** User sudah login (atau, untuk prototype, akses langsung)
**Main flow:**
1. User klik "Simulasi Baru" di dashboard
2. User isi judul, teks kebijakan (required)
3. User pilih dataset (default: `nemotron_usa`)
4. User set `sample_size` (default: 500, range 20-2000)
5. User opsional: atur filter demografi (states, age_range, sex, marital_status, education_level, occupation)
6. User klik "Analisis dengan Gemma" (→ UC-02) ATAU "Langsung Simulasikan" (→ UC-03)
7. Jika ada filter unsupported → tampilkan inline error dengan saran

**Postconditions:** Simulasi draft tersimpan dengan status `pending`

**Contract refs:** `POST /simulations`, respons 201

### UC-02: Klarifikasi Prompt dengan Gemma
**Actor:** Dr. Rania
**Preconditions:** Simulasi draft status `pending`
**Main flow:**
1. User trigger klarifikasi dengan focus area (e.g., "policy_scope")
2. Sistem tampilkan pertanyaan Gemma + rationale
3. User tulis jawaban, submit
4. Sistem tampilkan `refined_policy_text` preview + pertanyaan berikutnya (jika ada)
5. User ulangi step 3-4 maksimal 3 turn
6. User klik "Cukup, Simulasikan" atau sistem otomatis "resolved"

**Alternate flow:** User klik "Skip" di awal → langsung UC-03

**Postconditions:** `refined_policy_text` tersimpan, `clarification_status: resolved`

**Contract refs:** `POST /clarifications/generate`, `POST /clarifications/{id}/answer`

### UC-03: Jalankan Simulasi & Pantau Progress
**Actor:** Dr. Rania
**Preconditions:** Simulasi draft ready (dengan atau tanpa klarifikasi)
**Main flow:**
1. User klik "Simulasikan"
2. Sistem kirim `POST /run` dengan Idempotency-Key
3. Redirect ke halaman Progress
4. Polling `GET /status` tiap 2.5 detik
5. Progress bar update dengan `progress_pct`, ETA dari `estimated_seconds_remaining`
6. Saat `status === "completed"` → auto-redirect ke Results
7. Saat `status === "failed"` → tampilkan error dengan retry option

**Contract refs:** `POST /simulations/{id}/run`, `GET /simulations/{id}/status`

### UC-04: Review Hasil Simulasi
**Actor:** Dr. Rania + Bapak Hendra
**Preconditions:** Simulasi `completed`
**Main flow:**
1. User buka halaman Results
2. Lihat "Ringkasan Eksekutif" (mean approval, dominant emotion, behavioral change)
3. Scroll ke breakdown demografis: Age, Marital, State, Occupation
4. Explore emotion profile via radar chart
5. Baca representative quotes dari 5-10 persona
6. Export hasil ke PDF / CSV jika diperlukan

**Contract refs:** `GET /simulations/{id}/results`, `GET /simulations/{id}/export`

### UC-05: Respond ke Challenge Post-Run
**Actor:** Dr. Rania, Mbak Dewi
**Preconditions:** Simulasi `completed`, user sudah review Results
**Main flow:**
1. Dari Results page, user klik tombol "Tantang Hasil Ini dengan Gemma"
2. User pilih `focus` (e.g., "weak_segment", "behavioral_change", "emotion_bias")
3. Sistem panggil `POST /simulations/{id}/challenge`
4. Tampilkan challenge card:
   - `challenge_text` — pertanyaan/tantangan spesifik
   - `evidence` — segment, mean_approval, top_concern yang jadi basis tantangan
5. User tulis respons (e.g., penjelasan rationale kebijakan atau ide perbaikan)
6. Sistem panggil `POST /challenges/{id}/followup`
7. Tampilkan:
   - `followup_text` — Gemma's follow-up
   - `suggested_policy_refinement` — usulan revisi kebijakan
   - Tombol "Tantang Lagi" (loop) atau "Gunakan Revisi & Re-run"
8. User bisa iterasi hingga puas, atau lanjut ke UC-06

**Postconditions:** User punya `suggested_policy_refinement` siap pakai

**Contract refs:** `POST /simulations/{id}/challenge`, `POST /challenges/{id}/followup`

### UC-06: Iterate Policy berdasarkan Suggested Refinement
**Actor:** Dr. Rania
**Preconditions:** Sudah dapat `suggested_policy_refinement` dari UC-05
**Main flow:**
1. User klik "Gunakan Revisi & Re-run"
2. Sistem buka Create form baru dengan field pre-filled:
   - `policy_text` = `suggested_policy_refinement`
   - Filter demografi + sample_size = same as parent simulasi
   - Title = `[Revisi] {original_title}`
3. User review, adjust jika perlu, submit
4. Masuk alur normal create → clarification (optional) → run → results

**Postconditions:** Simulasi baru tercipta, linked metadata ke parent (future: comparison view)

**Contract refs:** `POST /simulations`, sama dengan UC-01

### UC-07: Komparasi Antar Simulasi (Stretch V1)
**Actor:** Sinta, Raka
**Status:** V2 endpoint, mock-only di V1 (stretch goal Day 8)
**Main flow:**
1. Dari Dashboard, user select 2-3 simulasi dengan checkbox
2. Klik "Bandingkan"
3. Tampilkan side-by-side: summary, demographic breakdown, emotion
4. Highlight difference (> X%) dengan warna

**Contract refs:** `POST /simulations/compare` (V2, planned)

### UC-08: Kelola History Simulasi
**Actor:** Semua user
**Main flow:**
1. User buka Dashboard
2. Lihat list simulasi (paginated, default 20/page, sorted by created_at:desc)
3. Filter by status, search by title
4. Klik simulasi → buka Results / detail
5. Delete simulasi lama

**Contract refs:** `GET /simulations?page=X&limit=Y&status=Z`, `DELETE /simulations/{id}`

### UC-09: Duplicate Simulasi (Power User Shortcut)
**Actor:** Sinta, Arif
**Preconditions:** Ada simulasi existing
**Main flow:**
1. User hover simulasi di Dashboard
2. Klik menu context → "Duplicate"
3. Create form terbuka dengan semua field pre-filled dari simulasi sumber
4. User adjust parameter (biasanya sample_size atau filter)
5. Submit sebagai simulasi baru

**Postconditions:** Simulasi baru tercipta, tidak ada link formal ke sumber di V1

### UC-10: Save & Resume Draft
**Actor:** Wendy, Ibu Maya
**Preconditions:** User di tengah isi Create form, belum submit
**Main flow:**
1. User klik "Simpan Draft" di form
2. Frontend persist form state ke localStorage (bukan backend — karena backend tidak support draft yet)
3. User tutup tab/browser
4. User kembali, buka `/new` → toast "Draft tersedia, lanjutkan?"
5. Klik lanjut → form re-populated

**Postconditions:** Tidak ada state backend, pure client-side UX helper

**Contract refs:** None (client-only)

### UC-11: Share Results via Link
**Actor:** Raka, Prof. Andi
**Preconditions:** Simulasi `completed`, deploy di LAN/server yang accessible tim
**Main flow:**
1. User buka Results page
2. Klik "Copy Link"
3. URL deep-link ke `/sim/:id/results` di-copy ke clipboard
4. Paste ke email/chat, recipient buka link → langsung masuk Results

**Postconditions:** Hanya URL, tidak ada auth/sharing logic di V1

### UC-12: Export PDF untuk Presentasi
**Actor:** Bapak Hendra, Wendy, Mbak Dewi
**Preconditions:** Simulasi `completed`
**Main flow:**
1. User buka Results page
2. Klik "Export PDF"
3. Browser trigger print dialog dengan print-CSS yang sudah styled (institutional header, page breaks di tempat logis)
4. User save as PDF

**Postconditions:** File PDF siap presentasi/briefing

**Contract refs:** None (client-side rendering)

### UC-15: Bandingkan Hasil dengan Kebijakan Serupa (Policy Comparison)
**Actor:** Dr. Rania, Prof. Andi, Wendy
**Preconditions:** Simulasi `completed`
**Main flow:**
1. User buka Results page → klik tab "Perbandingan Kebijakan"
2. Sistem auto-match policy_text simulasi dengan precedent database
3. Tampilkan 1-3 kebijakan serupa dengan similarity badge
4. User klik salah satu → expand comparison detail:
   - Side-by-side metric: mean_approval simulasi vs historical
   - Delta indicator (lebih tinggi/rendah dari historical)
   - Konteks historis singkat
5. User bisa search manual jika auto-suggest tidak relevan
6. User bisa "Pin" perbandingan untuk include di PDF export

**Alternate flow:** Tidak ada precedent match → empty state + search box
**Postconditions:** User punya benchmark untuk interpretasi hasil simulasi

**Contract refs:** None (F-14 adalah client-only feature berbasis static JSON)

### UC-16: Eksplorasi Dataset (Global Expansion Entry Point)
**Actor:** Marcus (International Consultant), Admin institusi
**Preconditions:** Institusi ingin pakai dataset negara lain
**Main flow:**
1. User buka Settings / Dataset Explorer
2. Lihat daftar dataset yang tersedia: `nemotron_usa` (active), `sims_indo_v1` (coming v2)
3. Lihat metadata: jumlah records, coverage, attributes, license
4. Toggle default dataset di institution-config.json (manual step di V1)
5. Create simulation → dataset tersedia di selector

**Status:** V1 informational UI, switching manual. V2: admin UI + auto-detection per negara

### UC-13: Ganti Theme Institusi
**Actor:** Admin / deployer
**Main flow:**
1. Edit `public/institution-config.json` sebelum deploy
2. Set `theme`, `logoUrl`, `institutionName`, `locale`
3. Aplikasi load config saat boot
4. Branding tampil sesuai institusi

### UC-14: Cite Methodology (Academic Use)
**Actor:** Prof. Andi, Arif
**Preconditions:** Simulasi `completed`
**Main flow:**
1. User klik "Metodologi" di Results page
2. Modal tampil dengan:
   - Runtime profile, effective sample size
   - Dataset version + license
   - Model version (Gemma variant)
   - Dataset sampling seed
   - Prompt template version
3. Klik "Copy Citation" → format APA/IEEE ke clipboard

**Postconditions:** Citation siap dipakai di paper

**Contract refs:** Metadata ambil dari `run_config` + institution config

---

## 4. Feature Breakdown

### F-01: API Client Layer (Foundation)
**Deskripsi:** Type-safe HTTP client untuk semua endpoint V1.
**Scope:**
- `src/api/client.ts` — base fetch wrapper dengan envelope unwrapping
- `src/api/types.ts` — auto-generated dari OpenAPI schema
- `src/api/endpoints/*.ts` — satu file per resource (simulations, clarifications, datasets)
- Error handling: throw `ApiError` dengan `.code` dan `.message`
- Request ID propagation
- Idempotency-Key generator
**Acceptance:**
- Semua endpoint punya typed function
- Unit test dengan MSW (mock service worker)
- Zero `any` di API layer

### F-02: Theming System
**Deskripsi:** Multi-institution, multi-country theme via CSS variables + config JSON.
**Scope:**
- `public/institution-config.json` — editable tanpa rebuild, fields:
  ```json
  {
    "theme": "global-default",
    "institutionName": "Policy Research Institute",
    "logoUrl": "/logos/pri-logo.svg",
    "locale": "en-US",
    "country": "us",
    "defaultDataset": "nemotron_usa"
  }
  ```
- `src/theme/ThemeProvider.tsx` — inject CSS vars ke `:root`, load config on mount
- `src/theme/tokens.ts` — design tokens (colors, spacing, typography)
- `src/theme/themes/` — preset themes (global-default, gov-formal, think-tank, academic-warm)
- `src/i18n/` — i18n setup (EN default, keys ready untuk bahasa lain di V2)
- Dark mode toggle (opsional, low priority)
**Acceptance:**
- Ganti theme via edit JSON, reload → branding berubah
- Logo institusi muncul di header
- Semua component respect theme token (zero hardcoded hex di components)
- Semua UI string via i18n key, bukan hardcoded teks

### F-03: App Shell & Routing
**Deskripsi:** Layout utama, navigation, routing.
**Scope:**
- `src/app/Layout.tsx` — header + main + footer
- Header: logo institusi kiri, nav tengah (Dashboard / Simulasi Baru / About), settings kanan
- Footer: "Powered by SIMS — Gemma Policy Simulator." (no "Offline-first" — ini web app)
- React Router routes:
  - `/` → Dashboard
  - `/new` → Create Simulation
  - `/sim/:id/clarify` → Clarification Dialog
  - `/sim/:id/running` → Progress
  - `/sim/:id/results` → Results
- Breadcrumb component
**Acceptance:**
- Semua route accessible dan refresh-safe
- Header/footer konsisten di semua page

### F-04: Dashboard (Simulation History)
**Deskripsi:** List simulasi dengan filter, search, pagination.
**Scope:**
- GET /simulations dengan paginasi
- Card layout: title, status badge, mean_approval, created_at, actions
- Filter dropdown: All / Pending / Running / Completed / Failed
- Search input (client-side filtering dulu, server-side if API support)
- Empty state: CTA "Buat Simulasi Pertama"
- Pagination control
- Delete action dengan konfirmasi modal
**Acceptance:**
- List render correctly
- Filter & pagination bekerja
- Delete + optimistic UI

### F-05: Create Simulation Form
**Deskripsi:** Multi-section form untuk buat draft simulasi.

**Dataset Reference — Nemotron-Personas-USA:**
Dataset yang dipakai adalah [NVIDIA Nemotron-Personas-USA](https://huggingface.co/nvidia/Nemotron-Personas-USA):
- **Scale:** 1 juta records, 6 juta persona narratives (bukan 6M persona — perlu dibedakan)
- **Coverage:** 50 states + PR + VI, 29k ZCTAs, 15.2k cities
- **License:** CC BY 4.0
- **File format:** Parquet, ~2.69 GB total
- **22 fields tersedia:** `uuid`, `age`, `sex`, `marital_status`, `education_level`, `occupation`, `city`, `state`, `zipcode`, `cultural_background`, `skills_and_expertise`, `hobbies_and_interests`, `career_goals_and_ambitions`, `bachelors_field`, + 6 persona narrative fields

**Fields yang di-expose sebagai filter di V1 (sesuai contract):**
| Filter | Dataset Field | Notes |
|---|---|---|
| `states` | `state` | 52 values (50 + PR + VI) |
| `age_range` | `age` | integer 0–106, slider 18–100 |
| `sex` | `sex` | 2 classes: Male, Female |
| `marital_status` | `marital_status` | 5 classes |
| `education_level` | `education_level` | 7 classes |
| `occupation` | `occupation` | 567 classes — pakai search |

**Fields yang ADA di dataset tapi TIDAK di V1 contract (kandidat V2 filter):**
- `cultural_background` — catatan: ini bukan `ethnicity`, tapi bisa serve similar purpose
- `zipcode` — lebih granular dari state
- `bachelors_field` — lebih spesifik dari education_level
- `skills_and_expertise` — berguna untuk policy impact by skill group

**Scope:**
- Section 1: Judul + teks kebijakan (textarea besar, char counter)
- Section 2: Dataset selector — default `nemotron_usa` (US pilot). Future: dropdown negara → auto-swap dataset. Tampilkan dataset info card (jumlah records, coverage, license)
- Section 3: Sample size slider (20-2000) + input box, hint "lebih banyak = lebih akurat tapi lebih lambat"
- Section 4: Filter demografi — collapsible panels per dimension:
  - **States:** multi-select dengan search (52 options, grouped by region)
  - **Age range:** dual range slider (18–100)
  - **Sex:** checkbox group (Male, Female)
  - **Marital status:** checkbox group (never_married, married, divorced, widowed, separated)
  - **Education level:** checkbox group (less_than_high_school, high_school, some_college, associates, bachelors, masters, doctorate)
  - **Occupation:** multi-select dengan search (567 Nemotron classes, grouped by sector)
- Form validation: React Hook Form + Zod schema mirror contract
- Action: "Klarifikasi Dulu" (secondary) / "Simulasikan Langsung" (primary)
- Live persona count estimate di panel kanan (kalkulasi approximate dari filter combination)
**Acceptance:**
- Form validation sesuai contract (sample_size 20-2000, age_range min<=max)
- Submit sukses → redirect ke clarification atau progress
- Unsupported filter tidak muncul di UI sama sekali (preventive)

### F-06: Clarification Dialog (Chat)
**Deskripsi:** Multi-turn Q&A dengan Gemma pre-run.
**Scope:**
- Layout: 2-kolom (policy text read-only kiri, chat kanan) atau full-width chat dengan policy collapsed
- Turn counter: "Pertanyaan 1 / 3"
- Q bubble: Gemma avatar + question + rationale (italic, subtle)
- A input: textarea + submit button
- Setelah answer: tampilkan `refined_policy_text` diff (highlight perubahan, optional)
- Tombol "Skip & Simulasikan" selalu visible
- Auto-scroll ke bawah saat pertanyaan baru muncul
- Loading state saat Gemma generate (skeleton bubble)
**Acceptance:**
- Multi-turn hingga max 3
- Skip di awal works
- Error 500 (Ollama down) handled dengan retry
- History Q/A disimpan di frontend state (tidak persisted di backend)

### F-07: Progress / Polling
**Deskripsi:** Halaman monitor progress simulasi yang sedang berjalan.
**Scope:**
- Hero: nama simulasi + status besar
- Progress bar horizontal dengan `progress_pct`
- Milestone steps: Initialization → Sampling → Inference → Aggregation → Complete
- ETA: "Estimasi selesai: ~44 detik" dari `estimated_seconds_remaining`
- Detail: `agents_completed / agents_total`, runtime profile, effective sample size
- Polling: TanStack Query dengan `refetchInterval: 2500`
- Stop polling saat `completed` / `failed`
- Auto-redirect ke `/sim/:id/results` saat completed
- Failure state: error message + retry button
**Acceptance:**
- Polling stop correctly (no infinite loop)
- Progress UI smooth update
- Navigate away + come back → progress masih tracked

### F-08: Results Dashboard — Summary & Breakdown
**Deskripsi:** Halaman hasil dengan ringkasan, chart, dan quotes.
**Scope:**

**8a. Hero / Executive Summary**
- Simulasi title + metadata (created_at, completed_at, sample size)
- Mean Approval Gauge (angka besar + donut/gauge chart, skala 1-5)
- Behavioral Change % metric
- Dominant Emotion badge dengan icon
- Auto-generated narrative: "Kebijakan ini mendapat respons **cukup positif** (3.2/5) dengan emosi dominan **concern** (34.1%). Sekitar **38.6% persona** menunjukkan indikasi perubahan perilaku."

**8b. Approval Distribution**
- Diverging bar chart: count per approval bucket (1-5)
- Color: `--color-data-approval-*`

**8c. Demographic Breakdown (Tabs atau Accordion)**
- Tab "Usia": grouped bar chart (mean_approval + count)
- Tab "Status Perkawinan": grouped bar chart
- Tab "Provinsi/State": horizontal bar chart (sorted by approval)
- Tab "Pekerjaan": horizontal bar chart

**8d. Emotion Profile**
- Radar chart: 5 axes (anger, concern, neutral, hope, joy)
- Optional: overlay baseline atau compare dengan simulasi lain (V2)

**8e. Representative Quotes**
- Card masonry layout
- Tiap card: foto placeholder, nama, usia, occupation, kota+state, approval icon (1-5), emotion badge, rationale text
- Filter: by emotion, by approval level

**8f. Action Bar**
- Export PDF (render page ke PDF via react-pdf atau print CSS)
- Download CSV (redirect ke `/export`)
- Copy shareable link (copy URL)

**Acceptance:**
- Semua chart render dengan data mock jika backend belum siap
- Responsive (desktop + tablet)
- Print-friendly CSS

### F-09: Advanced Visualizations (Results)
**Deskripsi:** Chart lanjutan untuk exploration.
**Scope:**
- Choropleth Map (US state heatmap, TopoJSON local)
- Sankey Diagram (demographic → emotion → approval) — pre-aggregated di frontend
- Ridgeline/Joy plot — approval distribution per demographic (jika data tersedia)
- Toggle "Simple View" / "Advanced View"
**Acceptance:**
- Map render offline (TopoJSON di-bundle)
- Sankey readable, hover tooltip berfungsi
- Graceful degradation jika data tidak lengkap

### F-10: Mock Data Mode
**Deskripsi:** Dev mode dengan data palsu, tanpa perlu backend running.
**Scope:**
- `src/mocks/handlers.ts` — MSW handlers untuk semua endpoint
- `src/mocks/fixtures/` — JSON fixtures untuk simulasi, klarifikasi, results
- Toggle via env var: `VITE_USE_MOCKS=true`
- Auto-enable di dev mode
**Acceptance:**
- Semua feature bisa di-demo tanpa backend
- Mocks mirror contract persis

### F-11: Error Handling & Empty States
**Deskripsi:** Graceful handling untuk semua failure mode.
**Scope:**
- Global ErrorBoundary
- Per-page error states dengan retry
- Empty states dengan ilustrasi + CTA
- Toast notifications (success, error, info)
- Offline detection + warning banner
**Acceptance:**
- Setiap error state ada UI-nya
- Tidak ada blank screen

### F-12: Deployment & Packaging
**Deskripsi:** Docker + dokumentasi deploy untuk web app (self-hosted VPS atau cloud) maupun lokal.
**Scope:**
- `Dockerfile` multi-stage (node:20 build → nginx:alpine serve static)
- `docker-compose.yml` yang chain frontend + backend + optional ollama
- `nginx.conf` dengan SPA fallback + reverse proxy ke backend API
- Environment variables: `VITE_API_BASE_URL` (untuk switch antara localhost vs production URL)
- `README.md` dengan step deploy: lokal, VPS (generic), Railway/Render (one-click cloud)
- `CUSTOMIZATION.md` cara ganti theme, logo, institution config
- `ADDING_DATASET.md` cara tambah dataset negara baru (global expansion guide)
**Acceptance:**
- `docker compose up` → full app running di `localhost`
- `VITE_API_BASE_URL=https://api.yourdomain.com npm run build` → production build siap upload ke VPS
- New institution bisa setup dalam <15 menit
- New country dataset bisa di-add tanpa code change (config-driven)

### F-13: Challenge & Policy Refinement (Post-Run Loop)
**Deskripsi:** Fitur differentiator — user bisa "tantang" hasil simulasi dengan Gemma untuk dapat saran refinement kebijakan, loop iteratif.
**Scope:**
- Entry point: tombol "Tantang Hasil Ini" di Results page (floating atau sticky)
- Modal/Drawer Challenge dengan tiga state:
  1. **Focus picker** — chip selector (weak_segment, behavioral_change, emotion_bias, demographic_gap)
  2. **Challenge view** — tampilkan `challenge_text` + `evidence` card (segment, mean_approval, top_concern)
  3. **Followup view** — `followup_text` dari Gemma + `suggested_policy_refinement` preview (dengan diff vs original)
- Loop controls: "Tantang Lagi" (chain), "Gunakan Revisi & Re-run" (→ UC-06), "Simpan & Keluar"
- State management di `useChallengeFlow.ts` (mirror pattern dari `useClarificationFlow`)
- History challenge di frontend state (tidak persisted, seperti clarification)
- Transition ke Create form pre-filled dengan `suggested_policy_refinement` sebagai `policy_text`
- Metadata "Berasal dari Revisi Simulasi #xxx" di-tampilkan di form dan Results baru
**Acceptance:**
- Flow end-to-end: challenge → respond → followup → use refinement → new simulation
- Challenge counter (berapa kali di-challenge) visible
- Graceful fallback: kalau endpoint 500 (backend belum implement), tampilkan "Fitur dalam development" dengan mock response
- MSW fixtures untuk challenge realistic
- Reusable components dari F-06 Clarification (ChatBubble, Drawer)

### F-14: Policy Comparison & Precedent Panel
**Deskripsi:** Setelah melihat hasil simulasi, user bisa membandingkan hasilnya dengan kebijakan serupa yang sudah pernah ada (historical atau dari simulasi lain). Ini menjawab pertanyaan: *"Kebijakan ini mirip dengan apa yang pernah dilakukan, dan bagaimana hasilnya waktu itu?"*

**Konteks:** Fitur ini terpisah dari UC-07 (compare antar simulasi). Policy Comparison lebih ke: simulasi ini vs kebijakan nyata yang sudah diketahui hasilnya di dunia nyata.

**Scope:**
- **Entry point:** Tab baru "Perbandingan Kebijakan" di Results page, di samping tab hasil utama
- **V1: Static policy database** — JSON file `public/policy-precedents.json` berisi 15-25 kebijakan US yang sudah diketahui reaksi publiknya (dengan sumber):
  ```json
  {
    "id": "aca-2010",
    "title": "Affordable Care Act (2010)",
    "summary": "Universal healthcare expansion mandate...",
    "domain": "healthcare",
    "country": "us",
    "year": 2010,
    "known_approval": 3.1,
    "known_dominant_sentiment": "concern",
    "known_behavioral_change_pct": 42.0,
    "source_url": "https://...",
    "tags": ["healthcare", "mandate", "federal"]
  }
  ```
- **Similarity matching (V1: client-side):**
  - Keyword overlap antara `policy_text` user dan `title` + `tags` precedent
  - Top 3 most similar precedents ditampilkan
  - Badge "Sangat Relevan / Agak Relevan / Kurang Relevan"
- **Comparison card layout:**
  - Judul precedent + tahun + negara
  - Side-by-side metrics: Mean Approval (simulasi vs historical), Dominant Emotion, Behavioral Change %
  - Delta indicator: `▲ +0.4` atau `▼ -0.7` vs historical
  - Contextual note: "Kebijakan ini diambil dari data opini publik agregat, bukan simulasi"
  - Link ke source (opens new tab)
- **Filter precedents:** by domain (healthcare, tax, environment, education, labor, housing) + by country (us default, expandable)
- **"Tambah ke Perbandingan" manual:** User bisa search dan manually add precedent ke panel, bukan hanya auto-suggest
- **V2 planned upgrade:** Semantic similarity via embedding, real-time database, cross-country precedents

**Acceptance:**
- Auto-suggest 3 precedent saat Results page load (jika ada match)
- Comparison card render correctly dengan semua metrics
- Graceful jika tidak ada match: "Tidak ditemukan kebijakan serupa. Coba cari manual." + search box
- Policy database JSON bisa di-extend per negara tanpa code change
- Source attribution selalu tampil

---

## 5. Tech Stack (Final)

| Layer | Tool | Alasan |
|---|---|---|
| Build | Vite 5 | Fast HMR, simple config, no SSR needed |
| Language | TypeScript 5 | Type safety (wajib dengan contract) |
| Framework | React 18 | Ecosystem, hooks, Mantine support |
| Routing | React Router 6 | Simple, battle-tested |
| Styling | Tailwind CSS 3 + CSS Variables | Utility + theming flexibility |
| UI Kit | Mantine UI 7 | Rich components, easy theming, globally neutral |
| Forms | React Hook Form + Zod | Perf + validation mirror contract |
| State | Zustand (client) + TanStack Query (server) | Split concerns, minimal boilerplate |
| Charts | Recharts (basic) + Nivo (advanced) | Recharts untuk bar/line, Nivo untuk sankey/heatmap/radar |
| Maps | react-simple-maps + TopoJSON | Offline-capable |
| Icons | Lucide React | Clean, tree-shakeable |
| API Types | openapi-typescript | Auto-gen dari OpenAPI spec |
| Mocking | MSW | Same API contract, dev-friendly |
| Testing | Vitest + Testing Library + Playwright | Unit + E2E |
| Deploy | Docker + Nginx | Standard, portable |

---

## 6. Folder Structure

```
apps/client/
├── public/
│   ├── institution-config.json     # per-deployment config
│   ├── logos/                      # institution logos
│   ├── maps/
│   │   ├── us-states.topo.json
│   │   └── id-provinces.topo.json  # future
│   └── fonts/                      # self-hosted fonts
├── src/
│   ├── api/
│   │   ├── client.ts               # fetch wrapper
│   │   ├── types.gen.ts            # auto-generated from OpenAPI
│   │   └── endpoints/
│   │       ├── simulations.ts
│   │       ├── clarifications.ts
│   │       ├── datasets.ts
│   │       └── export.ts
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Layout.tsx
│   │   ├── Router.tsx
│   │   └── ErrorBoundary.tsx
│   ├── features/
│   │   ├── dashboard/              # F-04
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SimulationCard.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── create/                 # F-05
│   │   │   ├── CreatePage.tsx
│   │   │   ├── PolicyTextSection.tsx
│   │   │   ├── DemographicFilters.tsx
│   │   │   └── schema.ts           # Zod validation
│   │   ├── clarification/          # F-06
│   │   │   ├── ClarificationPage.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── useClarificationFlow.ts
│   │   ├── progress/               # F-07
│   │   │   ├── ProgressPage.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── useStatusPolling.ts
│   │   └── results/                # F-08, F-09
│   │       ├── ResultsPage.tsx
│   │       ├── ExecutiveSummary.tsx
│   │       ├── ApprovalDistribution.tsx
│   │       ├── EmotionRadar.tsx
│   │       ├── StateChoropleth.tsx
│   │       ├── DemographicTabs.tsx
│   │       ├── QuoteCard.tsx
│   │       └── ExportActions.tsx
│   ├── components/                 # shared primitives
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── EmptyState.tsx
│   │   └── ...
│   ├── theme/                      # F-02
│   │   ├── ThemeProvider.tsx
│   │   ├── tokens.ts
│   │   └── themes/
│   │       ├── default.ts
│   │       ├── kemenkeu.ts
│   │       └── think-tank.ts
│   ├── mocks/                      # F-10
│   │   ├── browser.ts
│   │   ├── handlers.ts
│   │   └── fixtures/
│   ├── lib/
│   │   ├── envelope.ts             # response unwrap helper
│   │   ├── idempotency.ts          # UUID generator
│   │   └── format.ts               # number/date formatters
│   ├── hooks/
│   │   ├── useSimulations.ts       # TanStack Query wrappers
│   │   └── useInstitution.ts
│   ├── styles/
│   │   └── globals.css             # tokens, resets
│   └── main.tsx
├── tests/
│   ├── unit/
│   └── e2e/
├── Dockerfile
├── docker-compose.yml
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 7. 8-Day Timeline (Detailed)

> **Asumsi token:** 2× kapasitas Claude Pro/hari. Sonnet @ ~200k context window per session.
> **Strategi:** Invoke `sims-contract-guardian` skill setiap kali menyentuh API. Invoke `frontend-design` skill saat styling komponen utama.

---

### 📅 **Day 1 — Foundation & Design System**

**Goal:** Project scaffolded, design tokens ready, API client working.

**Tasks:**
1. **[2h]** Init Vite + React + TypeScript project di `apps/client/`
2. **[1h]** Setup Tailwind + PostCSS + self-hosted fonts (Source Serif 4, IBM Plex Sans, JetBrains Mono)
3. **[2h]** Buat design tokens di `src/styles/globals.css` (semua CSS vars dari section 1.2-1.4)
4. **[1h]** Setup Mantine dengan theme yang consume CSS vars
5. **[2h]** Install & configure: React Router, TanStack Query, Zustand, React Hook Form, Zod
6. **[3h]** Generate TypeScript types dari OpenAPI: `npx openapi-typescript ../../packages/contracts/openapi/v1.json -o src/api/types.gen.ts`
7. **[2h]** Build `src/api/client.ts` — fetch wrapper dengan:
   - Envelope unwrapping
   - ApiError class
   - Idempotency-Key injection
   - Request ID propagation
8. **[2h]** Build endpoint wrappers untuk `simulations.ts`, `clarifications.ts`, `datasets.ts`, `export.ts`
9. **[1h]** Setup MSW + dummy handler untuk health check

**Token usage estimate:** ~40% of daily budget (mostly scaffolding dengan pattern recognition, low creativity load)

**Deliverables:**
- ✅ `apps/client/` boot successfully di `localhost:5173`
- ✅ Design tokens terdefinisi
- ✅ API client typed dan testable
- ✅ MSW handler setup

**Guardrails:**
- Invoke `sims-contract-guardian` saat setup API client layer
- Commit kecil-kecil setiap task selesai
- Jangan write component logic hari ini — fokus infrastructure

---

### 📅 **Day 2 — Theming System + App Shell + Dashboard**

**Goal:** Multi-institution theming works, app shell jalan, Dashboard page complete.

**Tasks:**
1. **[3h]** F-02 Theming System:
   - `ThemeProvider` yang baca `public/institution-config.json`
   - 4 preset themes di `src/theme/themes/`
   - Inject CSS vars ke `:root` saat mount
   - Logo & institution name bind ke config
2. **[2h]** F-03 App Shell:
   - `Layout.tsx` dengan header, main, footer
   - Header: logo kiri, nav tengah (Dashboard, Baru), settings kanan
   - Footer: institutional disclaimer
3. **[1h]** Setup React Router routes kosong untuk semua page
4. **[4h]** F-04 Dashboard Page:
   - List simulasi dengan `GET /simulations`
   - `SimulationCard` component: title, status badge, mean_approval, dates, actions
   - FilterBar: dropdown status, search input (client-side)
   - Pagination controls
   - Empty state: ilustrasi + CTA "Buat Simulasi Pertama"
5. **[2h]** Delete modal + optimistic UI update
6. **[2h]** MSW fixtures untuk `GET /simulations` dengan 20 simulasi dummy varied status
7. **[1h]** Quick theme switcher di dev untuk test 4 themes

**Token usage estimate:** ~55% of daily budget (lebih banyak creative work di Dashboard layout)

**Deliverables:**
- ✅ 4 theme preset berfungsi, switchable via JSON
- ✅ App shell konsisten
- ✅ Dashboard render dengan mock data, filter, pagination

**Guardrails:**
- Invoke `sims-contract-guardian` sebelum coding SimulationCard (untuk cek field names)
- Test responsive di desktop breakpoint saja untuk Day 2

---

### 📅 **Day 3 — Create Simulation Form**

**Goal:** Form lengkap dengan validation + submit flow.

**Tasks:**
1. **[1h]** Setup route `/new` dengan form skeleton
2. **[2h]** Section 1: Title + policy_text textarea dengan char counter
3. **[2h]** Section 2: Dataset selector (fetch `GET /datasets`), disable unsupported
4. **[2h]** Section 3: Sample size — slider + number input, syncd, range 20-2000, hint text
5. **[4h]** Section 4: Demographic filters (collapsible accordion per dimension):
   - States: multi-select dengan search (data dari constant US states list)
   - Age range: dual range slider (18-100)
   - Sex: checkbox group (Male, Female, Other)
   - Marital status: checkbox group (5 options)
   - Education level: checkbox group (6 options)
   - Occupation: multi-select dengan search (50+ common occupations)
6. **[2h]** Zod schema `src/features/create/schema.ts` mirror contract:
   - `sample_size`: integer 20-2000
   - `age_range`: tuple [min, max] dengan refine min <= max
   - Explicit exclude `income_brackets`, `household_income`, `ethnicity` (tidak ada di schema)
7. **[2h]** Live persona count panel kanan (mock calculation dulu)
8. **[2h]** Submit action: "Klarifikasi Dulu" vs "Simulasikan Langsung"
   - Panggil `POST /simulations` dengan Idempotency-Key
   - Sukses → redirect ke `/sim/:id/clarify` atau `/sim/:id/running`
   - Error → toast notification

**Token usage estimate:** ~70% of daily budget (banyak component compound, validation logic)

**Deliverables:**
- ✅ Form validation sesuai contract
- ✅ Submit sukses + redirect
- ✅ Unsupported filters tidak ada di UI

**Guardrails:**
- Invoke `sims-contract-guardian` sebelum implement submit handler
- Cross-check Zod schema vs OpenAPI `CreateSimulationRequest`
- Batch review semua filter options dengan contract matrix

---

### 📅 **Day 4 — Clarification Dialog + Progress Page**

**Goal:** 2 halaman interaktif: chat clarification + polling progress.

**Tasks:**

**Clarification (F-06) — 4 jam:**
1. **[1h]** Route `/sim/:id/clarify`, fetch initial state `GET /clarifications`
2. **[2h]** Chat UI layout:
   - Policy text panel kiri (collapsible, read-only)
   - Chat area kanan
   - Turn counter "1 / 3" di header
3. **[2h]** `ChatBubble` component (Gemma avatar, user avatar)
4. **[2h]** Flow logic di `useClarificationFlow.ts`:
   - Trigger `POST /clarifications/generate` dengan focus
   - Render question + rationale
   - Submit answer via `POST /clarifications/{id}/answer`
   - Chain ke next question jika ada
   - Stop di turn 3 atau `clarification_status === "resolved"`
5. **[1h]** Skip button → langsung `POST /simulations/{id}/run`
6. **[1h]** Loading skeleton bubble saat Gemma generate
7. **[1h]** Error handling (500 Ollama down) dengan retry

**Progress (F-07) — 4 jam:**
1. **[1h]** Route `/sim/:id/running` dengan layout center
2. **[2h]** Progress bar + milestone steps (5 milestones mapped dari progress_pct ranges)
3. **[2h]** `useStatusPolling.ts` dengan TanStack Query `refetchInterval: 2500`
   - Stop polling saat `completed` / `failed`
   - Auto-redirect ke `/sim/:id/results` on completed
4. **[1h]** Metadata display: agents_completed/total, runtime_profile, effective_sample_size
5. **[1h]** ETA dengan countdown visual
6. **[1h]** Failure state: error + retry button (POST /run ulang)

**MSW fixtures:**
- Mock clarification generate (2 questions + resolved)
- Mock polling: status transition dari `running` → `completed` dalam 10 detik simulated

**Token usage estimate:** ~80% of daily budget (interactive state-heavy)

**Deliverables:**
- ✅ Clarification end-to-end dengan max 3 turns
- ✅ Skip functional
- ✅ Polling stop correctly + redirect

**Guardrails:**
- Invoke `sims-contract-guardian` untuk validasi clarification contract
- Test edge case: skip, 500 error, turn 3 resolved
- Polling harus stop di unmount (cleanup!)

---

### 📅 **Day 5 — Results Dashboard (Core)**

**Goal:** Halaman Results dengan Executive Summary + 3 chart dasar.

**Tasks:**
1. **[1h]** Route `/sim/:id/results`, fetch `GET /simulations/{id}/results`
2. **[3h]** F-08a Executive Summary:
   - Title + metadata
   - `ApprovalGauge` component (custom SVG gauge, 1-5 scale, Recharts atau pure SVG)
   - Behavioral Change % metric card
   - Dominant Emotion badge
   - Auto-generated narrative helper function
3. **[3h]** F-08b Approval Distribution:
   - Diverging bar chart pakai Recharts
   - Color per approval bucket dari `--color-data-approval-*`
   - Tooltip dengan count + percentage
4. **[4h]** F-08c Demographic Breakdown (Tabs):
   - Mantine `Tabs` component
   - Tab Usia: grouped bar (bar untuk mean_approval, secondary axis untuk count)
   - Tab Marital: grouped bar
   - Tab State: horizontal bar sorted desc
   - Tab Occupation: horizontal bar sorted desc
   - Responsive height
5. **[3h]** F-08d Emotion Radar:
   - Nivo Radar chart dengan 5 axes
   - Color sesuai `--color-data-emotion-*`
   - Legend + tooltip
6. **[2h]** MSW fixtures untuk `GET /results` dengan data realistis

**Token usage estimate:** ~85% of daily budget (chart styling + layout)

**Deliverables:**
- ✅ Results page dengan Exec Summary + 3 chart section
- ✅ Semua chart render dengan mock data
- ✅ Responsive desktop + tablet

**Guardrails:**
- `mean_approval` harus ditampilkan sebagai `3.2 / 5`, bukan `3.2%`
- `by_state` adalah number langsung, bukan `{mean_approval, count}` — code-check!
- Invoke `sims-contract-guardian` saat parse `demographic_breakdown`

---

### 📅 **Day 6 — Representative Quotes + Advanced Viz + Export**

**Goal:** Results page complete dengan quotes, choropleth, sankey, export.

**Tasks:**
1. **[3h]** F-08e Representative Quotes:
   - Card masonry layout (CSS grid dengan auto-flow)
   - `QuoteCard` component dengan all fields (persona info, approval icon, emotion badge, rationale)
   - Filter bar: by emotion, by approval level
   - "Show more" pagination
2. **[4h]** F-09 Choropleth Map:
   - Install `react-simple-maps` + `d3-scale`
   - Bundle US TopoJSON di `public/maps/us-states.topo.json`
   - Render heatmap dengan color scale (diverging dari `by_state` values)
   - Tooltip on hover: state name + mean_approval
   - Legend
3. **[3h]** F-09 Sankey Diagram (Nivo):
   - Pre-aggregate data: demographic segment → emotion → approval range
   - Helper function di `src/features/results/aggregators.ts`
   - Color scheme match emotion palette
   - Tooltip
4. **[2h]** F-08f Export Actions:
   - Button "Download CSV" → open `/api/v1/simulations/{id}/export` (browser handle stream)
   - Button "Export PDF" → use `window.print()` dengan print-only CSS (atau `react-to-print`)
   - Button "Copy Link" → clipboard API
5. **[2h]** Toggle "Simple View" / "Advanced View" — hide/show advanced charts

**Token usage estimate:** ~90% of daily budget (complex viz + aggregation)

**Deliverables:**
- ✅ Quotes dengan filter
- ✅ Choropleth map offline-capable
- ✅ Sankey functional
- ✅ Export 3-mode works

**Guardrails:**
- Test print CSS di actual browser print preview
- TopoJSON size harus <100KB
- Sankey data harus graceful saat nilai 0

---

### 📅 **Day 7 — Challenge & Policy Refinement (F-13)**

**Goal:** Post-run challenge loop complete, differentiator feature live.

**Tasks:**
1. **[1h]** Setup route & state:
   - Button "Tantang Hasil Ini" di Results page (sticky floating kanan bawah)
   - Drawer/modal skeleton dengan 3-state machine: focus-pick → challenge → followup
   - `useChallengeFlow.ts` hook dengan state transitions
2. **[2h]** Focus Picker state:
   - Chip group: `weak_segment`, `behavioral_change`, `emotion_bias`, `demographic_gap`
   - Description tooltip per chip
   - "Mulai Tantang" button → trigger `POST /simulations/{id}/challenge`
3. **[3h]** Challenge Display state:
   - `challenge_text` di bubble besar (Gemma avatar, serif font)
   - Evidence card: segment name, mean_approval chip, top_concern quote
   - User response textarea dengan char counter
   - Submit → `POST /challenges/{id}/followup`
4. **[3h]** Followup Display state:
   - `followup_text` dari Gemma
   - `suggested_policy_refinement` preview panel dengan **diff highlighting** vs original `policy_text` (pakai `diff-match-patch` library)
   - Action buttons:
     - "Tantang Lagi" → back to Focus Picker (loop counter +1)
     - "Gunakan Revisi & Re-run" → navigate ke `/new` dengan state pre-filled
     - "Simpan & Keluar" → close drawer, toast notification
5. **[2h]** Pre-fill Create form (UC-06):
   - Router state passing dari Results → Create
   - Form auto-populate: `policy_text = suggested_refinement`, filter sama dengan parent, title `[Revisi] ...`
   - Banner "Simulasi ini berasal dari revisi #xxx" di top form
6. **[2h]** MSW fixtures untuk challenge:
   - Mock 2-3 challenge scenario (weak 55+ segment, high anger in low-income, neutral emotion bias)
   - Mock suggested refinement yang readable
7. **[1h]** Graceful fallback saat backend 500:
   - Detection: jika response error dengan `code === "NOT_IMPLEMENTED"` atau 501/500
   - Tampilkan banner "Fitur dalam development, tampilan dari mock"
   - Tetap jalankan flow dengan MSW

**Token usage estimate:** ~85% of daily budget (reuse pattern dari F-06, tapi ada logic baru)

**Deliverables:**
- ✅ Challenge end-to-end loop
- ✅ Diff highlighting di suggested refinement
- ✅ Pre-fill Create form dari refinement works
- ✅ Fallback saat backend belum ready

**Guardrails:**
- Invoke `sims-contract-guardian` untuk validate Challenge + Followup contract
- Re-use `ChatBubble` dari F-06 (jangan bikin komponen baru yang similar)
- Test looping: bisa tantang 3× berturut-turut tanpa crash

---

### 📅 **Day 8 — Policy Comparison + Polish + Deployment + Docs**

**Goal:** F-14 Policy Comparison live, production-ready prototype, deployable as web app.

**Tasks:**
1. **[3h]** F-14 Policy Comparison Panel:
   - Buat `public/policy-precedents.json` dengan 20 kebijakan US (healthcare, tax, environment, education, labor, housing)
   - Tab "Perbandingan Kebijakan" di Results page
   - Auto-suggest via keyword overlap (client-side)
   - Comparison card dengan side-by-side metrics + delta indicator
   - Manual search + filter by domain
   - Empty state graceful
2. **[1h]** Theme validation:
   - Test 4 theme preset end-to-end
   - Screenshot setiap theme untuk dokumentasi
   - Verify logo swap works
2. **[2h]** Error Handling & Empty States pass:
   - ErrorBoundary global
   - Per-page error states dengan retry
   - Toast notifications untuk all mutations
3. **[1h]** UC-10 Draft persistence (localStorage) di Create form
4. **[1h]** UC-11 Copy Link + UC-12 Export PDF finalize
5. **[1h]** UC-14 Citation modal (metodologi + copy citation)
6. **[2h]** Accessibility pass:
   - Keyboard navigation
   - ARIA labels di chart (via title/desc)
   - Color contrast check (WCAG AA)
   - Focus states
7. **[2h]** Performance pass:
   - Lazy load chart libraries (`React.lazy` untuk results sections)
   - Image optimization
   - Bundle analyzer
8. **[3h]** F-12 Deployment:
   - `Dockerfile` multi-stage (node:20 build → nginx:alpine serve)
   - `nginx.conf` dengan SPA fallback + API proxy
   - `docker-compose.yml` yang chain frontend + backend + optional ollama
   - Test `docker compose up` fresh
9. **[2h]** Documentation:
   - `apps/client/README.md`: dev setup, build, deploy
   - `apps/client/CUSTOMIZATION.md`: cara ganti theme, logo, institution config
   - `apps/client/API_INTEGRATION.md`: cara regenerate types dari OpenAPI
10. **[1h]** Smoke test end-to-end (full user journey dengan mocks disabled, real backend)

**Token usage estimate:** ~65% of daily budget (refinement + beberapa small UC implementation)

**Deliverables:**
- ✅ All themes validated + screenshots
- ✅ `docker compose up` works one-shot
- ✅ 3 dokumentasi file complete
- ✅ UC-10, UC-11, UC-12, UC-14 functional
- ✅ Full E2E smoke test pass

**Guardrails:**
- Jangan add feature kompleks baru hari ini
- Fix-only mode setelah jam 14:00

---

## 8. Token Budget Strategy

### Per-Day Budget Distribution
| Day | Task Type | Expected Load |
|---|---|---|
| 1 | Scaffolding | 40% — banyak pattern-recognition |
| 2 | UI patterns | 55% — creative work di Dashboard |
| 3 | Forms + validation | 70% — logic heavy |
| 4 | Interactive flows | 80% — state-heavy, banyak edge case |
| 5 | Charts + layout | 85% — styling + data binding |
| 6 | Advanced viz | 90% — puncak kompleksitas |
| 7 | Challenge loop + policy refinement | 85% — reuse pattern F-06 tapi ada logic diff |
| 8 | Polish + deploy + docs | 65% — fix, refactor, small UCs |

### Optimizations
1. **Cache reuse:** Semua request dalam 1 sesi (5 min window) re-use cache token
2. **Skill invocation:** `sims-contract-guardian` dipakai strategis — hanya saat menyentuh API, bukan setiap chat
3. **Batch operations:** Kerjakan related files dalam 1 turn (parallel tool calls)
4. **Avoid re-reading:** Cache file content di context, hindari re-Read tool untuk file yang sama
5. **Prompt template reuse:** Buat template prompt untuk tasks berulang (e.g., "create component X with theme token Y")
6. **Reuse across features:** F-13 (Challenge) harus re-use `ChatBubble`, `Drawer`, state-machine pattern dari F-06 (Clarification) — hemat ~30% token di Day 7

### Emergency Fallback
Jika token kurang di day 6-8:
- Day 6: Skip Sankey, keep Choropleth (Sankey lebih nice-to-have)
- Day 7: Skip diff-highlighting di suggested_policy_refinement (tampilkan plain text), keep core loop
- Day 8: Skip Docker, keep docs + small UCs (Docker bisa day after)
- Day 8: Skip UC-14 Citation modal (bisa di V1.1)

---

## 9. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend `/results` belum ready | High | High | Pakai MSW mock yang mirror contract. Deliverable tetap jalan. |
| Backend `/challenge` belum implement | **High** | **Medium** | MSW fixtures + fallback banner "Fitur dalam development". Flow tetap testable di V1. |
| Ollama down saat clarification | Medium | Medium | Retry + skip button fully functional |
| Chart library conflict | Low | Medium | Lock versions di package.json, test compatibility Day 1 |
| Theme system leak ke hardcoded colors | Medium | High | CI check: grep for `#` color in components (harus via var) |
| Indonesia map (V2) not ready | High | Low | Default ke US map untuk V1, tambah Indonesia di V2 |
| Contract drift (backend ubah schema) | Medium | High | Regenerate types setiap pagi, run contract check script |
| Performance di dataset besar (2000 persona) | Low | Medium | Virtualize quote list, lazy-load charts |
| Diff library tidak match aesthetic | Low | Low | Fallback ke plain-text view di F-13 jika diff-match-patch tidak clean |
| Persona priority mismatch feedback | Medium | Medium | Demo di Day 3 ke 1-2 persona real (target user interview) |
| Nemotron Parquet 2.69GB terlalu besar di-load frontend | High | High | Frontend tidak load Parquet langsung — backend yang handle sampling. Frontend hanya kirim filter params ke API. |
| Nemotron occupation 567 classes membingungkan di UI | Medium | Medium | Group by sector (Healthcare, Tech, Finance, etc.), pakai search + autocomplete |
| Policy precedent database tidak akurat/outdated | Medium | Medium | Selalu tampilkan source URL + tahun, disclaimer "Data historis publik, bukan simulasi" |
| International dataset belum tersedia (hanya US) | High | Low | Label jelas "US Pilot" di dataset selector, V2 roadmap visible di UI |

---

## 10. Definition of Done (per Feature)

Setiap fitur considered "done" kalau:
1. ✅ Implementasi sesuai acceptance criteria
2. ✅ TypeScript zero errors
3. ✅ Contract compliance verified (via `sims-contract-guardian` check)
4. ✅ Test dengan mock data
5. ✅ Test dengan real backend (kalau available)
6. ✅ Responsive desktop + tablet
7. ✅ Empty state + error state handled
8. ✅ Committed dengan clear message

---

## 11. Post-V1 Backlog (Not in 8 Days)

### 🌍 Global Expansion (Prioritas Tinggi)
- 🔜 **International dataset support** — framework sudah config-driven di V1, tinggal plug in dataset baru
  - Indonesia: `sims_indo_v1` (handcrafted synthetic, sedang dikembangkan)
  - UK, Germany, Brazil, India — tergantung ketersediaan data sintetis yang setara Nemotron
- 🔜 **Multi-language UI (i18n)** — key structure sudah di-setup V1, tinggal tambah translation file (ID, FR, DE, PT, dll)
- 🔜 **Country-specific map** — Indonesia (34 provinsi), EU countries (NUTS-2), dll
- 🔜 **Nemotron V2 fields sebagai filter** — `cultural_background`, `zipcode`, `bachelors_field`, `skills_and_expertise`

### 📊 Product Features
- 🔜 Simulation comparison view (`POST /simulations/compare`) — V2 backend endpoint
- 🔜 Recommendations page (`GET /simulations/{id}/recommendations`) — V2 backend endpoint
- 🔜 Policy precedent database V2 — semantic similarity via embeddings, real-time API, cross-country
- 🔜 Duplicate / clone simulation (UC-09, melayani Sinta + Arif)
- 🔜 Real-time notifications saat simulation complete (WebSocket / SSE)
- 🔜 Simulation lineage graph (parent → refinement → re-run chain)
- 🔜 Challenge history persistence (saat ini ephemeral di frontend state)
- 🔜 Embeddable chart iframe untuk media (melayani Persona 6 Raka)

### 🏗️ Platform & Infrastructure
- 🔜 Role-based access & multi-user workspace (team collaboration)
- 🔜 Audit log untuk compliance institusi (melayani Persona 7 Wendy)
- 🔜 Dark mode
- 🔜 Keyboard shortcuts (melayani Persona 3 Sinta)
- 🔜 Advanced filters di dashboard (date range, approval range)
- 🔜 Collaborative annotations on results

---

## 12. Reference Checklist

Sebelum mulai eksekusi Day 1, pastikan sudah:
- [ ] Baca `docs/contracts/frontend-backend-v1.md`
- [ ] Baca `packages/contracts/openapi/v1.json`
- [ ] Invoke `sims-contract-guardian` skill
- [ ] Backend dev server bisa dihidupkan (untuk test akhir)
- [ ] Node.js 20+ installed
- [ ] Docker Desktop installed
- [ ] Ollama + Gemma model pulled (opsional, untuk E2E test)

---

**Last updated:** 2026-04-21
**Version:** 1.1 (8-day plan with Challenge feature + 10 personas)
**Owner:** Frontend track
**Review checkpoints:**
- End of Day 3 — Form & validation review (contract compliance check)
- End of Day 5 — Results rendering review (mock data vs contract)
- End of Day 7 — Challenge loop review (differentiator feature validation)
- End of Day 8 — Full smoke test + theming demo ke stakeholder

**Changelog:**
- v1.2 (2026-04-21) — Koreksi arsitektur web app (bukan offline-only), fix dataset Nemotron (1M records/6M narratives bukan 6M personas), re-theme defaults ke global-neutral, tambah F-14 Policy Comparison, UC-15, UC-16, expand Risk Matrix, restructure Post-V1 Backlog dengan global expansion priority
- v1.1 (2026-04-21) — Tambah Day 7 dedicated untuk F-13 Challenge & Policy Refinement, expand personas dari 3 → 10, tambah UC-05 s/d UC-14
- v1.0 (2026-04-21) — Initial 7-day plan
