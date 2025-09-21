"use client"

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, TrendingUp, Target, Star, ChevronDown, X } from "lucide-react";
import Navigation from "@/components/nav";

/**
 * Mentor → Track → Domain → Location → Level
 * Left→Right branching diagram that enumerates all possible career combinations
 * for a selected mentor. Mirrors your gradient, rounded, glassy card aesthetic.
 *
 * New in this revision:
 *  - Better page padding & responsive overflow handling
 *  - Collapsible mentor dropdown (click outside to close)
 *  - Click a Track pill to "pin"/filter the graph by that track (click again to clear)
 */
export default function MentorCareerBranchDiagram() {
  // ------- Demo Data (mirror your people & vibes) ---------------------------
  const mentors: Mentor[] = useMemo(
    () => [
      {
        id: "sarah",
        name: "Sarah Chen",
        title: "Senior Software Engineer @ Google",
        avatar:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=160&h=160&fit=crop&crop=face",
        years: "5 yrs",
        education: "CS, Stanford",
        tracks: [
          {
            id: "swe",
            name: "Software Engineering",
            icon: Briefcase,
            gradientStops: ["#2563eb", "#06b6d4"], // blue → cyan
            chip: "SWE",
            domains: [
              { id: "frontend", name: "Frontend" },
              { id: "backend", name: "Backend" },
              { id: "infra", name: "Infra" },
            ],
          },
          {
            id: "ds",
            name: "Data Science",
            icon: TrendingUp,
            gradientStops: ["#8b5cf6", "#ec4899"], // purple → pink
            chip: "DS",
            domains: [
              { id: "analytics", name: "Analytics" },
              { id: "ml", name: "ML Eng" },
              { id: "research", name: "Research" },
            ],
          },
          {
            id: "pm",
            name: "Product Management",
            icon: Target,
            gradientStops: ["#10b981", "#059669"], // green → emerald
            chip: "PM",
            domains: [
              { id: "core", name: "Core PM" },
              { id: "growth", name: "Growth" },
              { id: "platform", name: "Platform" },
            ],
          },
        ],
        locations: [
          { id: "sf", name: "San Francisco" },
          { id: "nyc", name: "New York" },
          { id: "remote", name: "Remote" },
        ],
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid" },
        ],
      },
      {
        id: "michael",
        name: "Michael Rodriguez",
        title: "Lead Data Scientist @ Netflix",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&h=160&fit=crop&crop=face",
        years: "6 yrs",
        education: "Stats PhD, MIT",
        tracks: [
          {
            id: "ds",
            name: "Data Science",
            icon: TrendingUp,
            gradientStops: ["#8b5cf6", "#ec4899"],
            chip: "DS",
            domains: [
              { id: "analytics", name: "Analytics" },
              { id: "ml", name: "ML Eng" },
              { id: "causal", name: "Causal Inference" },
            ],
          },
          {
            id: "swe",
            name: "Software Engineering",
            icon: Briefcase,
            gradientStops: ["#2563eb", "#06b6d4"],
            chip: "SWE",
            domains: [
              { id: "platform", name: "Platform" },
              { id: "data-eng", name: "Data Eng" },
              { id: "ml-platform", name: "ML Platform" },
            ],
          },
        ],
        locations: [
          { id: "la", name: "Los Angeles" },
          { id: "nyc", name: "New York" },
          { id: "remote", name: "Remote" },
        ],
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "senior", name: "Senior" },
        ],
      },
      {
        id: "jessica",
        name: "Jessica Park",
        title: "Senior PM @ Stripe",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop&crop=face",
        years: "4 yrs",
        education: "MBA, Wharton",
        tracks: [
          {
            id: "pm",
            name: "Product Management",
            icon: Target,
            gradientStops: ["#10b981", "#059669"],
            chip: "PM",
            domains: [
              { id: "core", name: "Core PM" },
              { id: "growth", name: "Growth" },
              { id: "platform", name: "Platform" },
            ],
          },
          {
            id: "swe",
            name: "Software Engineering",
            icon: Briefcase,
            gradientStops: ["#2563eb", "#06b6d4"],
            chip: "SWE",
            domains: [
              { id: "frontend", name: "Frontend" },
              { id: "backend", name: "Backend" },
            ],
          },
        ],
        locations: [
          { id: "sv", name: "Silicon Valley" },
          { id: "nyc", name: "New York" },
          { id: "remote", name: "Remote" },
        ],
        levels: [
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid" },
          { id: "senior", name: "Senior" },
        ],
      },
    ],
    []
  );

  const [selectedMentorId, setSelectedMentorId] = useState<string>(mentors[0].id);
  const mentor = mentors.find((m) => m.id === selectedMentorId)!;

  const trackNameById = useMemo(() => {
    const map: Record<string, string> = {};
    mentor.tracks.forEach((t) => (map[t.id] = t.name));
    return map;
  }, [mentor]);

  // ------- Layout & measurement --------------------------------------------
  const outerScrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [centers, setCenters] = useState<Record<string, Point>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterTrackId, setFilterTrackId] = useState<string | null>(null);

  // Columns (left→right): mentor, tracks, domains (scoped by track), locations, levels
  const columns = useMemo(() => buildColumns(mentor), [mentor]);
  const edges = useMemo(() => buildEdges(columns), [columns]);
  const comboCount = useMemo(() => countCombos(mentor), [mentor]);

  useLayoutEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const parentRect = containerRef.current.getBoundingClientRect();
      const next: Record<string, Point> = {};
      nodeRefs.current.forEach((el, id) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        next[id] = {
          x: r.left - parentRect.left + r.width / 2,
          y: r.top - parentRect.top + r.height / 2,
        };
      });
      setCenters(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    const onScroll = () => measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [columns]);

  // Utility: attach ref into our map
  const attachRef = (id: string) => (el: HTMLDivElement | null) => {
    nodeRefs.current.set(id, el);
  };

  const toggleTrackFilter = (trackId?: string) => {
    if (!trackId) return;
    setFilterTrackId((cur) => (cur === trackId ? null : trackId));
  };

  const isEdgeActive = (e: Edge) => {
    const hoveredActive =
      !hoveredId || e.fromId === hoveredId || e.toId === hoveredId ||
      e.trackId === hoveredId || e.columnFromId === hoveredId || e.columnToId === hoveredId;
    const filterActive = !filterTrackId || e.trackId === filterTrackId;
    return hoveredActive && filterActive;
  };

  const isNodeMuted = (node: ColumnNode) => {
    if (!filterTrackId) return false;
    // Mentor, location, level nodes are never muted; track & domain nodes only if mismatch
    if (node.col === 1 || node.col === 2) {
      return node.trackId && node.trackId !== filterTrackId;
    }
    return false;
  };

  // ------- Rendering --------------------------------------------------------
  return (
    <div className="relative w-full">
        <Navigation/>
      {/* Header / Controls */}
      
      <div className="mt-10 ml-20 mr-20 mb-4 md:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3 px-4 md:px-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Career Paths by Mentor</h2>
          <p className="text-gray-600">
            Complete combinations across Track → Domain → Location → Level. Hover or click a Track to filter.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MentorSelect
            mentors={mentors}
            value={selectedMentorId}
            onChange={(id) => {
              setSelectedMentorId(id);
              setFilterTrackId(null);
            }}
          />
          <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm border border-gray-200 whitespace-nowrap">
            {comboCount.toLocaleString()} combinations
          </div>
          {filterTrackId && (
            <button
              onClick={() => setFilterTrackId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-sm shadow hover:opacity-90"
              title="Clear track filter"
            >
              <X className="w-4 h-4" />
              {trackNameById[filterTrackId]}
            </button>
          )}
        </div>
      </div>

      {/* Scroll container with improved padding */}
      <div ref={outerScrollRef} className="relative overflow-x-auto overflow-y-visible">
        <div
          ref={containerRef}
          className="relative min-w-[1100px] px-4 md:px-10 pb-10 pt-2"
        >
          {/* SVG edges layer */}
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            <defs>
              {mentor.tracks.map((t) => (
                <linearGradient
                  key={`grad-${t.id}`}
                  id={`grad-${t.id}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={t.gradientStops[0]} />
                  <stop offset="100%" stopColor={t.gradientStops[1]} />
                </linearGradient>
              ))}
            </defs>

            {edges.map((e) => {
              const a = centers[e.fromId];
              const b = centers[e.toId];
              if (!a || !b) return null;
              const dx = Math.max(60, Math.abs(b.x - a.x) * 0.35);
              const d = `M ${a.x},${a.y} C ${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
              const active = isEdgeActive(e);
              return (
                <path
                  key={e.id}
                  d={d}
                  fill="none"
                  stroke={`url(#grad-${e.trackId})`}
                  strokeWidth={active ? 3 : 1.5}
                  opacity={active ? 0.9 : 0.15}
                />
              );
            })}
          </svg>

          {/* Columns */}
          <div className="ml-20 relative grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
            {/* Mentor column */}
            <div className="space-y-4">
              <SectionLabel>Mentor</SectionLabel>
              <div
                ref={attachRef(columns[0][0].id)}
                onMouseEnter={() => setHoveredId(columns[0][0].id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{mentor.name}</div>
                    <div className="text-sm text-gray-600">{mentor.title}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>{mentor.years}</span>
                      <span>•</span>
                      <span>{mentor.education}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Track column */}
            <div className="space-y-4">
              <SectionLabel>Track</SectionLabel>
              <div className="space-y-3">
                {columns[1].map((n) => (
                  <NodeCard
                    key={n.id}
                    id={n.id}
                    title={n.label}
                    chip={n.trackChip}
                    gradientStops={n.gradientStops}
                    Icon={n.icon}
                    onClick={() => toggleTrackFilter(n.trackId)}
                    muted={isNodeMuted(n)}
                    onHover={setHoveredId}
                    attachRef={attachRef}
                  />
                ))}
              </div>
            </div>

            {/* Domain column */}
            <div className="space-y-4">
              <SectionLabel>Domain</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {columns[2].map((n) => (
                  <NodePill
                    key={n.id}
                    id={n.id}
                    label={n.label}
                    trackId={n.trackId}
                    gradientStops={n.gradientStops}
                    muted={isNodeMuted(n)}
                    onHover={setHoveredId}
                    attachRef={attachRef}
                  />
                ))}
              </div>
            </div>

            {/* Location column */}
            <div className="space-y-4">
              <SectionLabel>Location</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {columns[3].map((n) => (
                  <NodePlain
                    key={n.id}
                    id={n.id}
                    label={n.label}
                    onHover={setHoveredId}
                    attachRef={attachRef}
                  />
                ))}
              </div>
            </div>

            {/* Level column */}
            <div className="space-y-4">
              <SectionLabel>Level</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {columns[4].map((n) => (
                  <NodePlain
                    key={n.id}
                    id={n.id}
                    label={n.label}
                    onHover={setHoveredId}
                    attachRef={attachRef}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// -------------------------- Types ------------------------------------------

type Point = { x: number; y: number };

type Mentor = {
  id: string;
  name: string;
  title: string;
  avatar: string;
  years: string;
  education: string;
  tracks: Track[];
  locations: SimpleOpt[];
  levels: SimpleOpt[];
};

type SimpleOpt = { id: string; name: string };

type Track = {
  id: string;
  name: string;
  icon: any; // lucide icon component
  gradientStops: [string, string];
  chip: string;
  domains: SimpleOpt[];
};

type ColumnNode = {
  id: string;
  label: string;
  col: number; // 0..4
  // Optional visuals
  gradientStops?: [string, string];
  icon?: any;
  trackId?: string;
  trackChip?: string;
};

type Edge = {
  id: string;
  fromId: string;
  toId: string;
  trackId: string; // used for stroke gradient
  columnFromId?: string; // for hover convenience
  columnToId?: string;
};

// -------------------------- Data → Columns/Edges ---------------------------

function buildColumns(mentor: Mentor): ColumnNode[][] {
  const mentorNode: ColumnNode = {
    id: `mentor:${mentor.id}`,
    label: mentor.name,
    col: 0,
  };

  const trackNodes: ColumnNode[] = mentor.tracks.map((t) => ({
    id: `track:${mentor.id}:${t.id}`,
    label: t.name,
    col: 1,
    gradientStops: t.gradientStops,
    icon: t.icon,
    trackId: t.id,
    trackChip: t.chip,
  }));

  // Domains are scoped to a track (so duplicates across tracks still render distinctly)
  const domainNodes: ColumnNode[] = mentor.tracks.flatMap((t) =>
    t.domains.map((d) => ({
      id: `domain:${mentor.id}:${t.id}:${d.id}`,
      label: d.name,
      col: 2,
      trackId: t.id,
      gradientStops: t.gradientStops,
    }))
  );

  const locationNodes: ColumnNode[] = mentor.locations.map((l) => ({
    id: `loc:${mentor.id}:${l.id}`,
    label: l.name,
    col: 3,
  }));

  const levelNodes: ColumnNode[] = mentor.levels.map((lv) => ({
    id: `lvl:${mentor.id}:${lv.id}`,
    label: lv.name,
    col: 4,
  }));

  return [[mentorNode], trackNodes, domainNodes, locationNodes, levelNodes];
}

function buildEdges(cols: ColumnNode[][]): Edge[] {
  const [mentorCol, trackCol, domainCol, locCol, levelCol] = cols;
  const edges: Edge[] = [];

  // mentor → track
  for (const t of trackCol) {
    edges.push({
      id: `e:${mentorCol[0].id}->${t.id}`,
      fromId: mentorCol[0].id,
      toId: t.id,
      trackId: (t.trackId as string)!,
      columnFromId: mentorCol[0].id,
      columnToId: t.id,
    });
  }

  // track → domain (respect track ownership)
  for (const d of domainCol) {
    const trackId = d.trackId!;
    const parentTrack = trackCol.find((t) => t.trackId === trackId)!;
    edges.push({
      id: `e:${parentTrack.id}->${d.id}`,
      fromId: parentTrack.id,
      toId: d.id,
      trackId,
      columnFromId: parentTrack.id,
      columnToId: d.id,
    });
  }

  // domain → location (complete; keep track color)
  for (const d of domainCol) {
    for (const l of locCol) {
      edges.push({
        id: `e:${d.id}->${l.id}`,
        fromId: d.id,
        toId: l.id,
        trackId: d.trackId!,
        columnFromId: d.id,
        columnToId: l.id,
      });
    }
  }

  // location → level (complete; inherit color from upstream domain via fiction)
  for (const d of domainCol) {
    for (const l of locCol) {
      for (const lv of levelCol) {
        edges.push({
          id: `e:${l.id}:${d.trackId}->${lv.id}:${d.id}`,
          fromId: l.id,
          toId: lv.id,
          trackId: d.trackId!,
          columnFromId: l.id,
          columnToId: lv.id,
        });
      }
    }
  }

  return edges;
}

function countCombos(mentor: Mentor): number {
  // Sum over tracks of (domains × locations × levels)
  const base = mentor.locations.length * mentor.levels.length;
  return mentor.tracks.reduce((acc, t) => acc + t.domains.length * base, 0);
}

// -------------------------- UI Bits ----------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold pl-1">
      {children}
    </div>
  );
}

function NodeCard({
  id,
  title,
  chip,
  gradientStops,
  Icon,
  attachRef,
  onHover,
  onClick,
  muted,
}: {
  id: string;
  title: string;
  chip?: string;
  gradientStops?: [string, string];
  Icon?: any;
  attachRef: (id: string) => (el: HTMLDivElement | null) => void;
  onHover: (id: string | null) => void;
  onClick?: () => void;
  muted?: boolean;
}) {
  return (
    <motion.div
      layout
      ref={attachRef(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
        muted ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(90deg, ${gradientStops?.[0]}, ${gradientStops?.[1]})`,
          }}
        >
          {Icon ? <Icon className="w-6 h-6 text-white" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{title}</div>
          {chip ? (
            <div className="text-[10px] mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-black/5 text-gray-700 border border-gray-200">
              {chip}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function NodePill({
  id,
  label,
  trackId,
  gradientStops,
  attachRef,
  onHover,
  muted,
}: {
  id: string;
  label: string;
  trackId?: string;
  gradientStops?: [string, string];
  attachRef: (id: string) => (el: HTMLDivElement | null) => void;
  onHover: (id: string | null) => void;
  muted?: boolean;
}) {
  return (
    <motion.div
      layout
      ref={attachRef(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/70 backdrop-blur shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-max ${
        muted ? "opacity-40" : ""
      }`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: `linear-gradient(90deg, ${gradientStops?.[0]}, ${gradientStops?.[1]})` }}
        title={trackId}
      />
      <span className="text-sm text-gray-800">{label}</span>
    </motion.div>
  );
}

function NodePlain({
  id,
  label,
  attachRef,
  onHover,
}: {
  id: string;
  label: string;
  attachRef: (id: string) => (el: HTMLDivElement | null) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <motion.div
      layout
      ref={attachRef(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-max"
    >
      <span className="text-sm text-gray-800">{label}</span>
    </motion.div>
  );
}

function MentorSelect({
  mentors,
  value,
  onChange,
}: {
  mentors: Mentor[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const m = mentors.find((mm) => mm.id === value)!;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full border border-gray-200 bg-white/80 backdrop-blur px-3 py-2 shadow-sm hover:shadow-md transition-all"
        title="Choose mentor"
      >
        <img src={m.avatar} className="w-7 h-7 rounded-full object-cover" alt={m.name} />
        <span className="text-sm text-gray-800 font-medium">{m.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur rounded-2xl border border-gray-200 shadow-xl p-2 z-10">
          {mentors.map((mm) => (
            <button
              key={mm.id}
              onClick={() => {
                onChange(mm.id);
                setOpen(false);
              }}
              className={`w-full text-left flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 ${
                mm.id === value ? "bg-gray-50" : ""
              }`}
            >
              <img src={mm.avatar} className="w-7 h-7 rounded-full object-cover" alt={mm.name} />
              <div>
                <div className="text-sm font-medium text-gray-900">{mm.name}</div>
                <div className="text-xs text-gray-500">{mm.title}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
