"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Target, Sparkles, TrendingUp, MapPin, Star, Briefcase, GraduationCap, Clock,
} from "lucide-react"
import Navigation from "@/components/nav"
import { getMatchedMentors } from "../agents/page"
import { useRouter } from "next/navigation";

// ---------- Types ----------
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
  id?: string
  avatar?: string
  name?: string
  pronouns?: string
  title?: string
  current_role?: string
  employer?: string
  location?: string
  major?: string
  education?: EducationItem[]
  experience_history?: ExperienceItem[]
  experience?: number | string
  experience_years?: number
  about?: string
  certifications?: string[]
  skills?: string[]
  frameworks_tools?: string[]
  interests?: string[]
  mentorship_topics?: string[]
  availability?: string[]
  communication_style?: string
  goals?: string[]
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
  job_description?: string[]
  course_descriptions?: string[]
  career_interests?: string[]
  mbti?: string
}

type RankedMentor = { id: string; rank: number }

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
  for (const v of vals) if (v && v.trim().length > 0) return v
  return undefined
}

function formatEducation(edus?: EducationItem[]): string {
  if (!edus || edus.length === 0) return "—"
  const e = edus[0]
  const parts = [e.degree, e.field ? `(${e.field})` : undefined, e.institution ? `• ${e.institution}` : undefined].filter(
    Boolean,
  )
  return parts.join(" ")
}

function pullSkills(m: MentorDoc): string[] {
  const fromProfile = m.profile?.skills ?? []
  const fromRoot = m.skills ?? []
  const fromTools = m.frameworks_tools ?? []
  const fromTopics = m.mentorship_topics ?? []
  const merged = [...fromRoot, ...fromProfile, ...fromTools, ...fromTopics].filter(Boolean)
  if (merged.length) return Array.from(new Set(merged)).slice(0, 8)
  return ["Mentorship", "Career Planning", "Project Execution"]
}

// Convert a mentor document → card shape, carrying the rank
function toCareerPath(m: MentorDoc, index: number, rank: number) {
  const Icon = pick(ICONS, index)
  const g = pick(GRADIENTS, index)

  const name = firstNonEmpty(m.profile?.name, m.name) ?? "Unknown Mentor"

  const jobFromProfileList = Array.isArray(m.profile?.job_description) ? m.profile?.job_description[0] : undefined
  const job =
    firstNonEmpty(jobFromProfileList, m.title, m.current_role) ?? "Mentor"

  const companySuffix = m.employer ? ` at ${m.employer}` : ""

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

  const educationText = firstNonEmpty(m.profile?.course_descriptions?.[0]) ?? formatEducation(m.education)
  const skills = pullSkills(m)
  const locationText = firstNonEmpty(m.location) ?? "Remote / Flexible"

  const cardTitle = firstNonEmpty(m.profile?.career_interests?.[0], m.career_interests?.[0]) ?? "Mentorship Track"
  const cardDesc =
    firstNonEmpty(m.profile?.goals?.[0], m.goals?.[0], m.about) ?? "Personalized guidance based on your interests and goals"

  return {
    id: m.id ?? index + 1,
    rank,
    title: cardTitle,
    description: cardDesc,
    timeline: "—",
    salary: "—",
    location: locationText,
    experience: "—",
    skills,
    nextSteps: ["Book an intro chat", "Share your current goals", "Set a 30–60–90 plan together", "Schedule a monthly check-in"],
    icon: Icon,
    gradient: g.chip,
    bgGradient: g.bg,
    borderColor: g.border,
    profile: {
      name,
      title: `${job}${companySuffix}`,
      avatar:
        m.avatar ||
        "https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg",
      experience: years,
      education: educationText,
    },
  }
}

const CareerExplorationPage = () => {
  const [mounted, setMounted] = useState(false)

  // list from API: [(id, rank), ...] where rank is 1,2,3,...
  const [rankedMentors, setRankedMentors] = useState<RankedMentor[]>([])
  const token = crypto.randomUUID();
  const router = useRouter();

  const [menteeData, setMenteeData] = useState<{name: string, major: string, paragraph_text: string}>({
    name: "",
    major: "",
    paragraph_text: ""
  })

  // list from API: [(id, score), ...]
  // const [matchedMentors, setMatchedMentors] = useState<MatchedMentor[]>([])

  // fetched mentor docs keyed by id
  const [mentorsById, setMentorsById] = useState<Record<string, MentorDoc>>({})

  useEffect(() => setMounted(true), [])

  // 1) Load matched mentors with ranks
  useEffect(() => {

    async function fetchUser() {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"}/users/newest`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",        // avoid any caching
          // credentials: "include", // uncomment if your API uses cookies
        }
      );
      const data = await res.json();
      
      console.log(data["paragraph_text"])

      setMenteeData({
        name: data["resume_data"]["contact"]["name"],
        major: data["transcript_data"]["majors"][0],
        paragraph_text: `${data["paragraph_text"]}`
      })
    }
    fetchUser()
    
  }, [])

  // 1) Load matched mentors with scores
  useEffect(() => {
    ;(async () => {
      const raw = (await getMatchedMentors()) as Array<[string, number]> | undefined
      if (!raw) return
      // Dedup by id, keep **best (lowest)** rank
      const byId = new Map<string, number>()
      for (const [id, rank] of raw) {
        const r = Number(rank)
        if (!Number.isFinite(r)) continue
        byId.set(id, Math.min(byId.get(id) ?? Infinity, r))
      }
      const unique = Array.from(byId, ([id, rank]) => ({ id, rank }))
      // Sort ASC by rank (1 is best)
      unique.sort((a, b) => a.rank - b.rank)
      setRankedMentors(unique)
    })()
  }, [])

  // 2) Fetch mentor docs (parallel, only missing ones)
  useEffect(() => {
    ;(async () => {
      const missing = rankedMentors.map(m => m.id).filter(id => !mentorsById[id])
      if (!missing.length) return
      const results = await Promise.allSettled(
        missing.map(async (id) => {
          const res = await fetch(`http://localhost:8000/get-mentor?mentor_id=${encodeURIComponent(id)}`)
          if (!res.ok) throw new Error(`Failed to fetch mentor ${id}: ${res.status}`)
          const doc = (await res.json()) as MentorDoc
          return { id, doc: { ...doc, id: doc.id ?? id } }
        }),
      )
      const next: Record<string, MentorDoc> = { ...mentorsById }
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value.id] = r.value.doc
      }
      setMentorsById(next)
    })()
  }, [rankedMentors])

  // 3) Build cards for top 3 and arrange in podium order: [2nd, 1st, 3rd]
  const podiumCards = useMemo(() => {
    const top3 = rankedMentors.slice(0, 3) // already ASC by rank
    if (top3.length === 0) return []
    // Build docs
    const cards = top3
      .map((m, idx) => {
        const doc = mentorsById[m.id]
        if (!doc) return null
        return toCareerPath(doc, idx, m.rank)
      })
      .filter(Boolean) as ReturnType<typeof toCareerPath>[]

    // Reorder to podium: want visual [2nd, 1st, 3rd] if we have all three
    if (cards.length === 3) {
      const first = cards.find(c => c.rank === 1)!
      const second = cards.find(c => c.rank === 2)!
      const third = cards.find(c => c.rank === 3)!
      return [second, first, third]
    }
    // If fewer than 3, just keep ASC by rank
    return cards.sort((a, b) => a.rank - b.rank)
  }, [rankedMentors, mentorsById])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Personalized Mentor Matches
            </div>
            <h1 className="text-5xl font-bold text-gray-900 text-balance">
              Top <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">3 Mentors</span>
            </h1>
            {/* <p className="text-gray-600 text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
              Ranked podium-style: <strong>1st</strong>, <strong>2nd</strong>, and <strong>3rd</strong>.
            </p> */}
          </div>

          {/* Podium grid: [2nd, 1st, 3rd] */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {podiumCards.map((path, index) => {
              const IconComponent = path.icon
              // Optional: slightly vary vertical position for podium feel
              const heightClass = path.rank === 1 ? "lg:-mt-6" : path.rank === 3 ? "lg:mt-6" : ""
              return (
                <div key={String(path.id)} className={`space-y-4 h-full flex flex-col ${heightClass}`} style={{ animationDelay: `${index * 200}ms` }}>
                  <Card 
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 h-52 relative"
                  onClick={() => {
                    console.log(path)

                    const r = {
                      path,
                      menteeData
                    }
                    console.log(r)

                    sessionStorage.setItem(`nav:${token}`, JSON.stringify(r));
                    router.push(`/outcomes?token=${token}`);

                  }}>
                    <CardContent className="p-4 py-3 h-full">
                      {/* Rank badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                          Rank #{path.rank}
                        </Badge>
                      </div>

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
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${path.bgGradient} ${path.borderColor} border-2 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group cursor-pointer h-full flex flex-col flex-1`}>
                    <CardHeader className="pb-6 flex-shrink-0">
                      <div className="flex items-start space-x-4">
                        <div className={`w-14 h-14 bg-gradient-to-r ${path.gradient} rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0`}>
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
                              <MapPin className="w-4 h-4" />
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
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CareerExplorationPage
