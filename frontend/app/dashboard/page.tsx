"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ChevronRight, Star, TrendingUp, Sparkles, Target } from "lucide-react"
import Link from "next/link"
import Navigation from "../../components/nav"

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
      rating: 93,
      avatar: "/professional-woman-professor.png",
      interests: "Shared interest in ML for genomics",
    },
    {
      name: "Miguel Rodriguez",
      title: "Postdoc at Stanford",
      rating: 88,
      avatar: "/professional-man-researcher.png",
      interests: "Similar career path (Big Tech → Research)",
    },
    {
      name: "Jasmin Park",
      title: "Senior Product Manager",
      rating: 84,
      avatar: "/professional-woman-manager.png",
      interests: "Product design + ML",
    },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200 rounded-3xl p-8 border border-gray-200/50 group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-900/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-600 animate-pulse">OwlConnect</div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 animate-fade-in">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Jordan
                  </span>
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl animate-fade-in-delay">
                  AI agents negotiate mentor matches for you. Review, compare, and connect in minutes.
                </p>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-hover:text-gray-900" />
                    <Input
                      placeholder="Search mentors..."
                      className="pl-10 w-64 bg-gray-100/50 backdrop-blur-sm border-gray-300/50 text-gray-900 placeholder-gray-400 focus:border-gray-900/50 focus:bg-gray-100/80 transition-all duration-300 rounded-full"
                    />
                  </div>
                  <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/20">
                    <Sparkles className="w-4 h-4 mr-2" />
                    New Goal
                  </Button>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  className="border-gray-400 text-gray-900 hover:bg-gray-900 hover:text-white bg-transparent rounded-full px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run negotiation
                </Button>
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/20">
                  <Target className="w-4 h-4 mr-2" />
                  Browse mentors
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 rounded-3xl overflow-hidden group hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-500">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900 text-2xl font-bold mb-2">Top Mentor Matches</CardTitle>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {topMentors.map((mentor, index) => (
                      <Card
                        key={index}
                        className="bg-gradient-to-br from-gray-200 to-gray-100 border-gray-300/50 hover:border-gray-900/20 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-gray-100/50 rounded-2xl group cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="relative">
                              <img
                                src={mentor.avatar || "/placeholder.svg"}
                                alt={mentor.name}
                                className="w-12 h-12 rounded-full transition-all duration-300 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-gray-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{mentor.name}</div>
                              <div className="text-xs text-gray-600 truncate">{mentor.title}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-bold text-gray-900">{mentor.rating}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-400 text-gray-700 hover:bg-gray-900 hover:text-white text-xs bg-transparent rounded-full transition-all duration-300 hover:scale-105"
                            >
                              View profile
                            </Button>
                          </div>

                          <div className="text-xs text-gray-600 leading-relaxed">• {mentor.interests}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-xl font-bold">Profile Completion</CardTitle>
                  <p className="text-sm text-gray-600">Complete your profile to improve match quality</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        72%
                      </span>
                      <Link href="/onboarding">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 text-sm rounded-full px-4 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                          Continue
                        </Button>
                      </Link>
                    </div>

                    <div className="relative w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-gray-900 to-gray-700 h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                        style={{ width: "72%" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 group">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          Added intended major
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-orange-400">
                          <div className="w-1 h-1 bg-orange-500 rounded-full group-hover:bg-orange-400"></div>
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          Upload transcript
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 group">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-orange-400">
                          <div className="w-1 h-1 bg-orange-500 rounded-full group-hover:bg-orange-400"></div>
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          Add career interests
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
