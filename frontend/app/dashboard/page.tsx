"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ChevronRight, Star, TrendingUp, Sparkles, Target, MessageCircle, Calendar, Award } from "lucide-react"
import Link from "next/link"
import Navigation from "@/components/nav"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const topMentors = [
    {
      name: "Dr. Alice Chen",
      title: "Professor of Computer Science",
      university: "Stanford University",
      rating: 93,
      avatar: "/professional-woman-professor.png",
      interests: "ML for genomics",
      expertise: ["Machine Learning", "Genomics", "Research"],
      matchScore: 98,
      responseTime: "< 2 hours",
      sessions: 127,
    },
    {
      name: "Miguel Rodriguez",
      title: "Postdoc Researcher",
      university: "Stanford University",
      rating: 88,
      avatar: "/professional-man-researcher.png",
      interests: "Big Tech → Research",
      expertise: ["Product Strategy", "Research", "Career Transition"],
      matchScore: 94,
      responseTime: "< 4 hours",
      sessions: 89,
    },
    {
      name: "Jasmin Park",
      title: "Senior Product Manager",
      university: "Google",
      rating: 84,
      avatar: "/professional-woman-manager.png",
      interests: "Product design + ML",
      expertise: ["Product Management", "ML Products", "Design"],
      matchScore: 91,
      responseTime: "< 6 hours",
      sessions: 156,
    },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      <Navigation />

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200 rounded-2xl p-6 border border-gray-200/50 group animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-900/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-600 animate-pulse">OwlConnect</div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 animate-slide-up">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Jordan
                  </span>
                </h1>
                <p className="text-gray-600 max-w-2xl animate-slide-up-delay">
                  AI agents negotiate mentor matches for you. Review, compare, and connect in minutes.
                </p>
              </div>

              <div className="flex space-x-3 animate-slide-left">
                <Button
                  variant="outline"
                  className="border-gray-400 text-gray-900 hover:bg-gray-900 hover:text-white bg-transparent rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run negotiation
                </Button>
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/20">
                  <Target className="w-4 h-4 mr-2" />
                  Browse mentors
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-4 animate-slide-up-delay-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-hover:text-gray-900" />
                <Input
                  placeholder="Search mentors..."
                  className="pl-10 w-64 bg-gray-100/50 backdrop-blur-sm border-gray-300/50 text-gray-900 placeholder-gray-400 focus:border-gray-900/50 focus:bg-gray-100/80 transition-all duration-300 rounded-full"
                />
              </div>
              <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/20">
                <Sparkles className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-fade-in-up">
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-500 h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 text-xl font-bold mb-1">Top Mentor Matches</CardTitle>
                    <p className="text-sm text-gray-600">Ranked by A2A negotiation consensus</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 rounded-full transition-all duration-300 hover:scale-105"
                  >
                    See all <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {topMentors.map((mentor, index) => (
                    <Card
                      key={index}
                      className="bg-gradient-to-br from-white to-gray-50 border-gray-300/50 hover:border-gray-900/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-100/50 rounded-xl group cursor-pointer animate-slide-in-right"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          <div className="relative mx-auto w-fit">
                            <img
                              src={mentor.avatar || "/placeholder.svg?height=48&width=48"}
                              alt={mentor.name}
                              className="w-12 h-12 rounded-full transition-all duration-300 group-hover:scale-110 border-2 border-gray-200 mx-auto"
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <h3 className="font-bold text-gray-900 text-sm">{mentor.name}</h3>
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs font-semibold text-gray-900">{mentor.rating}</span>
                            </div>
                            <p className="text-gray-600 font-medium text-xs mb-1">{mentor.title}</p>
                            <p className="text-gray-500 text-xs mb-2">{mentor.university}</p>

                            <div className="text-center mb-2">
                              <div className="text-lg font-bold text-green-600">{mentor.matchScore}%</div>
                              <div className="text-xs text-gray-500">match</div>
                            </div>

                            <div className="flex flex-wrap gap-1 justify-center mb-3">
                              {mentor.expertise.slice(0, 2).map((skill, skillIndex) => (
                                <span
                                  key={skillIndex}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>

                            <div className="space-y-1 text-xs text-gray-500 mb-3">
                              <div className="flex items-center justify-center space-x-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{mentor.responseTime}</span>
                              </div>
                              <div className="flex items-center justify-center space-x-1">
                                <Award className="w-3 h-3" />
                                <span>{mentor.sessions} sessions</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-gray-400 text-gray-700 hover:bg-gray-900 hover:text-white text-xs bg-transparent rounded-full transition-all duration-300 hover:scale-105"
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Schedule
                              </Button>
                              <Button
                                size="sm"
                                className="w-full bg-gray-900 text-white hover:bg-gray-800 text-xs rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                              >
                                <MessageCircle className="w-3 h-3 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-500 h-full animate-slide-in-left">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-900 text-lg font-bold">Profile Completion</CardTitle>
                <p className="text-xs text-gray-600">Complete your profile to improve match quality</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent animate-number-count">
                    100%
                  </span>
                  <Link href="/onboarding">
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 text-xs rounded-full px-3 py-1 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      Continue
                    </Button>
                  </Link>
                </div>

                <div className="relative w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-gray-900 to-gray-700 h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden animate-progress-fill"
                    style={{ width: "100%" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    className="flex items-center space-x-3 group animate-slide-in-right"
                    style={{ animationDelay: "200ms" }}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                      Added intended major
                    </span>
                  </div>
                  <div
                    className="flex items-center space-x-3 group animate-slide-in-right"
                    style={{ animationDelay: "300ms" }}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                      Uploaded transcript
                    </span>
                  </div>
                  <div
                    className="flex items-center space-x-3 group animate-slide-in-right"
                    style={{ animationDelay: "400ms" }}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                      Added career interests
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes slide-left {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                @keyframes slide-in-left {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes progress-fill {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                
                @keyframes number-count {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    100% { transform: translateX(200%) skewX(-12deg); }
                }
                
                .animate-fade-in { animation: fade-in 0.6s ease-out; }
                .animate-slide-up { animation: slide-up 0.8s ease-out 0.2s both; }
                .animate-slide-up-delay { animation: slide-up 0.8s ease-out 0.4s both; }
                .animate-slide-up-delay-2 { animation: slide-up 0.8s ease-out 0.6s both; }
                .animate-slide-left { animation: slide-left 0.8s ease-out 0.3s both; }
                .animate-slide-in-right { animation: slide-in-right 0.6s ease-out both; }
                .animate-slide-in-left { animation: slide-in-left 0.8s ease-out 0.5s both; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out 0.4s both; }
                .animate-progress-fill { animation: progress-fill 1.5s ease-out 1s both; }
                .animate-number-count { animation: number-count 0.8s ease-out 1.2s both; }
                .animate-shimmer { animation: shimmer 2s infinite; }
            `}</style>
    </div>
  )
}
