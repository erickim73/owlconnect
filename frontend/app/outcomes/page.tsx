"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Briefcase, FlaskConical, Code, Users, Trophy, Target, BookOpen,
  CheckCircle2, Circle, Rocket, Sparkles,
} from "lucide-react";
import Navigation from "@/components/nav";
import { useSearchParams } from "next/navigation";

// -------- icon string -> component mapping (must match backend enum)
const IconMap = {
  GraduationCap,
  FlaskConical,
  Briefcase,
  Code,
  BookOpen,
  Users,
  Target,
  Trophy,
} as const;

// ---------- Types
type Track =
  | "Academics" | "Research" | "Internships" | "Projects"
  | "Skills" | "Leadership" | "Network" | "Impact";

// shape after normalization (icon is a component)
type Milestone = {
  id: string;
  title: string;
  track: Track;
  icon: React.ComponentType<{ className?: string }>;
  why: string;
  mentorDid: string;
  menteeNow: string;
  deltaNote: string;
  etaWeeks: number;
  impact: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  deps?: string[];
  actions: { id: string; label: string; done?: boolean }[];
};

// shape from API (icon is a string key)
type ApiMilestone = Omit<Milestone, "icon"> & { icon: keyof typeof IconMap };

type Person = {
  name: string;
  role: string;
  meta: string;
  initials: string;
  colorFrom: string;
  colorTo: string;
  description: string
};

// ---------- UI helpers
function chipColor(track: Track) {
  switch (track) {
    case "Academics":   return "bg-sky-50 text-sky-700 ring-sky-200";
    case "Research":    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Internships": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Projects":    return "bg-violet-50 text-violet-700 ring-violet-200";
    case "Skills":      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Leadership":  return "bg-rose-50 text-rose-700 ring-rose-200";
    case "Network":     return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200";
    case "Impact":      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }
}

function score(impact: number, effort: number) {
  return impact * 2 - effort;
}

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm ${className || ""}`}>
    {children}
  </div>
);

// ---------- Page
export default function MentorRoadmap() {
  const sp = useSearchParams();
  const token = sp.get("token");

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [mentee, setMentee] = useState<{ name: string; major: string, paragraph_text: string }>({
    name: "",
    major: "",
    paragraph_text: ""
  });
  const [MENTOR, setCurrentMentor] = useState<Person>({
    name: "",
    role: "",
    meta: "",
    initials: "",
    colorFrom: "from-sky-500",
    colorTo: "to-violet-500",
    description: ""
  });

  // read sessionStorage once (client-only) for mentee + mentor header
  useEffect(() => {
    if (typeof window === "undefined" || !token) return;
    try {
      const raw = window.sessionStorage.getItem(`nav:${token}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setMentee(parsed?.menteeData ?? null);

      const profile = parsed?.path?.profile ?? {};
      const desc = parsed?.path?.description
      setCurrentMentor(prev => ({
        ...prev,
        name: profile?.name ?? prev.name,
        role: profile?.title ?? prev.role,
        meta: profile?.education ?? prev.meta,
        description: desc
      }));
    } catch {
      // ignore malformed session data
    }
  }, [token]);

  // fetch milestones once
  useEffect(() => {
    async function abc() {
      const ac = new AbortController();
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `http://localhost:8000/roadmap`, // e.g., http://localhost:8000/roadmap
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                mentee_background: `Mentee's name is ${mentee.name}. A little bit about the mentee: ${mentee.paragraph_text}. Mentee is a ${mentee.major} major.`,
                mentor_background: `Mentor's name is ${MENTOR.name}. The mentor is a ${MENTOR.role}. ${MENTOR.meta}. This person likes: ${MENTOR.description}`,
                count: 8,
              }),
              signal: ac.signal,
            }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
  
          const incoming: ApiMilestone[] = json?.milestones ?? [];
          // normalize icon to component
          const norm: Milestone[] = incoming.map((m) => ({
            ...m,
            icon: IconMap[m.icon] ?? Circle,
          }));
  
          setMilestones(norm);
          setActiveId(norm[0]?.id ?? "");
        } catch (e) {
          console.error("roadmap fetch failed", e);
        } finally {
          setLoading(false);
        }
      })();
      return () => ac.abort();
    }

    if (mentee.name && MENTOR.name) {
      abc()
    }
   
  }, [mentee, MENTOR]);

  // compute active safely
  const active = useMemo(
    () => milestones.find((m) => m.id === activeId) ?? milestones[0],
    [milestones, activeId]
  );

  const leverageOrder = useMemo(
    () => [...milestones].sort((a, b) => score(b.impact, b.effort) - score(a.impact, a.effort)),
    [milestones]
  );

  function toggleAction(mid: string, aid: string) {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id !== mid
          ? m
          : { ...m, actions: m.actions.map((a) => (a.id === aid ? { ...a, done: !a.done } : a)) }
      )
    );
  }

  // guard render
  if (loading || !milestones.length || !active) {
    return (
    <div className="min-h-[100vh] w-full bg-gradient-to-b from-gray-50 to-white">
      <Navigation />
      Loading...
      </div>
      )
  }

  const mentorFirst = (MENTOR.name || "Your mentor").split(" ")[0];

  return (
    <div className="min-h-[100vh] w-full bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900"
        >
          Your exact roadmap to become like{" "}
          <span className="bg-gradient-to-r from-sky-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            your mentor.
          </span>
        </motion.h1>
        <p className="mt-2 text-gray-600 max-w-3xl">
          See your path from <strong>{mentee?.name ?? "You"}</strong> to{" "}
          <strong>{MENTOR.name || "your mentor"}</strong>. Click each stop to reveal exactly what to do.
        </p>
      </div>

      {/* Mentee → Mentor strip */}
      <div className="mx-auto max-w-6xl px-4">
        <SectionCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-3">
              <img
                src="https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg"
                alt="Mentee"
                className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-md"
              />
              <div>
                <div className="font-semibold">{mentee?.name ?? "Mentee"}</div>
                <div className="text-xs text-gray-600">{mentee?.major ?? ""}</div>
              </div>
            </div>

            <div className="relative" />

            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <div className="font-semibold">{MENTOR.name || "Mentor"}</div>
                <div className="text-sm text-gray-600">{MENTOR.role}</div>
                <div className="text-xs text-gray-500">{MENTOR.meta}</div>
              </div>
              <img
                src="https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg"
                alt="Mentor"
                className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-md"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Subway-style Roadmap */}
      <div className="mx-auto max-w-6xl px-4 mt-8">
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Your Personalized Roadmap
            </div>
            <div className="text-xs text-gray-500">Click a stop to open its playbook</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] py-6">
              <div className="relative h-24">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 shadow-inner" />
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  {leverageOrder.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className="group flex flex-col items-center -mt-2 focus:outline-none"
                    >
                      <div
                        className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shadow-sm transition-all ${
                          activeId === m.id ? "border-fuchsia-500 bg-white scale-105" : "border-white/60 bg-white/90"
                        }`}
                      >
                        <m.icon className={`h-5 w-5 ${activeId === m.id ? "text-fuchsia-600" : "text-gray-500"}`} />
                      </div>
                      <div className="mt-4 text-xs font-medium text-gray-700 group-hover:text-gray-900 text-center w-28 truncate">
                        {m.title}
                      </div>
                      <div className={`mb-1 mt-1 text-[10px] px-2 py-0.5 rounded-full ring-1 ${chipColor(m.track)} whitespace-nowrap`}>
                        {m.track}
                      </div>
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
            <div className="text-xs text-gray-500">
              Leverage Score: <span className="font-semibold text-gray-700">{score(active.impact, active.effort)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl p-3 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">Why this matters</div>
              <div className="text-sm text-gray-600">{active.why}</div>
            </div>
            <div className="rounded-xl p-3 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">How {mentorFirst} got there</div>
              <div className="text-sm text-gray-600">{active.mentorDid}</div>
            </div>
            <div className="rounded-xl p-3 bg- gray-50">
              <div className="text-xs font-medium text-gray-700 mb-1">Where you are now</div>
              <div className="text-sm text-gray-600">{active.menteeNow}</div>
            </div>
          </div>

          <div className="mt-3 text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-xl p-3">
            <strong>Gap to close:</strong> {active.deltaNote}
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">Playbook — check off as you go</div>
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
                  {(a.done || false) ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-gray-300" />}
                </label>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Right column: Priorities & Schedule */}
        <div className="space-y-6">
          <SectionCard>
            <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-sky-600" /> Top Leverage Next
            </div>
            <ol className="space-y-2 list-decimal list-inside">
              {leverageOrder.slice(0, 4).map((m) => (
                <li key={m.id} className="text-sm text-gray-700 flex items-center justify-between">
                  <button onClick={() => setActiveId(m.id)} className="hover:underline text-left">{m.title}</button>
                  <span className="text-xs text-gray-500">
                    {m.etaWeeks}w • L={score(m.impact, m.effort)}
                  </span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard>
            <div className="font-semibold text-gray-800 mb-2">This Week’s Plan</div>
            <div className="text-sm text-gray-600">Focus on the highest-impact actions in the selected stop.</div>
            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800">
              <ul className="list-disc list-inside space-y-1">
                {active.actions.slice(0, 2).map((a) => (
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