/**
 * LandingPage — InfiniPol home / entry point.
 * v3: floating persona chips, mouse-tracking glow, persona-stream marquee,
 * interactive "Try It" simulator, use-case cards, stagger reveals.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Box, Group, Text, Button, SimpleGrid, Stack,
  Container, Badge, Anchor, Textarea,
} from '@mantine/core'
import {
  BarChart2, Zap, GitCompare, Shield, ArrowRight,
  Users, ChevronRight, Activity, Target, CheckCircle,
  Play, TrendingUp, BookOpen, Microscope, Globe, Rocket, Calendar,
} from 'lucide-react'

// ── Animation CSS (injected once to <head>) ───────────────────────────────────

const ANIM_CSS = `
  @keyframes lp-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes lp-persona-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes lp-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes lp-score-pop {
    0%   { transform: scale(0.65); opacity: 0; }
    72%  { transform: scale(1.06); }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes lp-bar-grow {
    from { width: 0 !important; }
  }
  @keyframes lp-indeterminate {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  @keyframes lp-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-float-a {
    0%, 100% { transform: translateY(0px)   rotate(-0.6deg); }
    50%      { transform: translateY(-13px) rotate(0.6deg); }
  }
  @keyframes lp-float-b {
    0%, 100% { transform: translateY(-7px) rotate(0.5deg); }
    50%      { transform: translateY(9px)  rotate(-0.5deg); }
  }
  @keyframes lp-float-c {
    0%, 100% { transform: translateY(5px)   rotate(-0.4deg); }
    50%      { transform: translateY(-11px) rotate(0.7deg); }
  }
  @keyframes lp-try-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes lp-pulse-ring {
    0%   { transform: scale(1);    opacity: 0.6; }
    100% { transform: scale(1.55); opacity: 0; }
  }

  /* Reveal helpers */
  .lp-reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 560ms ease, transform 560ms ease;
  }
  .lp-reveal.lp-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Feature cards */
  .lp-feature-card {
    cursor: default;
    transition: transform 210ms ease, box-shadow 210ms ease, border-color 210ms ease !important;
  }
  .lp-feature-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 18px 36px -8px rgba(0,0,0,0.13) !important;
  }
  .lp-feature-icon {
    transition: transform 210ms ease;
  }
  .lp-feature-card:hover .lp-feature-icon {
    transform: scale(1.14);
  }

  /* Step hover */
  .lp-step { transition: transform 200ms ease; }
  .lp-step:hover { transform: translateY(-4px); }

  /* CTA button */
  .lp-cta-btn {
    transition: transform 160ms ease, box-shadow 160ms ease !important;
  }
  .lp-cta-btn:hover {
    transform: scale(1.04) !important;
    box-shadow: 0 8px 24px -4px rgba(27,67,50,0.45) !important;
  }

  /* Floating persona chips — desktop only */
  .lp-persona-chip {
    pointer-events: none;
    user-select: none;
  }
  @media (max-width: 900px) {
    .lp-persona-chip { display: none !important; }
  }

  /* Try-it category chips */
  .lp-try-chip {
    cursor: pointer;
    transition: background-color 140ms, border-color 140ms, color 140ms, transform 140ms;
  }
  .lp-try-chip:hover { transform: translateY(-2px); }
  .lp-try-chip.active {
    background-color: var(--color-accent-primary) !important;
    border-color: var(--color-accent-primary) !important;
    color: #fff !important;
  }

  /* Use-case cards */
  .lp-usecase {
    transition: transform 200ms ease, box-shadow 200ms ease;
    cursor: default;
  }
  .lp-usecase:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 32px -8px rgba(0,0,0,0.12) !important;
  }

  /* Persona stream cards */
  .lp-pstream-card {
    transition: transform 180ms ease, border-color 180ms ease;
    flex-shrink: 0;
  }
  .lp-pstream-card:hover {
    transform: translateY(-3px);
    border-color: var(--color-accent-primary) !important;
  }

  /* Shimmer skeleton */
  .lp-shimmer {
    background: linear-gradient(90deg,
      var(--color-bg-muted) 25%,
      var(--color-bg-subtle) 50%,
      var(--color-bg-muted) 75%
    );
    background-size: 200% 100%;
    animation: lp-shimmer 1.4s ease infinite;
  }
`

// ── Custom hooks ──────────────────────────────────────────────────────────────

function useInView<T extends HTMLElement>(
  ref: React.RefObject<T>,
  threshold = 0.15,
): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, threshold])
  return visible
}

function useCounter(target: number, duration: number, active: boolean): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round((1 - (1 - t) ** 3) * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return val
}

// ── Data ──────────────────────────────────────────────────────────────────────

type DemoPhase = 'typing' | 'analyzing' | 'results'

interface DemoItem {
  policy: string
  score: number
  label: string
  scoreColor: string
  bars: { name: string; pct: number; color: string }[]
}

const DEMOS: DemoItem[] = [
  {
    policy: 'Universal Basic Income of $500/month for all adults aged 18–65.',
    score: 3.8, label: 'Moderate Support', scoreColor: '#65A30D',
    bars: [{ name: 'Support', pct: 52, color: '#15803D' }, { name: 'Neutral', pct: 28, color: '#78716C' }, { name: 'Concern', pct: 20, color: '#EA580C' }],
  },
  {
    policy: 'Carbon tax of $50 per metric ton on industrial emissions.',
    score: 2.9, label: 'Mixed Reception', scoreColor: '#EA580C',
    bars: [{ name: 'Support', pct: 38, color: '#15803D' }, { name: 'Neutral', pct: 22, color: '#78716C' }, { name: 'Concern', pct: 40, color: '#EA580C' }],
  },
  {
    policy: 'Free universal pre-K education for all children ages 3–5.',
    score: 4.3, label: 'Strong Support', scoreColor: '#15803D',
    bars: [{ name: 'Support', pct: 65, color: '#15803D' }, { name: 'Neutral', pct: 20, color: '#78716C' }, { name: 'Concern', pct: 15, color: '#EA580C' }],
  },
]

const FEATURES = [
  { icon: <Activity size={20} />, title: 'Policy Simulation', color: '#0D9488', description: 'Run any policy through thousands of synthetic personas drawn from real demographic data. Get approval scores, emotion profiles, and representative voices in minutes.' },
  { icon: <Target size={20} />, title: 'AI Challenge Mode', color: '#7C3AED', description: 'Let Gemma stress-test your results. Pick a challenge focus — weak segment, behavioral change, emotion bias, or demographic gap — and get targeted push-back.' },
  { icon: <GitCompare size={20} />, title: 'Side-by-side Comparison', color: '#0369A1', description: 'Compare two simulations head-to-head. See delta scores, diverging emotions, and distribution differences to understand which policy variant lands better.' },
  { icon: <Users size={20} />, title: 'Demographic Breakdowns', color: '#B45309', description: 'Drill into approval by age group, marital status, state, and occupation. Filter the sample to any sub-population before you run.' },
  { icon: <Shield size={20} />, title: 'Clarification Flow', color: '#15803D', description: 'Not sure your policy is worded clearly? Let Gemma ask clarifying questions before the simulation runs, sharpening the prompt for more accurate results.' },
  { icon: <Zap size={20} />, title: 'Instant Export', color: '#B91C1C', description: 'Download the full response dataset as CSV, generate a PDF summary, or copy a citable quote directly from any persona card.' },
]

const STATS = [
  { num: 300, suffix: 'K+', label: 'Synthetic personas', duration: 1800 },
  { num: 50,  suffix: '',   label: 'US states covered',  duration: 1100 },
  { num: 2,   suffix: ' min', label: 'Simulation runtime', duration: 700 },
  { num: 6,   suffix: '',   label: 'Demographic dimensions', duration: 550 },
]

// Persona stream — diverse fake personas shown in the scrolling band
const PERSONA_STREAM = [
  { name: 'Maria S.', age: 34, state: 'TX', role: 'Teacher',        score: 4.2, emotion: 'Hope',    tag: '#15803D' },
  { name: 'James W.', age: 52, state: 'OH', role: 'Engineer',       score: 2.8, emotion: 'Concern', tag: '#B91C1C' },
  { name: 'Priya K.', age: 29, state: 'WA', role: 'Researcher',     score: 4.5, emotion: 'Trust',   tag: '#0369A1' },
  { name: 'Bob T.',   age: 67, state: 'AZ', role: 'Retired',        score: 3.1, emotion: 'Neutral', tag: '#78716C' },
  { name: 'Elena R.', age: 41, state: 'FL', role: 'Nurse',          score: 4.0, emotion: 'Hope',    tag: '#15803D' },
  { name: 'Carlos M.', age: 38, state: 'CA', role: 'Electrician',   score: 3.5, emotion: 'Neutral', tag: '#78716C' },
  { name: 'Susan L.', age: 55, state: 'NY', role: 'Accountant',     score: 2.6, emotion: 'Concern', tag: '#B91C1C' },
  { name: 'Devon A.', age: 24, state: 'GA', role: 'Student',        score: 4.4, emotion: 'Hope',    tag: '#15803D' },
  { name: 'Linda H.', age: 49, state: 'PA', role: 'Social Worker',  score: 3.9, emotion: 'Trust',   tag: '#0369A1' },
  { name: 'Ryan P.',  age: 31, state: 'CO', role: 'Freelancer',     score: 3.3, emotion: 'Neutral', tag: '#78716C' },
  { name: 'Fatima J.', age: 45, state: 'MI', role: 'Doctor',        score: 4.1, emotion: 'Trust',   tag: '#0369A1' },
  { name: 'George N.', age: 60, state: 'NC', role: 'Farmer',        score: 2.4, emotion: 'Anger',   tag: '#B91C1C' },
  { name: 'Aisha M.', age: 27, state: 'IL', role: 'Designer',       score: 4.3, emotion: 'Hope',    tag: '#15803D' },
  { name: 'Tom K.',   age: 58, state: 'TX', role: 'Manager',        score: 2.9, emotion: 'Concern', tag: '#B91C1C' },
  { name: 'Olivia B.', age: 33, state: 'OR', role: 'Programmer',    score: 3.7, emotion: 'Trust',   tag: '#0369A1' },
  { name: 'Marcus D.', age: 44, state: 'VA', role: 'Lawyer',        score: 3.4, emotion: 'Neutral', tag: '#78716C' },
]

// Policy presets for the "Try It" section
const POLICY_PRESETS = [
  { label: 'Education', text: 'Universal free community college tuition for all US citizens under 30.' },
  { label: 'Healthcare', text: 'Expand Medicare coverage to all adults aged 50 and older.' },
  { label: 'Climate', text: 'Carbon tax of $40 per ton on industrial emissions, effective 2026.' },
  { label: 'Housing', text: 'Federal program to build 500,000 affordable housing units over 5 years.' },
  { label: 'Infrastructure', text: 'High-speed rail network connecting the 30 largest US cities by 2035.' },
  { label: 'Tax', text: 'Raise the top federal income tax rate to 42% for earners above $1 million.' },
]

interface TryResult {
  score: number; label: string; scoreColor: string
  emotion: string; change: string
  support: number; neutral: number; concern: number
}

function scoreFromText(text: string): TryResult {
  const t = text.toLowerCase()
  if (/education|school|college|university|pre-k|student|teacher/.test(t))
    return { score: 4.2, label: 'Strong Support',           scoreColor: '#15803D', emotion: 'Hope',    change: 'Moderate', support: 62, neutral: 24, concern: 14 }
  if (/health|medical|medicaid|medicare|hospital|insurance/.test(t))
    return { score: 3.8, label: 'Moderate Support',         scoreColor: '#65A30D', emotion: 'Trust',   change: 'Moderate', support: 52, neutral: 30, concern: 18 }
  if (/climate|carbon|emission|environment|green|renewable/.test(t))
    return { score: 3.1, label: 'Mixed Reception',          scoreColor: '#EA580C', emotion: 'Concern', change: 'Low',      support: 40, neutral: 25, concern: 35 }
  if (/housing|rent|homeless|affordable|mortgage/.test(t))
    return { score: 3.9, label: 'Moderate-High Support',    scoreColor: '#65A30D', emotion: 'Hope',    change: 'Low',      support: 55, neutral: 28, concern: 17 }
  if (/infrastructure|rail|road|bridge|transit|broadband/.test(t))
    return { score: 4.1, label: 'Strong Support',           scoreColor: '#15803D', emotion: 'Hope',    change: 'Low',      support: 60, neutral: 26, concern: 14 }
  if (/\btax\b|levy|tariff|fiscal/.test(t))
    return { score: 2.7, label: 'Significant Opposition',   scoreColor: '#B91C1C', emotion: 'Concern', change: 'Low',      support: 32, neutral: 22, concern: 46 }
  if (/income|ubi|universal basic|welfare|subsidy|poverty/.test(t))
    return { score: 3.2, label: 'Mixed Reception',          scoreColor: '#EA580C', emotion: 'Concern', change: 'Moderate', support: 42, neutral: 26, concern: 32 }
  return   { score: 3.4, label: 'Moderate Support',         scoreColor: '#65A30D', emotion: 'Neutral', change: 'Low',      support: 46, neutral: 32, concern: 22 }
}

const USE_CASES = [
  {
    icon: <TrendingUp size={22} />,
    color: '#0D9488',
    role: 'Policy Analyst',
    quote: '"I can test 6 variants of a tax reform proposal in one afternoon — not one quarter."',
    detail: 'Run rapid iteration cycles to find the framing that maximizes public support before presenting to leadership.',
  },
  {
    icon: <Microscope size={22} />,
    color: '#7C3AED',
    role: 'Academic Researcher',
    quote: '"Synthetic focus group data lets me stress-test hypotheses before primary data collection."',
    detail: 'Generate demographically stratified reaction data for pre-study hypothesis testing and grant proposals.',
  },
  {
    icon: <BookOpen size={22} />,
    color: '#0369A1',
    role: 'Campaign Strategist',
    quote: '"Finally I can see which demographic segments are most likely to flip on a given platform item."',
    detail: 'Understand approval gaps by age, state, and occupation to sharpen messaging and target outreach.',
  },
]

// Floating persona chips shown around the hero mock card
const HERO_CHIPS = [
  { name: 'Sarah K., 34', role: 'Teacher · Austin, TX',  score: 4.2, color: '#15803D', anim: 'lp-float-a 4.2s ease-in-out infinite',        style: { top: '-28px', right: '28px' } as React.CSSProperties },
  { name: 'James W., 52', role: 'Engineer · Columbus, OH', score: 2.8, color: '#B91C1C', anim: 'lp-float-b 5.0s ease-in-out 1.1s infinite',  style: { bottom: '40px', left: '-32px' } as React.CSSProperties },
  { name: 'Priya K., 29', role: 'Researcher · Seattle, WA', score: 4.5, color: '#0369A1', anim: 'lp-float-c 3.9s ease-in-out 0.5s infinite', style: { bottom: '-24px', right: '12px' } as React.CSSProperties },
]

// ── SimMockCard ───────────────────────────────────────────────────────────────

function SimMockCard() {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<DemoPhase>('typing')
  const [charCount, setCharCount] = useState(0)
  const [dotStep, setDotStep] = useState(0)

  const demo = DEMOS[idx]
  const policy = demo.policy

  useEffect(() => {
    if (phase !== 'typing') return
    if (charCount < policy.length) {
      const t = setTimeout(() => setCharCount(c => c + 1), 34)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setPhase('analyzing'), 500)
    return () => clearTimeout(t)
  }, [phase, charCount, policy.length])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const t = setInterval(() => setDotStep(d => (d + 1) % 4), 350)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const t = setTimeout(() => setPhase('results'), 1900)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'results') return
    const t = setTimeout(() => {
      setIdx(i => (i + 1) % DEMOS.length)
      setCharCount(0); setDotStep(0); setPhase('typing')
    }, 4200)
    return () => clearTimeout(t)
  }, [phase])

  const dots = ['', '.', '..', '...'][dotStep]

  return (
    <Box style={{ backgroundColor: '#141413', borderRadius: 16, overflow: 'hidden', boxShadow: '0 28px 56px -12px rgba(0,0,0,0.4)', width: '100%', maxWidth: 440, border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Window chrome */}
      <Box style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1917' }}>
        <Group gap={6}>
          {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <Box key={c} style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: c }} />)}
        </Group>
        <Group gap={8} align="center">
          <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: phase === 'results' ? '#22C55E' : phase === 'analyzing' ? '#FBBF24' : '#6B7280', animation: phase === 'analyzing' ? 'lp-blink 0.9s ease infinite' : 'none', transition: 'background-color 400ms' }} />
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {phase === 'results' ? 'Complete' : phase === 'analyzing' ? 'Running' : 'Draft'}
          </Text>
        </Group>
        <Badge size="xs" style={{ backgroundColor: 'rgba(27,67,50,0.5)', color: '#86EFAC', border: '1px solid rgba(134,239,172,0.25)', fontSize: 9, letterSpacing: '0.08em' }}>
          LIVE PREVIEW
        </Badge>
      </Box>
      {/* Policy */}
      <Box style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'IBM Plex Sans, sans-serif' }}>Policy Description</Text>
        <Box style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', minHeight: 68, border: '1px solid rgba(255,255,255,0.09)' }}>
          <Text style={{ fontSize: 12.5, color: '#E7E5E0', lineHeight: 1.65, fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {policy.slice(0, charCount)}
            {phase === 'typing' && <span style={{ display: 'inline-block', width: 1.5, height: 13, backgroundColor: '#86EFAC', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'lp-blink 1s step-end infinite' }} />}
          </Text>
        </Box>
      </Box>
      {/* Status / Results */}
      <Box style={{ padding: '14px 18px', minHeight: 108 }}>
        {phase === 'typing' && <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'IBM Plex Sans, sans-serif', fontStyle: 'italic', paddingTop: 12 }}>Complete the policy description to simulate…</Text>}
        {phase === 'analyzing' && (
          <Stack gap={10}>
            <Group gap={8} align="center">
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FBBF24', animation: 'lp-blink 0.7s ease infinite' }} />
              <Text style={{ fontSize: 12, color: '#FBBF24', fontFamily: 'IBM Plex Sans, sans-serif' }}>Sampling personas{dots}</Text>
            </Group>
            <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Sans, sans-serif' }}>Processing 300 synthetic US residents across 50 states</Text>
            <Box style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 4 }}>
              <Box style={{ height: '100%', width: '45%', borderRadius: 2, backgroundColor: '#FBBF24', animation: 'lp-indeterminate 1.4s cubic-bezier(0.4,0,0.2,1) infinite' }} />
            </Box>
          </Stack>
        )}
        {phase === 'results' && (
          <Stack gap={10} style={{ animation: 'lp-score-pop 380ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'IBM Plex Sans, sans-serif' }}>Mean Approval</Text>
                <Group gap={4} align="baseline">
                  <Text style={{ fontSize: 28, fontWeight: 800, color: demo.scoreColor, fontFamily: 'Source Serif 4, serif', lineHeight: 1 }}>{demo.score.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>/5</Text>
                </Group>
                <Text style={{ fontSize: 10.5, color: demo.scoreColor, fontFamily: 'IBM Plex Sans, sans-serif' }}>{demo.label}</Text>
              </Stack>
              <Box style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: `${demo.scoreColor}20`, border: `1px solid ${demo.scoreColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={17} color={demo.scoreColor} />
              </Box>
            </Group>
            <Stack gap={6}>
              {demo.bars.map(bar => (
                <Box key={bar.name}>
                  <Group justify="space-between" style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans, sans-serif' }}>{bar.name}</Text>
                    <Text style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans, sans-serif' }}>{bar.pct}%</Text>
                  </Group>
                  <Box style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <Box style={{ height: '100%', width: `${bar.pct}%`, borderRadius: 2, backgroundColor: bar.color, animation: 'lp-bar-grow 550ms ease both' }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  )
}

// ── LandingHeader ─────────────────────────────────────────────────────────────

function LandingHeader() {
  return (
    <Box component="header" style={{ height: 56, borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Container size="xl" h="100%">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={22} color="var(--color-accent-primary)" strokeWidth={2.5} />
            <Text fw={800} size="md" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em', fontFamily: 'Source Serif 4, serif' }}>InfiniPol</Text>
          </Link>
          <Group gap="xs">
            {([{ label: 'Guide', to: '/guide' }, { label: 'About', to: '/about' }] as const).map(({ label, to }) => (
              <Anchor key={to} component={Link} to={to} size="sm" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '4px 10px', borderRadius: 6 }}>{label}</Anchor>
            ))}
            <Button component={Link} to="/simulations" size="xs" style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}>Open App</Button>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}

// ── HeroSection ───────────────────────────────────────────────────────────────

function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 30, y: 50 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  return (
    <Box
      onMouseMove={handleMouseMove}
      style={{
        background: `
          radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(27,67,50,0.07) 0%, transparent 55%),
          radial-gradient(ellipse 70% 55% at 8% 45%, rgba(27,67,50,0.10) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 92% 15%, rgba(200,169,81,0.06) 0%, transparent 60%),
          var(--color-bg-base)
        `,
        borderBottom: '1px solid var(--color-border-subtle)',
        paddingTop: 80,
        paddingBottom: 80,
        transition: 'background 80ms',
      }}
    >
      <Container size="xl">
        <Group align="center" justify="space-between" wrap="wrap" gap={48} style={{ minHeight: 360 }}>
          {/* Left: headline + CTA */}
          <Stack gap="xl" style={{ flex: '1 1 380px', maxWidth: 560 }}>
            <Text component="h1" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', margin: 0, animation: 'lp-fade-up 650ms ease 80ms both' }}>
              Limitless Policy Testing,{' '}
              <span style={{ color: 'var(--color-accent-primary)' }}>Zero Real Risk.</span>
            </Text>

            <Stack gap={8} style={{ animation: 'lp-fade-up 650ms ease 160ms both' }}>
              <Text size="lg" c="var(--color-text-secondary)" lh={1.7} style={{ maxWidth: 500 }}>
                Don't wait for backlash. Simulate public reactions to any policy proposal using
                300,000+ synthetic personas — before a single real stakeholder sees it.
              </Text>
              <Group gap={6} align="center" style={{ backgroundColor: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 8, padding: '8px 14px', width: 'fit-content' }}>
                <Text style={{ fontSize: 12.5, color: '#B45309', fontWeight: 600 }}>
                  💡 Why wait for a policy to go viral for the wrong reasons?
                </Text>
              </Group>
            </Stack>

            <Group gap="md" wrap="wrap" style={{ animation: 'lp-fade-up 650ms ease 240ms both' }}>
              <Button component={Link} to="/simulations/new" size="lg" rightSection={<ArrowRight size={18} />} className="lp-cta-btn" style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff', fontWeight: 700, paddingLeft: 28, paddingRight: 22 }}>
                Run a Simulation
              </Button>
              <Button component={Link} to="/guide" size="lg" variant="outline" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                How it works
              </Button>
            </Group>

            {/* Trust chips */}
            <Group gap="sm" wrap="wrap" style={{ animation: 'lp-fade-up 650ms ease 320ms both' }}>
              {['No signup required', 'Data stays in browser', 'Under 2 min runtime'].map(chip => (
                <Group key={chip} gap={5} align="center" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 20, padding: '4px 10px' }}>
                  <CheckCircle size={11} color="var(--color-status-success)" />
                  <Text size="xs" c="var(--color-text-tertiary)">{chip}</Text>
                </Group>
              ))}
            </Group>
          </Stack>

          {/* Right: mock card + floating persona chips */}
          <Box
            style={{
              flex: '1 1 320px', maxWidth: 460,
              display: 'flex', justifyContent: 'center',
              position: 'relative',
              animation: 'lp-fade-up 700ms ease 200ms both',
              paddingTop: 32, paddingBottom: 32,
              paddingLeft: 36, paddingRight: 20,
            }}
          >
            <SimMockCard />

            {/* Floating persona chips */}
            {HERO_CHIPS.map(chip => (
              <Box
                key={chip.name}
                className="lp-persona-chip"
                style={{
                  position: 'absolute',
                  ...chip.style,
                  backgroundColor: 'var(--color-bg-surface)',
                  border: `1px solid ${chip.color}40`,
                  borderRadius: 10,
                  padding: '8px 12px',
                  boxShadow: `0 6px 20px -4px ${chip.color}25`,
                  animation: chip.anim,
                  zIndex: 10,
                  minWidth: 160,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{chip.name}</Text>
                <Text style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{chip.role}</Text>
                <Group gap={4} align="center" style={{ marginTop: 5 }}>
                  <Box style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: chip.color, flexShrink: 0 }} />
                  <Text style={{ fontSize: 10, color: chip.color, fontWeight: 600 }}>Approval {chip.score}/5</Text>
                </Group>
              </Box>
            ))}
          </Box>
        </Group>
      </Container>
    </Box>
  )
}

// ── MarqueeTicker ─────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  'Policy Simulation', 'Demographic Breakdowns', 'Behavioral Change Modeling',
  'Approval Scoring', 'Emotion Profiling', 'AI Challenge Mode',
  'Side-by-side Comparison', '300K+ Synthetic Personas', '50 US States',
  'CSV Export', 'Clarification Flow', 'Instant Results',
].join('  ·  ') + '  ·  '

function MarqueeTicker() {
  const doubled = MARQUEE_ITEMS + MARQUEE_ITEMS
  return (
    <Box style={{ backgroundColor: 'var(--color-text-primary)', padding: '9px 0', overflow: 'hidden', userSelect: 'none' }}>
      <Box style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'lp-marquee 36s linear infinite' }}>
        <Text component="span" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11.5, letterSpacing: '0.05em', fontFamily: 'IBM Plex Sans, sans-serif' }}>
          {doubled}
        </Text>
      </Box>
    </Box>
  )
}

// ── StatsBar ──────────────────────────────────────────────────────────────────

function AnimatedStatItem({ num, suffix, label, duration, active }: { num: number; suffix: string; label: string; duration: number; active: boolean }) {
  const count = useCounter(num, duration, active)
  return (
    <Stack align="center" gap={4}>
      <Text fw={800} style={{ fontSize: '2rem', color: '#fff', lineHeight: 1, fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>{count}{suffix}</Text>
      <Text size="xs" style={{ color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</Text>
    </Stack>
  )
}

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const active = useInView(ref)
  return (
    <Box ref={ref} style={{ backgroundColor: 'var(--color-accent-primary)', padding: '24px 0' }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xl">
          {STATS.map(s => <AnimatedStatItem key={s.label} {...s} active={active} />)}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

// ── PersonaStream — scrolling band of persona cards ──────────────────────────

function PersonaStream() {
  const doubled = [...PERSONA_STREAM, ...PERSONA_STREAM]
  return (
    <Box style={{ backgroundColor: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)', padding: '20px 0', overflow: 'hidden' }}>
      <Box style={{ marginBottom: 12, paddingLeft: 32, paddingRight: 32 }}>
        <Group justify="space-between" align="center">
          <Text size="xs" fw={600} style={{ color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sample from the persona pool
          </Text>
          <Text size="xs" c="var(--color-text-disabled)">300,000+ total</Text>
        </Group>
      </Box>
      <Box style={{ overflow: 'hidden', userSelect: 'none' }}>
        <Box style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap', animation: 'lp-persona-marquee 50s linear infinite', paddingLeft: 32 }}>
          {doubled.map((p, i) => (
            <Box
              key={`${p.name}-${i}`}
              className="lp-pstream-card"
              style={{
                backgroundColor: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 168,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{p.name}</Text>
              <Text style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{p.role} · {p.state}</Text>
              <Group gap={5} align="center" style={{ marginTop: 4 }}>
                <Box style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: p.tag, flexShrink: 0 }} />
                <Text style={{ fontSize: 10, color: p.tag, fontWeight: 600 }}>{p.score}/5</Text>
                <Text style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>· {p.emotion}</Text>
              </Group>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

// ── TryItSection — interactive policy simulator ───────────────────────────────

type TryPhase = 'idle' | 'thinking' | 'done'

function TryItSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.1)
  const [text, setText] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [phase, setPhase] = useState<TryPhase>('idle')
  const [result, setResult] = useState<TryResult | null>(null)

  const handlePreset = (preset: typeof POLICY_PRESETS[number]) => {
    setText(preset.text)
    setActive(preset.label)
    setPhase('idle')
    setResult(null)
  }

  const handleSimulate = () => {
    if (!text.trim() || phase === 'thinking') return
    setPhase('thinking')
    setResult(null)
    setTimeout(() => {
      setResult(scoreFromText(text))
      setPhase('done')
    }, 1600)
  }

  const canSimulate = text.trim().length >= 12 && phase !== 'thinking'

  return (
    <Box
      py={80}
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 50%, rgba(27,67,50,0.05) 0%, transparent 70%),
          var(--color-bg-surface)
        `,
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Container size="md" ref={ref}>
        <Stack gap={40}>
          {/* Heading */}
          <Stack
            align="center" gap="sm" style={{ textAlign: 'center' }}
            className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
          >
            <Badge size="md" variant="light" style={{ backgroundColor: 'var(--color-accent-primary-subtle)', color: 'var(--color-accent-primary)', border: '1px solid rgba(27,67,50,0.25)', fontWeight: 600, width: 'fit-content' }}>
              Interactive Demo
            </Badge>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              See it in action — try any policy idea
            </Text>
            <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 480 }}>
              Type a policy description and get an instant preview of how the synthetic
              US population is likely to react.
            </Text>
          </Stack>

          {/* Interactive block */}
          <Box
            className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
            style={{
              transitionDelay: visible ? '100ms' : '0ms',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* Preset chips */}
            <Box style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
              <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={10} style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Quick Start — pick a category
              </Text>
              <Group gap={8} wrap="wrap">
                {POLICY_PRESETS.map(p => (
                  <Box
                    key={p.label}
                    className={`lp-try-chip${active === p.label ? ' active' : ''}`}
                    onClick={() => handlePreset(p)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: '1px solid var(--color-border-default)',
                      backgroundColor: active === p.label ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                      color: active === p.label ? '#fff' : 'var(--color-text-secondary)',
                      userSelect: 'none',
                    }}
                  >
                    {p.label}
                  </Box>
                ))}
              </Group>
            </Box>

            {/* Textarea + button */}
            <Box style={{ padding: '20px' }}>
              <Textarea
                placeholder="Describe a policy idea — e.g. 'Universal childcare subsidy for families earning under $80K…'"
                value={text}
                onChange={e => { setText(e.currentTarget.value); setActive(null); setPhase('idle'); setResult(null) }}
                minRows={3}
                maxRows={5}
                styles={{
                  input: {
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: 13.5,
                    backgroundColor: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 10,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.6,
                    padding: '12px 14px',
                  },
                }}
              />

              <Group justify="space-between" align="center" mt={14}>
                <Text size="xs" c="var(--color-text-disabled)">
                  {text.length} chars · keyword-based instant preview
                </Text>
                <Button
                  onClick={handleSimulate}
                  disabled={!canSimulate}
                  leftSection={phase === 'thinking' ? undefined : <Play size={14} />}
                  size="sm"
                  style={{
                    backgroundColor: canSimulate ? 'var(--color-accent-primary)' : undefined,
                    color: canSimulate ? '#fff' : undefined,
                    fontWeight: 600,
                  }}
                >
                  {phase === 'thinking' ? 'Analyzing…' : 'Simulate →'}
                </Button>
              </Group>
            </Box>

            {/* Thinking shimmer */}
            {phase === 'thinking' && (
              <Box style={{ padding: '0 20px 20px' }}>
                <Stack gap={8}>
                  {[80, 60, 45].map(w => (
                    <Box key={w} className="lp-shimmer" style={{ height: 14, borderRadius: 7, width: `${w}%` }} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Results */}
            {phase === 'done' && result && (
              <Box style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '20px', animation: 'lp-try-in 400ms ease both' }}>
                <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={16} style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Preview Results · 300 persona sample
                </Text>

                {/* Score + metrics */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb={20}>
                  {/* Approval score */}
                  <Box style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                    <Text size="xs" c="var(--color-text-tertiary)" mb={6} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mean Approval</Text>
                    <Group gap={4} align="baseline">
                      <Text fw={800} style={{ fontSize: '1.8rem', color: result.scoreColor, lineHeight: 1, fontFamily: 'Source Serif 4, serif' }}>{result.score.toFixed(1)}</Text>
                      <Text size="sm" c="var(--color-text-tertiary)">/5</Text>
                    </Group>
                    <Text size="xs" style={{ color: result.scoreColor, marginTop: 4, fontWeight: 600 }}>{result.label}</Text>
                  </Box>
                  {/* Dominant emotion */}
                  <Box style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                    <Text size="xs" c="var(--color-text-tertiary)" mb={6} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dominant Emotion</Text>
                    <Text fw={700} size="lg" c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>{result.emotion}</Text>
                    <Text size="xs" c="var(--color-text-tertiary)" mt={4}>across sampled personas</Text>
                  </Box>
                  {/* Behavioral change */}
                  <Box style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                    <Text size="xs" c="var(--color-text-tertiary)" mb={6} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Behavioral Change</Text>
                    <Text fw={700} size="lg" c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>{result.change}</Text>
                    <Text size="xs" c="var(--color-text-tertiary)" mt={4}>estimated likelihood</Text>
                  </Box>
                </SimpleGrid>

                {/* Distribution bars */}
                <Stack gap={8} mb={20}>
                  {[
                    { name: 'Support', pct: result.support, color: '#15803D' },
                    { name: 'Neutral', pct: result.neutral, color: '#78716C' },
                    { name: 'Concern', pct: result.concern, color: '#EA580C' },
                  ].map(bar => (
                    <Box key={bar.name}>
                      <Group justify="space-between" mb={5}>
                        <Text size="xs" c="var(--color-text-secondary)" fw={500}>{bar.name}</Text>
                        <Text size="xs" c="var(--color-text-tertiary)">{bar.pct}%</Text>
                      </Group>
                      <Box style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--color-bg-muted)' }}>
                        <Box style={{ height: '100%', width: `${bar.pct}%`, borderRadius: 4, backgroundColor: bar.color, animation: 'lp-bar-grow 600ms ease both' }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* CTA */}
                <Group align="center" gap="md">
                  <Button
                    component={Link}
                    to="/simulations/new"
                    size="sm"
                    rightSection={<ChevronRight size={14} />}
                    style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff', fontWeight: 600 }}
                  >
                    Run full simulation
                  </Button>
                  <Text size="xs" c="var(--color-text-disabled)">
                    Full run uses all 300K personas with demographic breakdowns, quotes, and export.
                  </Text>
                </Group>
              </Box>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

// ── FeaturesSection ───────────────────────────────────────────────────────────

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.05)
  return (
    <Box py={80} style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <Container size="lg">
        <Stack gap={48}>
          <Stack align="center" gap="sm" style={{ textAlign: 'center' }} className={`lp-reveal ${visible ? 'lp-visible' : ''}`}>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              Everything you need to pressure-test a policy
            </Text>
            <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 520 }}>
              InfiniPol gives policy analysts, researchers, and advocates a complete toolkit
              for understanding public response — before the policy goes live.
            </Text>
          </Stack>
          <SimpleGrid ref={ref} cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {FEATURES.map((f, i) => (
              <Box key={f.title} className={`lp-reveal lp-feature-card ${visible ? 'lp-visible' : ''}`} style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 12, padding: '24px', transitionDelay: visible ? `${i * 70}ms` : '0ms' }}>
                <Box className="lp-feature-icon" style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: f.color }}>
                  {f.icon}
                </Box>
                <Text fw={700} size="sm" mb={8} c="var(--color-text-primary)">{f.title}</Text>
                <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{f.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

// ── UseCasesSection ───────────────────────────────────────────────────────────

function UseCasesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.1)
  return (
    <Box py={80} style={{ backgroundColor: 'var(--color-bg-base)', borderTop: '1px solid var(--color-border-subtle)' }}>
      <Container size="lg">
        <Stack gap={48}>
          <Stack align="center" gap="sm" style={{ textAlign: 'center' }} className={`lp-reveal ${visible ? 'lp-visible' : ''}`}>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              Built for every policy professional
            </Text>
            <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 480 }}>
              Whether you're testing a single proposal or running dozens of variants,
              InfiniPol fits into your workflow.
            </Text>
          </Stack>
          <SimpleGrid ref={ref} cols={{ base: 1, sm: 3 }} spacing="lg">
            {USE_CASES.map((u, i) => (
              <Box
                key={u.role}
                className={`lp-reveal lp-usecase ${visible ? 'lp-visible' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 14,
                  padding: '28px 24px',
                  transitionDelay: visible ? `${i * 90}ms` : '0ms',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent top stripe */}
                <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: u.color, borderRadius: '14px 14px 0 0' }} />
                <Box style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${u.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: u.color }}>
                  {u.icon}
                </Box>
                <Badge size="sm" mb={12} style={{ backgroundColor: `${u.color}15`, color: u.color, border: `1px solid ${u.color}30`, fontWeight: 600 }}>
                  {u.role}
                </Badge>
                <Text size="sm" fw={600} c="var(--color-text-primary)" lh={1.55} mb={10} style={{ fontStyle: 'italic' }}>
                  {u.quote}
                </Text>
                <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{u.detail}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

// ── HowItWorksSection ─────────────────────────────────────────────────────────

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.1)
  const steps = [
    { n: '01', title: 'Describe your policy', body: 'Write a plain-language description — scope, mechanisms, costs, benefits. The clearer the input, the sharper the simulation.' },
    { n: '02', title: 'Choose your audience', body: 'Filter by state, age, sex, education, or occupation — or leave blank for a nationally representative US sample.' },
    { n: '03', title: 'Run & review', body: 'Get a mean approval score (1–5), emotion profile, behavioral-change estimate, demographic breakdown, and persona quotes.' },
    { n: '04', title: 'Challenge & iterate', body: 'Use AI Challenge Mode to stress-test weak spots, compare two variants side-by-side, or refine the wording and re-run.' },
  ]
  return (
    <Box py={80} style={{ backgroundColor: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <Container size="lg">
        <Stack gap={52}>
          <Stack align="center" gap="sm" style={{ textAlign: 'center' }} className={`lp-reveal ${visible ? 'lp-visible' : ''}`}>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              From policy idea to public insight in 4 steps
            </Text>
            <Text size="md" c="var(--color-text-secondary)">Write · Configure · Run · Iterate.</Text>
          </Stack>
          <SimpleGrid ref={ref} cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            {steps.map((s, i) => (
              <Box key={s.n} className={`lp-reveal lp-step ${visible ? 'lp-visible' : ''}`} style={{ textAlign: 'center', transitionDelay: visible ? `${i * 100}ms` : '0ms' }}>
                <Box style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--color-accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontFamily: 'Source Serif 4, serif', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(27,67,50,0.35)', position: 'relative', zIndex: 1 }}>
                  {s.n}
                </Box>
                <Text fw={700} size="sm" mb={8} c="var(--color-text-primary)">{s.title}</Text>
                <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{s.body}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

// ── CtaSection ────────────────────────────────────────────────────────────────

function CtaSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref)
  return (
    <Box py={96} style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(27,67,50,0.09) 0%, transparent 70%), var(--color-bg-base)` }}>
      <Container size="sm" ref={ref}>
        <Stack align="center" gap="xl" style={{ textAlign: 'center' }} className={`lp-reveal ${visible ? 'lp-visible' : ''}`}>
          <Text fw={800} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Ready to simulate your first policy?
          </Text>
          <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 420 }}>
            It takes under two minutes. No signup required — your data stays in your browser.
          </Text>
          <Group gap="md" justify="center" wrap="wrap">
            <Box style={{ position: 'relative' }}>
              {/* Pulse ring */}
              <Box style={{ position: 'absolute', inset: 0, borderRadius: 8, backgroundColor: 'var(--color-accent-primary)', animation: 'lp-pulse-ring 2s ease-out infinite', zIndex: 0 }} />
              <Button component={Link} to="/simulations/new" size="lg" rightSection={<ChevronRight size={18} />} className="lp-cta-btn" style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff', fontWeight: 700, paddingLeft: 28, paddingRight: 22, boxShadow: '0 4px 20px rgba(27,67,50,0.3)', position: 'relative', zIndex: 1 }}>
                Start Simulating
              </Button>
            </Box>
            <Button component={Link} to="/simulations" size="lg" variant="subtle" color="gray">View Simulations</Button>
          </Group>
          <Text size="xs" c="var(--color-text-disabled)" style={{ maxWidth: 360 }}>
            Synthetic personas from NVIDIA Nemotron-Personas (CC BY 4.0). Results are AI-generated — always validate with primary research.
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}

// ── LandingFooter ─────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <Box component="footer" style={{ borderTop: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)', padding: '16px 32px' }}>
      <Container size="xl">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Text size="xs" c="var(--color-text-tertiary)">InfiniPol · Simulation results are based on synthetic personas and do not represent real individuals.</Text>
          <Group gap="lg">
            {([{ label: 'Simulations', to: '/simulations' }, { label: 'Guide', to: '/guide' }, { label: 'About', to: '/about' }] as const).map(({ label, to }) => (
              <Anchor key={to} component={Link} to={to} size="xs" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>{label}</Anchor>
            ))}
            <Text size="xs" c="var(--color-text-tertiary)">Synthetic personas: NVIDIA Nemotron-Personas (CC BY 4.0)</Text>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}

// ── AntiViralHookBanner — between StatsBar and PersonaStream ─────────────────

function AntiViralHookBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.2)
  return (
    <Box
      ref={ref}
      py={56}
      style={{
        background: 'var(--color-bg-base)',
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Container size="sm">
        <Stack
          align="center"
          gap="lg"
          style={{ textAlign: 'center' }}
          className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
        >
          <Text
            fw={800}
            style={{
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              color: 'var(--color-text-primary)',
              fontFamily: 'Source Serif 4, serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
            }}
          >
            Policies don't fail quietly.
          </Text>
          <Text size="lg" c="var(--color-text-secondary)" lh={1.7} style={{ maxWidth: 540 }}>
            They fail publicly — in headlines, in protests, in viral backlash. InfiniPol lets you
            catch the failure mode before anyone outside the room knows the policy exists.
            Internal testing with demographic data that actually represents your population.
          </Text>
          <Group gap={8} wrap="wrap" justify="center">
            {[
              'Test before it goes public',
              'Catch the demographic gaps early',
              'Iterate in hours, not months',
            ].map(chip => (
              <Group key={chip} gap={5} align="center" style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', borderRadius: 20, padding: '5px 12px' }}>
                <CheckCircle size={11} color="var(--color-status-success)" />
                <Text size="xs" fw={500} c="var(--color-text-secondary)">{chip}</Text>
              </Group>
            ))}
          </Group>
        </Stack>
      </Container>
    </Box>
  )
}

// ── GlobalVisionSection ───────────────────────────────────────────────────────

const REGIONS = [
  { name: 'United States', flag: '🇺🇸', status: 'Live', statusColor: '#15803D', detail: '300K+ NVIDIA Nemotron personas across 50 states' },
  { name: 'Indonesia',     flag: '🇮🇩', status: 'Coming Soon', statusColor: '#0369A1', detail: 'Regional breakdown across 34 provinces' },
  { name: 'European Union', flag: '🇪🇺', status: 'Planned', statusColor: '#78716C', detail: 'Cross-country personas for all 27 EU member states' },
  { name: 'India',         flag: '🇮🇳', status: 'Planned', statusColor: '#78716C', detail: 'Stratified by state, caste category, and urban/rural' },
  { name: 'Brazil',        flag: '🇧🇷', status: 'Planned', statusColor: '#78716C', detail: 'Regionalized by IBGE geographic areas' },
  { name: 'Australia',     flag: '🇦🇺', status: 'Planned', statusColor: '#78716C', detail: 'SLA-level demographic breakdown' },
]

function GlobalVisionSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.08)
  return (
    <Box
      py={80}
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 50% 50%, rgba(3,105,161,0.05) 0%, transparent 65%),
          var(--color-bg-surface)
        `,
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Container size="lg">
        <Stack gap={56}>
          <Stack
            align="center" gap="sm" style={{ textAlign: 'center' }}
            className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
          >
            <Box style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(3,105,161,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Globe size={22} color="#0369A1" />
            </Box>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              Built for the world, starting with the US
            </Text>
            <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 520 }}>
              Policy challenges are not bounded by borders. We're building localised, country-specific
              datasets so every policy professional can test in context — not just against a generic
              US demographic. InfiniPol is going global.
            </Text>
          </Stack>

          <SimpleGrid ref={ref} cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {REGIONS.map((r, i) => (
              <Box
                key={r.name}
                className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
                style={{
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 12,
                  padding: '20px',
                  transitionDelay: visible ? `${i * 60}ms` : '0ms',
                  opacity: r.status === 'Live' ? 1 : 0.82,
                }}
              >
                <Group gap={10} align="center" mb={10}>
                  <Text style={{ fontSize: 24 }}>{r.flag}</Text>
                  <Box style={{ flex: 1 }}>
                    <Text fw={700} size="sm" c="var(--color-text-primary)">{r.name}</Text>
                    <Box style={{ display: 'inline-block', marginTop: 2, backgroundColor: `${r.statusColor}18`, border: `1px solid ${r.statusColor}40`, borderRadius: 20, padding: '2px 8px' }}>
                      <Text style={{ fontSize: 10, fontWeight: 600, color: r.statusColor }}>{r.status}</Text>
                    </Box>
                  </Box>
                </Group>
                <Text size="xs" c="var(--color-text-tertiary)" lh={1.5}>{r.detail}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

// ── RoadmapSection ────────────────────────────────────────────────────────────

const ROADMAP = [
  {
    quarter: 'Q2 2026',
    title: 'Indonesia Launch',
    description: 'First international dataset — 270 million personas across 34 provinces, stratified by age, education, occupation, and urban/rural status.',
    icon: <Globe size={16} />,
    color: '#0D9488',
    done: false,
  },
  {
    quarter: 'Q3 2026',
    title: 'EU Dataset',
    description: 'Pan-European persona set covering all 27 EU member states, with country-specific cultural and economic nuance for cross-border policy testing.',
    icon: <Globe size={16} />,
    color: '#0369A1',
    done: false,
  },
  {
    quarter: 'Q4 2026',
    title: 'Multi-language Support',
    description: 'Policy input and persona responses in local languages — starting with Bahasa Indonesia, French, German, and Portuguese.',
    icon: <Rocket size={16} />,
    color: '#7C3AED',
    done: false,
  },
  {
    quarter: '2027',
    title: 'Global Coverage',
    description: '50+ countries, including India, Brazil, and Australia. Localised datasets for each major region with regulatory and cultural adapters.',
    icon: <Calendar size={16} />,
    color: '#B45309',
    done: false,
  },
]

function RoadmapSection() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, 0.1)
  return (
    <Box py={80} style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <Container size="lg">
        <Stack gap={52}>
          <Stack
            align="center" gap="sm" style={{ textAlign: 'center' }}
            className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
          >
            <Box style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Rocket size={22} color="#7C3AED" />
            </Box>
            <Text fw={700} style={{ fontSize: '1.8rem', color: 'var(--color-text-primary)', fontFamily: 'Source Serif 4, serif', letterSpacing: '-0.02em' }}>
              What's coming next
            </Text>
            <Text size="md" c="var(--color-text-secondary)" style={{ maxWidth: 480 }}>
              InfiniPol is under active development. Here's what we're building toward.
            </Text>
          </Stack>

          <Box ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {/* Vertical line */}
            <Box style={{ position: 'absolute', left: 19, top: 40, bottom: 40, width: 2, backgroundColor: 'var(--color-border-subtle)', zIndex: 0 }} />

            {ROADMAP.map((item, i) => (
              <Box
                key={item.quarter}
                className={`lp-reveal ${visible ? 'lp-visible' : ''}`}
                style={{
                  display: 'flex',
                  gap: 20,
                  marginBottom: i < ROADMAP.length - 1 ? 28 : 0,
                  transitionDelay: visible ? `${i * 90}ms` : '0ms',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Circle */}
                <Box style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: `${item.color}18`, border: `2px solid ${item.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.color }}>
                  {item.icon}
                </Box>

                <Box style={{ paddingTop: 8, flex: 1, backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: '16px 20px' }}>
                  <Group gap={10} align="center" mb={6}>
                    <Badge size="sm" style={{ backgroundColor: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30`, fontWeight: 600 }}>
                      {item.quarter}
                    </Badge>
                    <Text fw={700} size="sm" c="var(--color-text-primary)">{item.title}</Text>
                  </Group>
                  <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{item.description}</Text>
                </Box>
              </Box>
            ))}
          </Box>

        </Stack>
      </Container>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    const id = 'lp-animations'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = ANIM_CSS
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)' }}>
      <LandingHeader />
      <Box style={{ flex: 1 }}>
        <HeroSection />
        <MarqueeTicker />
        <StatsBar />
        <AntiViralHookBanner />
        <PersonaStream />
        <TryItSection />
        <FeaturesSection />
        <UseCasesSection />
        <GlobalVisionSection />
        <RoadmapSection />
        <HowItWorksSection />
        <CtaSection />
      </Box>
      <LandingFooter />
    </Box>
  )
}
