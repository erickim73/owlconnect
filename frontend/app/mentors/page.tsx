"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Target,
  Sparkles,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  Star,
  Briefcase,
  GraduationCap,
  DollarSign,
  Clock,
} from "lucide-react"
import Navigation from "@/components/nav"
import { getMatchedMentors } from "../agents/page"

// ---------- Types that match your real mentor objects ----------
type EducationItem = {
  institution?: string
  degree?: string
  field?: string
  gpa?: string
  start?: string
  end?: string | null
  activities?: string[]
}

type ExperienceItem = {
  company?: string
  role?: string
  employment_type?: string
  start?: string
  end?: string | null
  location?: string
  highlights?: string[]
  skills?: string[]
}

type MentorDoc = {
  // common ids / misc
  id?: string
  avatar?: string

  // names/titles
  name?: string
  pronouns?: string
  title?: string                 // e.g. "CAD Application Engineer"
  current_role?: string          // e.g. "Engineering Solutions at Apple (CAD Application Engineer)"
  employer?: string
  location?: string
  major?: string

  // academics & experience
  education?: EducationItem[]
  experience_history?: ExperienceItem[]
  experience?: number | string   // sometimes number (years)
  experience_years?: number

  // text & lists
  about?: string
  certifications?: string[]
  skills?: string[]
  frameworks_tools?: string[]
  interests?: string[]
  mentorship_topics?: string[]
  availability?: string[]
  communication_style?: string
  goals?: string[]

  // alt naming you had in earlier schema (keep for compatibility)
  profile?: {
    name?: string
    skills?: string[]
    goals?: string[]
    experience?: number
    job_description?: string[]
    course_descriptions?: string[]
    career_interests?: string[]
    availability?: string[]
    communication_style?: string
    interests?: string[]
    mbti?: string
  }

  // other root fields you showed (kept optional)
  job_description?: string[]
  course_descriptions?: string[]
  career_interests?: string[]
  mbti?: string
}

const ICONS = [Briefcase, TrendingUp, Target] as const
const GRADIENTS = [
  { chip: "from-blue-500 to-cyan-500", bg: "from-blue-50 to-cyan-50", border: "border-blue-200" },
  { chip: "from-purple-500 to-pink-500", bg: "from-purple-50 to-pink-50", border: "border-purple-200" },
  { chip: "from-green-500 to-emerald-500", bg: "from-green-50 to-emerald-50", border: "border-green-200" },
] as const

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]
}

function firstNonEmpty(...vals: (string | undefined | null)[]): string | undefined {
  for (const v of vals) {
    if (v && v.trim().length > 0) return v
  }
  return undefined
}

// Build a nice one-liner for education from the first entry
function formatEducation(edus?: EducationItem[]): string {
  if (!edus || edus.length === 0) return "—"
  const e = edus[0]
  const parts = [
    e.degree,
    e.field ? `(${e.field})` : undefined,
    e.institution ? `• ${e.institution}` : undefined,
  ].filter(Boolean)
  return parts.join(" ")
}

// Merge skills preference: explicit skills → frameworks/tools → mentorship topics → fallback
function pullSkills(m: MentorDoc): string[] {
  const fromProfile = m.profile?.skills ?? []
  const fromRoot = m.skills ?? []
  const fromTools = m.frameworks_tools ?? []
  const fromTopics = m.mentorship_topics ?? []

  const merged = [...fromRoot, ...fromProfile, ...fromTools, ...fromTopics].filter(Boolean)
  if (merged.length) return Array.from(new Set(merged)).slice(0, 8)
  return ["Mentorship", "Career Planning", "Project Execution"]
}

// Convert a mentor document → the card shape your UI expects
function toCareerPath(m: MentorDoc, index: number) {
  const Icon = pick(ICONS, index)
  const g = pick(GRADIENTS, index)

  // Name
  const name =
    firstNonEmpty(m.profile?.name, m.name) ?? "Unknown Mentor"

  // Job/title line
  const jobFromProfileList = Array.isArray(m.profile?.job_description) ? m.profile?.job_description[0] : undefined
  const job =
    firstNonEmpty(
      jobFromProfileList,
      m.title,                       // e.g., "CAD Application Engineer"
      m.current_role                 // e.g., "Engineering Solutions at Apple (CAD Application Engineer)"
    ) ?? "Mentor"

  const companySuffix = m.employer ? ` at ${m.employer}` : ""

  // Experience years
  const years =
    typeof m.profile?.experience === "number"
      ? `${m.profile?.experience} years`
      : typeof m.experience_years === "number"
      ? `${m.experience_years} years`
      : typeof m.experience === "number"
      ? `${m.experience} years`
      : typeof m.experience === "string"
      ? m.experience
      : "—"

  // Education text
  const educationText =
    firstNonEmpty(m.profile?.course_descriptions?.[0]) ?? formatEducation(m.education)

  // Skills
  const skills = pullSkills(m)

  // Location
  const locationText = firstNonEmpty(m.location) ?? "Remote / Flexible"

  // Title/description on the colored card
  const cardTitle =
    firstNonEmpty(m.profile?.career_interests?.[0], m.career_interests?.[0]) ??
    "Mentorship Track"

  const cardDesc =
    firstNonEmpty(m.profile?.goals?.[0], m.goals?.[0], m.about) ??
    "Personalized guidance based on your interests and goals"

  // Silly but useful heuristic for a “match score”
  const matchScore = `${Math.min(99, 70 + (skills.length * 3) % 25)}% compatibility`

  return {
    id: m.id ?? index + 1,
    title: cardTitle,
    description: cardDesc,
    timeline: "—",
    salary: "—",
    location: locationText,
    experience: "—",
    skills,
    nextSteps: [
      "Book an intro chat",
      "Share your current goals",
      "Set a 30–60–90 plan together",
      "Schedule a monthly check-in",
    ],
    icon: Icon,
    gradient: g.chip,
    bgGradient: g.bg,
    borderColor: g.border,
    profile: {
      name,
      title: `${job}${companySuffix}`,
      avatar:
        m.avatar ||
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256&auto=format&fit=facearea&facepad=2.5&h=256",
      experience: years,
      education: educationText,
      match: matchScore,
    },
  }
}

const CareerExplorationPage = () => {
  const [mounted, setMounted] = useState(false)
  const [mentors, setMentors] = useState<MentorDoc[]>([])
  const [matchedMentors, setMatchedMentors] = useState<string[]>([])

  useEffect(() => setMounted(true), [])

  // 1) Load IDs of matched mentors
  useEffect(() => {
    getMatchedMentors().then((ids) => {
      setMatchedMentors(Array.from(new Set(ids || [])))
    })
  }, [])

  // 2) Fetch mentor docs in parallel
  useEffect(() => {
    async function fetchMentors() {
      if (!matchedMentors.length) return
      const results = await Promise.allSettled(
        matchedMentors.map(async (id) => {
          // IMPORTANT: use ?id=... to match FastAPI signature: get_mentor(id: str)
          const res = await fetch(`http://localhost:8000/get-mentor?mentor_id=${encodeURIComponent(id)}`)
          if (!res.ok) throw new Error(`Failed to fetch mentor ${id}: ${res.status}`)
          return (await res.json()) as MentorDoc
        }),
      )
      const ok = results
        .filter((r): r is PromiseFulfilledResult<MentorDoc> => r.status === "fulfilled")
        .map((r) => r.value)
      setMentors(ok)
      // console.debug(results.filter(r => r.status === "rejected"))
    }
    fetchMentors()
  }, [matchedMentors])

  // 3) Derive the cards from real mentor data; show first 3
  const careerPaths = useMemo(() => mentors.slice(0, 3).map(toCareerPath), [mentors])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Personalized Career Recommendations
            </div>
            <h1 className="text-5xl font-bold text-gray-900 text-balance">
              Your Personalized{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mentors</span>
            </h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
              Based on your goals and experience, here are mentors that could be a great fit for you.
            </p>
          </div>

          {/* Career Path Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {careerPaths.map((path, index) => {
              const IconComponent = path.icon
              return (
                <div
                  key={path.id}
                  className="space-y-4 h-full flex flex-col"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 h-52">
                    <CardContent className="p-4 py-3 h-full">
                      <div className="flex items-start space-x-4 h-full">
                        <div className="relative flex-shrink-0">
                          <img
                            src={path.profile.avatar || "/placeholder.svg"}
                            alt={path.profile.name}
                            className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-md"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-current" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col h-full">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{path.profile.name}</h3>
                            <p className="text-sm text-gray-600 mb-4 leading-tight line-clamp-2">{path.profile.title}</p>
                          </div>

                          <div className="space-y-3 mt-auto">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{path.profile.experience}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-600 leading-tight">{path.profile.education}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 flex flex-col justify-start pt-1">
                          <div className="text-lg font-bold text-green-600 whitespace-nowrap">
                            {path.profile.match.split(" ")[0]}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">Match Score</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`bg-gradient-to-br ${path.bgGradient} ${path.borderColor} border-2 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group cursor-pointer h-full flex flex-col flex-1`}
                  >
                    <CardHeader className="pb-6 flex-shrink-0">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-14 h-14 bg-gradient-to-r ${path.gradient} rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0`}
                        >
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-gray-900 text-xl font-bold mb-2 min-h-[3.5rem] flex items-start">
                            {path.title}
                          </CardTitle>
                          <CardDescription className="text-gray-600 text-sm leading-relaxed">
                            {path.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 flex-1 flex flex-col pb-6">
                      <div className="bg-white/60 rounded-2xl p-4 space-y-4 flex-shrink-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Career Overview</h4>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              <span className="text-sm text-gray-600">Top Locations</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 text-right">{path.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Essential Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {path.skills.map((skill: string, skillIndex: number) => (
                            <Badge
                              key={skillIndex}
                              variant="outline"
                              className="text-xs bg-white/70 border-gray-300 text-gray-700 hover:bg-white transition-colors px-3 py-1"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Action Plan</h4>
                        <div className="space-y-3">
                          {path.nextSteps.map((step: string, stepIndex: number) => (
                            <div key={stepIndex} className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 mt-0.5">
                                {stepIndex + 1}
                              </div>
                              <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>

          {careerPaths.length === 0 && (
            <div className="text-center text-gray-600">
              No mentors yet. Make sure <code>/get-mentor?id=…</code> returns data and CORS is allowed from your Next.js origin.
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default CareerExplorationPage
