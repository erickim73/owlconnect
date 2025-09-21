"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, Sparkles, TrendingUp, Users, MapPin, Calendar, ArrowRight, Star, Briefcase, GraduationCap } from 'lucide-react'
import Navigation from '@/components/nav'

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
                "Network at tech meetups"
            ],
            icon: Briefcase,
            gradient: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-50 to-cyan-50",
            borderColor: "border-blue-200",
            profile: {
                name: "Sarah Chen",
                title: "Senior Software Engineer at Google",
                avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
                experience: "5 years",
                education: "CS, Stanford University",
                match: "92% compatibility"
            }
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
                "Learn business domain expertise"
            ],
            icon: TrendingUp,
            gradient: "from-purple-500 to-pink-500",
            bgGradient: "from-purple-50 to-pink-50",
            borderColor: "border-purple-200",
            profile: {
                name: "Michael Rodriguez",
                title: "Lead Data Scientist at Netflix",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                experience: "6 years",
                education: "Statistics PhD, MIT",
                match: "88% compatibility"
            }
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
                "Build case study portfolio"
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
                match: "85% compatibility"
            }
        }
    ]

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-white text-gray-900">
            <Navigation />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                <div className="space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold text-gray-900">
                            Your Potential{" "}
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Career Paths
                            </span>
                        </h1>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            Based on your goals and experience, here are three career trajectories that could be a great fit for you.
                        </p>
                    </div>

                    {/* Three Career Path Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {careerPaths.map((path, index) => {
                            const IconComponent = path.icon
                            return (
                                <div key={path.id} className="space-y-4" style={{ animationDelay: `${index * 200}ms` }}>
                                    {/* Profile Card */}
                                    <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-300 h-32">
                                        <CardContent className="p-6 h-full flex items-center">
                                            <div className="flex items-center space-x-4 w-full">
                                                <div className="relative">
                                                    <img
                                                        src={path.profile.avatar}
                                                        alt={path.profile.name}
                                                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                                                        <Star className="w-3 h-3 text-white fill-current" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900 truncate">{path.profile.name}</h3>
                                                    <p className="text-sm text-gray-600 truncate">{path.profile.title}</p>
                                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                        <span>{path.profile.experience}</span>
                                                        <span>•</span>
                                                        <span>{path.profile.education}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-green-600">{path.profile.match}</div>
                                                    <div className="text-xs text-gray-500">Match</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Career Path Card */}
                                    <Card
                                        className={`bg-gradient-to-br ${path.bgGradient} ${path.borderColor} border-2 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-500 hover:scale-105 group cursor-pointer`}
                                    >
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-12 h-12 bg-gradient-to-r ${path.gradient} rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                                                        <IconComponent className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-gray-900 text-lg font-bold">{path.title}</CardTitle>
                                                        <CardDescription className="text-gray-600 text-sm mt-1">{path.description}</CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-6">
                                            {/* Key Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-900">{path.timeline}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <TrendingUp className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-900">{path.salary}</span>
                                                </div>
                                                <div className="flex items-center space-x-2 col-span-2">
                                                    <MapPin className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm text-gray-600">{path.location}</span>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Skills</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {path.skills.map((skill, skillIndex) => (
                                                        <Badge
                                                            key={skillIndex}
                                                            variant="outline"
                                                            className="text-xs bg-white/50 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Next Steps */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Next Steps</h4>
                                                <ul className="space-y-2">
                                                    {path.nextSteps.map((step, stepIndex) => (
                                                        <li key={stepIndex} className="flex items-start space-x-2 text-sm text-gray-600">
                                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Action Button */}
                                            <Button
                                                variant="outline"
                                                className="w-full border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white bg-white/50 rounded-full transition-all duration-300 hover:scale-105 group"
                                            >
                                                Learn More
                                                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                            </Button>
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
                            className="border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white bg-white/50 rounded-full px-8 py-3 transition-all duration-300 hover:scale-105"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Explore More Paths
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default CareerExplorationPage