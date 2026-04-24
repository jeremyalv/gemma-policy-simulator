/**
 * InfiniPol i18n — Lightweight string catalogue
 *
 * Architecture: flat key→string map per locale.
 * Locale is resolved from institution-config.json (via ThemeProvider / useInstitution).
 * Falls back to 'en' for any missing key.
 *
 * Usage:
 *   import { t } from '@/i18n'
 *   <h1>{t('dashboard.title')}</h1>
 *
 * To add a new language: add a locale block below and ensure the
 * institution-config.json sets `"locale": "<code>"`.
 */

// ── Type ─────────────────────────────────────────────────────────────────────

type StringMap = Record<string, string>
type Locale = 'en'
type Translations = Record<Locale, StringMap>

// ── English strings ───────────────────────────────────────────────────────────

const en: StringMap = {
  // ── App shell ──────────────────────────────────────────────────────────────
  'app.name':           'InfiniPol',
  'app.tagline':        'Simulate public response to policy before it goes live.',
  'nav.dashboard':      'Simulations',
  'nav.new':            'New Simulation',
  'nav.datasets':       'Datasets',
  'nav.settings':       'Settings',

  // ── Dashboard ─────────────────────────────────────────────────────────────
  'dashboard.title':             'Simulations',
  'dashboard.subtitle':          'Review, run, and compare your policy simulations.',
  'dashboard.empty.title':       'No simulations yet',
  'dashboard.empty.body':        'Create your first simulation to see how the public would respond.',
  'dashboard.empty.cta':         'New Simulation',
  'dashboard.col.title':         'Policy',
  'dashboard.col.status':        'Status',
  'dashboard.col.sample':        'Sample',
  'dashboard.col.approval':      'Mean Approval',
  'dashboard.col.created':       'Created',
  'dashboard.col.actions':       'Actions',
  'dashboard.action.run':        'Run',
  'dashboard.action.results':    'View Results',
  'dashboard.action.delete':     'Delete',
  'dashboard.action.compare':    'Compare',
  'dashboard.delete.confirm':    'Are you sure you want to delete this simulation?',
  'dashboard.delete.warning':    'This action cannot be undone.',

  // ── Status badges ─────────────────────────────────────────────────────────
  'status.pending':    'Pending',
  'status.running':    'Running',
  'status.completed':  'Completed',
  'status.failed':     'Failed',

  // ── Create simulation ─────────────────────────────────────────────────────
  'create.title':               'New Simulation',
  'create.subtitle':            'Describe your policy and configure the simulation.',
  'create.field.title':         'Policy title',
  'create.field.title.hint':    'Short name, e.g. "Carbon Tax $50/tonne"',
  'create.field.policy':        'Policy description',
  'create.field.policy.hint':   'Describe the policy in plain language. Be as specific as possible.',
  'create.field.dataset':       'Dataset',
  'create.field.sample':        'Sample size',
  'create.field.sample.hint':   'Number of synthetic personas to simulate (50–5000)',
  'create.field.filters':       'Demographic filters',
  'create.field.filters.hint':  'Optional. Leave blank to include all demographics.',
  'create.field.states':        'States',
  'create.field.age_range':     'Age range',
  'create.submit':              'Create Simulation',
  'create.success':             'Simulation created.',
  'create.error.generic':       'Failed to create simulation. Please try again.',

  // ── Clarification dialog ──────────────────────────────────────────────────
  'clarification.title':          'Policy Clarification',
  'clarification.subtitle':       'Answer these questions to improve simulation accuracy.',
  'clarification.turn':           'Question {{n}} of 3',
  'clarification.skip':           'Skip clarification',
  'clarification.answer.label':   'Your answer',
  'clarification.submit':         'Submit Answer',
  'clarification.run_anyway':     'Run with original policy',

  // ── Run / Progress ────────────────────────────────────────────────────────
  'progress.title':           'Simulation Running',
  'progress.agents':          '{{completed}} of {{total}} personas simulated',
  'progress.eta':             'Estimated time remaining: {{time}}',
  'progress.complete':        'Simulation complete',
  'progress.view_results':    'View Results',
  'progress.failed':          'Simulation failed.',
  'progress.retry':           'Retry',

  // ── Results page ──────────────────────────────────────────────────────────
  'results.title':                     'Simulation Results',
  'results.summary.approval':          'Mean Approval',
  'results.summary.approval.scale':    'out of 5',
  'results.summary.emotion':           'Dominant Emotion',
  'results.summary.behavioral_change': 'Behavioral Change',
  'results.summary.sample':            'Effective Sample',
  'results.tab.overview':              'Overview',
  'results.tab.demographics':          'Demographics',
  'results.tab.quotes':                'Voices',
  'results.tab.challenge':             'Challenge',
  'results.export.csv':                'Export CSV',
  'results.approval_dist.title':       'Approval Distribution',
  'results.emotion.title':             'Emotion Profile',
  'results.demo.age.title':            'By Age Group',
  'results.demo.marital.title':        'By Marital Status',
  'results.demo.state.title':          'By State',
  'results.demo.occupation.title':     'By Occupation',
  'results.quotes.title':              'Representative Voices',
  'results.quotes.approval':           'Approval',
  'results.quotes.emotion':            'Emotion',

  // ── Challenge ─────────────────────────────────────────────────────────────
  'challenge.title':         'Policy Challenge',
  'challenge.subtitle':      'Gemma challenges weak outcomes and suggests improvements.',
  'challenge.evidence':      'Evidence',
  'challenge.your_response': 'Your response',
  'challenge.submit':        'Submit Response',
  'challenge.refinement':    'Suggested policy refinement',

  // ── Policy comparison ─────────────────────────────────────────────────────
  'comparison.title':          'Policy Comparison',
  'comparison.subtitle':       'Compare approval and sentiment across simulations.',
  'comparison.add':            'Add to comparison',
  'comparison.remove':         'Remove',
  'comparison.empty':          'Select at least 2 simulations to compare.',
  'comparison.col.policy':     'Policy',
  'comparison.col.approval':   'Mean Approval',
  'comparison.col.emotion':    'Dominant Emotion',
  'comparison.col.sample':     'Sample Size',
  'comparison.chart.radar':    'Multi-Dimension Radar',
  'comparison.chart.bar':      'Approval Comparison',

  // ── Datasets ──────────────────────────────────────────────────────────────
  'datasets.title':       'Available Datasets',
  'datasets.size':        '{{n}} personas',
  'datasets.license':     'License',
  'datasets.status.active':      'Active',
  'datasets.status.coming_v2':   'Coming Soon',

  // ── Errors ────────────────────────────────────────────────────────────────
  'error.generic':         'Something went wrong. Please try again.',
  'error.not_found':       'Not found.',
  'error.network':         'Network error. Check your connection.',
  'error.filter_rejected': 'The filter combination returned no matching personas.',

  // ── Common actions ────────────────────────────────────────────────────────
  'action.cancel':  'Cancel',
  'action.confirm': 'Confirm',
  'action.back':    'Back',
  'action.close':   'Close',
  'action.loading': 'Loading…',
  'action.retry':   'Retry',
  'action.save':    'Save',

  // ── Approval labels (1–5 scale) ───────────────────────────────────────────
  'approval.1': 'Strongly Oppose',
  'approval.2': 'Oppose',
  'approval.3': 'Neutral',
  'approval.4': 'Support',
  'approval.5': 'Strongly Support',

  // ── Emotion labels ────────────────────────────────────────────────────────
  'emotion.anger':   'Anger',
  'emotion.concern': 'Concern',
  'emotion.neutral': 'Neutral',
  'emotion.hope':    'Hope',
  'emotion.joy':     'Joy',
}

// ── Translation registry ──────────────────────────────────────────────────────

const translations: Translations = { en }

// Active locale — updated by initI18n()
let activeLocale: Locale = 'en'

/**
 * Initialise i18n with the locale from institution config.
 * Call once at app boot (ThemeProvider handles this).
 */
export function initI18n(locale: string): void {
  if (locale in translations) {
    activeLocale = locale as Locale
  } else {
    console.warn(`[i18n] Locale "${locale}" not found — falling back to "en".`)
    activeLocale = 'en'
  }
}

/**
 * Translate a key. Supports simple {{placeholder}} interpolation.
 *
 * @example
 *   t('progress.agents', { completed: 120, total: 500 })
 *   // → "120 of 500 personas simulated"
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const map = translations[activeLocale] ?? translations['en']
  let str = map[key] ?? translations['en'][key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{{${k}}}`, String(v))
    }
  }

  return str
}

export type { Locale }
