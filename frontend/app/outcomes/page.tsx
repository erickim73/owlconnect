"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  FlaskConical,
  Code,
  Users,
  Trophy,
  Target,
  Rocket,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronRight,
  Circle,
  Map,
  Sparkles,
} from "lucide-react";
import Navigation from "@/components/nav";

/**
 * Mentee → Mentor Visual Roadmap
 * --------------------------------------------------------------
 * Drop this into a page (e.g., /app/roadmap/page.tsx) to render a
 * subway-map style journey from mentee to mentor, with clickable
 * stops that unpack actions to close the gap.
 *
 * Styling: Tailwind (rounded-2xl, soft shadows), micro-animations
 * via framer-motion. Icons from lucide-react.
 */

// ——— Types
 type Milestone = {
  id: string;
  title: string;
  track: "Academics" | "Research" | "Internships" | "Projects" | "Skills" | "Leadership" | "Network" | "Impact";
  icon: React.ComponentType<{ className?: string }>;
  why: string;
  mentorDid: string;
  menteeNow: string;
  deltaNote: string;
  etaWeeks: number; // suggested time to reach parity
  impact: 1 | 2 | 3 | 4 | 5; // 5 = huge leverage
  effort: 1 | 2 | 3 | 4 | 5; // 5 = heavy lift
  deps?: string[]; // ids
  actions: { id: string; label: string; done?: boolean; }[];
};

 type Person = {
  name: string;
  role: string;
  meta: string;
  initials: string;
  colorFrom: string;
  colorTo: string;
};

// ——— Sample Data (replace with live data)
const MENTOR: Person = {
  name: "Sarah Chen",
  role: "Senior Software Engineer · Google",
  meta: "5 yrs • CS, Stanford",
  initials: "SC",
  colorFrom: "from-indigo-500",
  colorTo: "to-fuchsia-500",
};

const MENTEE: Person = {
  name: "Evan Tu",
  role: "Mentee • CS @ Rice",
  meta: "Sophomore • AI/ML & Infra",
  initials: "ET",
  colorFrom: "from-sky-500",
  colorTo: "to-violet-500",
};

const SEED: Milestone[] = [
  {
    id: "academics",
    title: "Strong CS Core (3.8+)",
    track: "Academics",
    icon: GraduationCap,
    why: "Signals fundamentals & opens doors to top teams and grad seminars.",
    mentorDid: "Completed core systems/algorithms with A/A-, TA in 321.",
    menteeNow: "On track; a few tough systems courses upcoming.",
    deltaNote: "Sustain GPA ≥3.8 while stacking systems + algorithms proof points.",
    etaWeeks: 10,
    impact: 5,
    effort: 4,
    actions: [
      { id: "a1", label: "Block 2×3h deep-work sessions/week for COMP 312/321." },
      { id: "a2", label: "Write 1-page concept notes after each lecture (Zettelkasten)." },
      { id: "a3", label: "Office hours checklist: 2 Qs/week tied to past exams." },
    ],
  },
  {
    id: "research",
    title: "1 Paper / Workshop Poster",
    track: "Research",
    icon: FlaskConical,
    why: "Gives narrative credibility & differentiation for ML/infra.",
    mentorDid: "Undergrad poster at NeurIPS workshop w/ faculty collab.",
    menteeNow: "RUSH Lab direction forming; experiments in progress.",
    deltaNote: "Narrow scope; sprint toward empirical result & tidy write-up.",
    etaWeeks: 12,
    impact: 4,
    effort: 4,
    deps: ["academics"],
    actions: [
      { id: "r1", label: "Freeze a minimal experiment plan with advisor sign-off." },
      { id: "r2", label: "Weekly reproducibility report (seed, hash, commit)." },
      { id: "r3", label: "Draft 2-page extended abstract by week 6." },
    ],
  },
  {
    id: "internships",
    title: "Tier-1 SWE Internship",
    track: "Internships",
    icon: Briefcase,
    why: "Validates execution in production; compounds with referrals.",
    mentorDid: "Google STEP ➝ SWE; shipped feature to 10M+ users.",
    menteeNow: "Apple AI/ML SRE return offer in motion for '26.",
    deltaNote: "Frame infra wins as product impact; prep for on-sites elsewhere.",
    etaWeeks: 8,
    impact: 5,
    effort: 3,
    actions: [
      { id: "i1", label: "Weekly DSA drills (90m) + 1 system design kata." },
      { id: "i2", label: "Refresh resume w/ hard metrics + links/screenshots." },
      { id: "i3", label: "Targeted reach-outs: 3/week to alumni + L6+ eng." },
    ],
  },
  {
    id: "projects",
    title: "Signature Project (Public)",
    track: "Projects",
    icon: Code,
    why: "A memorable artifact hiring managers can open in 30s.",
    mentorDid: "Published OSS lib; 2k GitHub ⭐ and a demo post.",
    menteeNow: "ScentSync, SlayAI, Waffleform drafts—great raw material.",
    deltaNote: "Polish 1 into a crisp 3-min demo + README; ship v1.0.",
    etaWeeks: 6,
    impact: 4,
    effort: 3,
    actions: [
      { id: "p1", label: "Cut scope to 1 killer use-case; write crisp README." },
      { id: "p2", label: "Record 120s Loom demo; add to landing page." },
      { id: "p3", label: "Submit to 1 newsletter + HN/Reddit launch thread." },
    ],
  },
  {
    id: "skills",
    title: "Infra & AI-Agents Mastery",
    track: "Skills",
    icon: BookOpen,
    why: "Bridges SRE + AI product; rare combo.",
    mentorDid: "Designed K8s operators; production LLM evaluation infra.",
    menteeNow: "Helm, Spinnaker, FastAPI microservices, MCP curiosity.",
    deltaNote: "Package your infra patterns as reusable templates.",
    etaWeeks: 8,
    impact: 4,
    effort: 3,
    actions: [
      { id: "s1", label: "Write a K8s onboarding CRD + Helm starter (public)." },
      { id: "s2", label: "Ship an MCP server for infra tasks (scaffold)." },
      { id: "s3", label: "Post a design doc with diagrams (ADR-style)." },
    ],
  },
  {
    id: "leadership",
    title: "Lead a Team (Campus)",
    track: "Leadership",
    icon: Users,
    why: "Management signal; shows you multiply others.",
    mentorDid: "Led 6 interns; ran weekly sprints and retros.",
    menteeNow: "RiceApps tech lead opportunities available.",
    deltaNote: "Stand up a small squad; deliver on time with metrics.",
    etaWeeks: 8,
    impact: 3,
    effort: 2,
    actions: [
      { id: "l1", label: "Define 12-week roadmap + KPIs; recruit contributors." },
      { id: "l2", label: "Run standups, retro; demo monthly to stakeholders." },
      { id: "l3", label: "Write a postmortem with lessons learned." },
    ],
  },
  {
    id: "network",
    title: "Mentor Board of 5",
    track: "Network",
    icon: Target,
    why: "Warm intros & signal boosting beat cold apps.",
    mentorDid: "Built 5-person advisory ring across teams.",
    menteeNow: "Several active mentors; formalize cadence.",
    deltaNote: "Calendar a 6-week rotation + quarterly updates.",
    etaWeeks: 4,
    impact: 4,
    effort: 2,
    actions: [
      { id: "n1", label: "Identify 5 mentors; propose 20-min quarterly sync." },
      { id: "n2", label: "Ship monthly progress email w/ 3 bullets & 1 ask." },
      { id: "n3", label: "Offer help: PRs, notes, student recruiting." },
    ],
  },
  {
    id: "impact",
    title: "External Impact Signal",
    track: "Impact",
    icon: Trophy,
    why: "Talks, awards, or blog give compounding credibility.",
    mentorDid: "Lightning talk at Google Eng Summit; blog subscribers.",
    menteeNow: "HackRice winner; LaunchPad progress; >400 WL users.",
    deltaNote: "Turn wins into a polished narrative & talk.",
    etaWeeks: 5,
    impact: 3,
    effort: 2,
    actions: [
      { id: "x1", label: "Write 1 conference-style talk from project lessons." },
      { id: "x2", label: "Publish 2 blog posts: design + metrics." },
      { id: "x3", label: "Apply to give a 7-min lightning talk on campus." },
    ],
  },
];

// ——— Utilities
function chipColor(track: Milestone["track"]) {
  switch (track) {
    case "Academics":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "Research":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Internships":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Projects":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "Skills":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Leadership":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "Network":
      return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200";
    case "Impact":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }
}

function score(impact: number, effort: number) {
  return impact * 2 - effort; // simple leverage score
}

function initialsBadge(person: Person) {
  return (
    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${person.colorFrom} ${person.colorTo} flex items-center justify-center text-white font-semibold shadow`}>{person.initials}</div>
  );
}

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }>
= ({ children, className }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm ${className || ""}`}>
    {children}
  </div>
);

const ProgressPill: React.FC<{ label: string; value: number }>
= ({ label, value }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
    <div className="w-10 text-right text-sm text-gray-700 font-medium">{Math.round(value)}%</div>
  </div>
);

const StopDot: React.FC<{ active?: boolean }>
= ({ active }) => (
  <div className={`h-5 w-5 rounded-full border-2 ${active ? "border-fuchsia-500 bg-fuchsia-500/20" : "border-gray-300 bg-white"}`} />
);

// ——— Main Component
export default function MentorRoadmap() {
  const [activeId, setActiveId] = useState<string>(SEED[0].id);
  const [milestones, setMilestones] = useState<Milestone[]>(SEED);
  const active = milestones.find((m) => m.id === activeId)!;

  const leverageOrder = useMemo(
    () =>
      [...milestones].sort((a, b) => score(b.impact, b.effort) - score(a.impact, a.effort)),
    [milestones]
  );

  const actions = useMemo(() =>
    milestones.flatMap((m) => m.actions.map((a) => ({ ...a, mid: m.id, mtitle: m.title, impact: m.impact, effort: m.effort }))),
    [milestones]
  );

  const completion = useMemo(() => {
    // naive completion: actions done / total
    const total = actions.length;
    const done = actions.filter((a) => (a as any).done).length;
    return total === 0 ? 0 : (done / total) * 100;
  }, [actions]);

  function toggleAction(mid: string, aid: string) {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id !== mid
          ? m
          : {
              ...m,
              actions: m.actions.map((a) => (a.id === aid ? { ...a, done: !a.done } : a)),
            }
      )
    );
  }

  return (
    <div className="min-h-[100vh] w-full bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
          Compare Your Journey with <span className="bg-gradient-to-r from-sky-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Successful Mentors</span>
        </motion.h1>
        <p className="mt-2 text-gray-600 max-w-3xl">See your path from <strong>{MENTEE.name}</strong> to <strong>{MENTOR.name}</strong>. Click each stop to reveal exactly what to do to reach parity.</p>
      </div>

      {/* Mentee → Mentor strip */}
      <div className="mx-auto max-w-6xl px-4">
        <SectionCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-3">
              {initialsBadge(MENTEE)}
              <div>
                <div className="font-semibold">{MENTEE.name}</div>
                <div className="text-sm text-gray-600">{MENTEE.role}</div>
                <div className="text-xs text-gray-500">{MENTEE.meta}</div>
              </div>
            </div>

            <div className="relative">
            </div>

            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <div className="font-semibold">{MENTOR.name}</div>
                <div className="text-sm text-gray-600">{MENTOR.role}</div>
                <div className="text-xs text-gray-500">{MENTOR.meta}</div>
              </div>
              {initialsBadge(MENTOR)}
            </div>
          </div>

        </SectionCard>
      </div>

      {/* Subway-style Roadmap */}
      <div className="mx-auto max-w-6xl px-4 mt-8">
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600"/>Your Personalized Subway Map</div>
            <div className="text-xs text-gray-500">Click a stop to open its playbook</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] py-6">
              {/* line */}
              <div className="relative h-24">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 shadow-inner" />
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  {leverageOrder.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className={`group flex flex-col items-center -mt-2 focus:outline-none`}
                    >
                      <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-sm transition-all ${activeId === m.id ? "border-fuchsia-500 bg-white scale-105" : "border-white/60 bg-white/90"}`}>
                        <m.icon className={`h-5 w-5 ${activeId === m.id ? "text-fuchsia-600" : "text-gray-500"}`} />
                      </div>
                      <div className="mt-4 text-xs font-medium text-gray-700 group-hover:text-gray-900 text-center w-28 truncate">{m.title}</div>
                      <div className={`mb-1 mt-1 text-[10px] px-2 py-0.5 rounded-full ring-1 ${chipColor(m.track)} whitespace-nowrap`}>{m.track}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Active Stop: Playbook */}
      <div className="mx-auto max-w-6xl px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <active.icon className="h-6 w-6 text-fuchsia-600" />
              <div>
                <div className="font-semibold text-lg">{active.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{active.track}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Leverage Score: <span className="font-semibold text-gray-700">{score(active.impact, active.effort)}</span></div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl p-3 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">Why it matters</div>
              <div className="text-sm text-gray-600">{active.why}</div>
            </div>
            <div className="rounded-xl p-3 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">What {MENTOR.name.split(" ")[0]} did</div>
              <div className="text-sm text-gray-600">{active.mentorDid}</div>
            </div>
            <div className="rounded-xl p-3 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">Your current state</div>
              <div className="text-sm text-gray-600">{active.menteeNow}</div>
            </div>
          </div>

          <div className="mt-3 text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-xl p-3">
            <strong>Gap to close:</strong> {active.deltaNote}
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">Playbook (check off as you go)</div>
            <div className="space-y-2">
              {active.actions.map((a) => (
                <label key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
                    checked={a.done || false}
                    onChange={() => toggleAction(active.id, a.id)}
                  />
                  <div className="text-sm text-gray-700 flex-1">{a.label}</div>
                  {(a.done || false) ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : <Circle className="h-5 w-5 text-gray-300"/>}
                </label>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Right column: Priorities & Schedule */}
        <div className="space-y-6">
          <SectionCard>
            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Rocket className="h-4 w-4 text-sky-600"/> Top Leverage Next</div>
            <ol className="space-y-2 list-decimal list-inside">
              {leverageOrder.slice(0,4).map((m) => (
                <li key={m.id} className="text-sm text-gray-700 flex items-center justify-between">
                  <button onClick={() => setActiveId(m.id)} className="hover:underline text-left">{m.title}</button>
                  <span className="text-xs text-gray-500">{m.etaWeeks}w • L={score(m.impact, m.effort)}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard>
            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-amber-600"/> This Week's Plan</div>
            <div className="text-sm text-gray-600">Focus on the highest leverage action inside the selected stop.</div>
            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800">
              <ul className="list-disc list-inside space-y-1">
                {active.actions.slice(0,2).map((a) => (
                  <li key={a.id}>{a.label}</li>
                ))}
              </ul>
            </div>
          </SectionCard>
        </div>
      </div>

     <br />
    </div>
  );
}
