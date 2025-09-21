"use client"

import { useState, useEffect } from "react"
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

const CareerExplorationPage = () => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const careerPaths = [
        {
            id: 1,
            title: "Software Engineering Track",
            description: "Build scalable applications and systems",
            timeline: "2-3 years",
            salary: "$85k - $150k",
            location: "San Francisco, Seattle, Austin",
            experience: "Entry to Mid-level",
            skills: ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker"],
            nextSteps: [
                "Complete full-stack bootcamp",
                "Build 3-5 portfolio projects",
                "Apply to 50+ positions",
                "Network at tech meetups",
            ],
            icon: Briefcase,
            gradient: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-50 to-cyan-50",
            borderColor: "border-blue-200",
            profile: {
                name: "Sarah Chen",
                title: "Senior Software Engineer at Google",
                avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                experience: "5 years",
                education: "CS, Stanford University",
                match: "92% compatibility",
            },
        },
        {
            id: 2,
            title: "Data Science & Analytics",
            description: "Extract insights from complex datasets",
            timeline: "1-2 years",
            salary: "$75k - $130k",
            location: "New York, Boston, Chicago",
            experience: "Entry to Senior",
            skills: ["Python", "R", "SQL", "Machine Learning", "Tableau", "Statistics"],
            nextSteps: [
                "Complete data science certification",
                "Work on Kaggle competitions",
                "Build data visualization portfolio",
                "Learn business domain expertise",
            ],
            icon: TrendingUp,
            gradient: "from-purple-500 to-pink-500",
            bgGradient: "from-purple-50 to-pink-50",
            borderColor: "border-purple-200",
            profile: {
                name: "Michael Rodriguez",
                title: "Lead Data Scientist at Netflix",
                avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                experience: "6 years",
                education: "Statistics PhD, MIT",
                match: "88% compatibility",
            },
        },
        {
            id: 3,
            title: "Product Management",
            description: "Lead product strategy and development",
            timeline: "3-4 years",
            salary: "$90k - $160k",
            location: "Silicon Valley, New York, Remote",
            experience: "Mid to Senior",
            skills: ["Strategic Thinking", "User Research", "Agile", "Analytics", "Leadership", "Communication"],
            nextSteps: [
                "Gain domain expertise in current role",
                "Lead cross-functional projects",
                "Take product management courses",
                "Build case study portfolio",
            ],
            icon: Target,
            gradient: "from-green-500 to-emerald-500",
            bgGradient: "from-green-50 to-emerald-50",
            borderColor: "border-green-200",
            profile: {
                name: "Jessica Park",
                title: "Senior Product Manager at Stripe",
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
                experience: "4 years",
                education: "MBA, Wharton",
                match: "85% compatibility",
            },
        },
    ]

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navigation />
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="space-y-12">
                    {/* Header Section */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Personalized Career Recommendations
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 text-balance">
                            Your Personalized{" "}
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Mentors
                            </span>
                        </h1>
                        <p className="text-gray-600 text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
                            Based on your goals and experience, here are three mentors that could be a great fit for you.
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
                                                        <p className="text-sm text-gray-600 mb-4 leading-tight line-clamp-2">
                                                            {path.profile.title}
                                                        </p>
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
                                                            <DollarSign className="w-4 h-4 text-green-600" />
                                                            <span className="text-sm text-gray-600">Salary Range</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">{path.salary}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="w-4 h-4 text-blue-600" />
                                                            <span className="text-sm text-gray-600">Timeline</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">{path.timeline}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <MapPin className="w-4 h-4 text-purple-600" />
                                                            <span className="text-sm text-gray-600">Top Locations</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900 text-right">{path.location}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Skills Section */}
                                            <div className="flex-shrink-0">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Essential Skills</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {path.skills.map((skill, skillIndex) => (
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

                                            {/* Next Steps Section */}
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Action Plan</h4>
                                                <div className="space-y-3">
                                                    {path.nextSteps.map((step, stepIndex) => (
                                                        <div key={stepIndex} className="flex items-start space-x-3">
                                                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 mt-0.5">
                                                                {stepIndex + 1}
                                                            </div>
                                                            <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div>
                                                <Button
                                                    className={`w-full bg-gradient-to-r ${path.gradient} text-white border-0 rounded-2xl py-3 transition-all duration-300 hover:scale-105 group shadow-lg hover:shadow-xl`}
                                                >
                                                    Start Your Journey
                                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        })}
                    </div>

                    {/* Bottom Action */}
                    <div className="text-center pt-8">
                        <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white bg-white rounded-2xl px-8 py-4 transition-all duration-300 hover:scale-105 shadow-sm"
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            Explore More Career Paths
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default CareerExplorationPage