"use client"

import { useState } from "react"
import {
  GraduationCap,
  FlaskConical,
  Briefcase,
  MapPin,
  Building,
  Star,
  Award,
  Calendar,
  User,
  Sparkles,
} from "lucide-react"
import Navigation from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const mentors = [
  {
    id: "sarah",
    name: "Sarah Chen",
    title: "Senior Software Engineer @ Google",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=160&h=160&fit=crop&crop=face",
    years: "5 years",
    education: "CS, Stanford",
    currentRole: "Senior SWE",
    colorScheme: {
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    },
    academics: {
      degree: "Computer Science",
      university: "Stanford University",
      gpa: "3.8/4.0",
      graduationYear: "2019",
      relevantCourses: [
        "Data Structures & Algorithms",
        "Machine Learning",
        "Database Systems",
        "Software Engineering",
        "Computer Networks",
      ],
    },
    research: {
      lab: "Stanford AI Lab",
      topic: "Natural Language Processing",
      duration: "2 years",
      publications: 3,
      description: "Focused on transformer architectures for multilingual text understanding",
    },
    internships: [
      {
        company: "Google",
        role: "Software Engineering Intern",
        duration: "Summer 2018",
        location: "Mountain View, CA",
        team: "Search Infrastructure",
      },
      {
        company: "Facebook",
        role: "Software Engineering Intern",
        duration: "Summer 2017",
        location: "Menlo Park, CA",
        team: "News Feed",
      },
    ],
  },
  {
    id: "michael",
    name: "Michael Rodriguez",
    title: "Lead Data Scientist @ Netflix",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&h=160&fit=crop&crop=face",
    years: "6 years",
    education: "Stats PhD, MIT",
    currentRole: "Lead Data Scientist",
    colorScheme: {
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      textColor: "text-purple-600",
      badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    },
    academics: {
      degree: "Statistics PhD",
      university: "MIT",
      gpa: "3.9/4.0",
      graduationYear: "2018",
      relevantCourses: [
        "Statistical Learning Theory",
        "Bayesian Methods",
        "Causal Inference",
        "Time Series Analysis",
        "Optimization Theory",
      ],
    },
    research: {
      lab: "MIT CSAIL",
      topic: "Causal Machine Learning",
      duration: "4 years",
      publications: 8,
      description: "Developed novel methods for causal discovery in high-dimensional data",
    },
    internships: [
      {
        company: "Netflix",
        role: "Data Science Intern",
        duration: "Summer 2017",
        location: "Los Gatos, CA",
        team: "Recommendation Systems",
      },
      {
        company: "Uber",
        role: "Data Science Intern",
        duration: "Summer 2016",
        location: "San Francisco, CA",
        team: "Marketplace Analytics",
      },
    ],
  },
  {
    id: "jessica",
    name: "Jessica Park",
    title: "Senior PM @ Stripe",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop&crop=face",
    years: "4 years",
    education: "MBA, Wharton",
    currentRole: "Senior Product Manager",
    colorScheme: {
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      borderColor: "border-green-200",
      textColor: "text-green-600",
      badgeColor: "bg-green-100 text-green-700 border-green-200",
    },
    academics: {
      degree: "MBA",
      university: "Wharton School",
      gpa: "3.7/4.0",
      graduationYear: "2020",
      relevantCourses: [
        "Product Strategy",
        "Data Analytics",
        "Operations Management",
        "Marketing Strategy",
        "Entrepreneurship",
      ],
    },
    research: {
      lab: "Wharton Customer Analytics",
      topic: "Consumer Behavior in Fintech",
      duration: "1.5 years",
      publications: 2,
      description: "Studied adoption patterns of digital payment solutions across demographics",
    },
    internships: [
      {
        company: "Stripe",
        role: "Product Management Intern",
        duration: "Summer 2019",
        location: "San Francisco, CA",
        team: "Growth",
      },
      {
        company: "Square",
        role: "Strategy & Operations Intern",
        duration: "Summer 2018",
        location: "San Francisco, CA",
        team: "Seller Experience",
      },
    ],
  },
]

const menteeProfile = {
  name: "You",
  title: "Aspiring Tech Professional",
  avatar: "/professional-student-avatar.jpg",
  academics: {
    degree: "Computer Science (In Progress)",
    university: "Your University",
    gpa: "3.6/4.0",
    currentYear: "Junior",
    completedCourses: ["Introduction to Programming", "Data Structures", "Algorithms", "Database Fundamentals"],
    plannedCourses: ["Machine Learning", "Software Engineering", "Computer Networks"],
  },
  research: {
    status: "Looking for opportunities",
    interests: ["AI/ML", "Web Development", "Data Science"],
    experience: "None yet",
  },
  internships: {
    status: "Seeking first internship",
    targetCompanies: ["Google", "Microsoft", "Meta", "Netflix"],
    preferredRoles: ["Software Engineering", "Data Science"],
  },
}

export default function CareerPathsPage() {
  const [selectedMentor, setSelectedMentor] = useState(mentors[0])
  const [activeSection, setActiveSection] = useState<"academics" | "research" | "internships">("academics")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />

      <div className="border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Career Path Comparison
            </div>
            <h1 className="text-5xl font-bold text-gray-900 text-balance">
              Compare Your Journey with{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Successful Mentors
              </span>
            </h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
              See exactly how your academic path, research interests, and internship goals align with mentors who&apos;ve
              achieved success in your target field.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Select a Mentor to Compare</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Card
                key={mentor.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] bg-white border-2 rounded-2xl ${
                  selectedMentor.id === mentor.id
                    ? `${mentor.colorScheme.borderColor} bg-gradient-to-br ${mentor.colorScheme.bgGradient} shadow-lg`
                    : "border-gray-200 hover:border-blue-200"
                }`}
                onClick={() => setSelectedMentor(mentor)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={mentor.avatar || "/placeholder.svg"}
                        alt={mentor.name}
                        className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-md"
                      />
                      {selectedMentor.id === mentor.id && (
                        <div
                          className={`absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r ${mentor.colorScheme.gradient} rounded-full flex items-center justify-center`}
                        >
                          <Star className="w-3 h-3 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{mentor.name}</h3>
                      <p className="text-sm text-gray-600 leading-tight">{mentor.title}</p>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                        <span>{mentor.years}</span>
                        <span>•</span>
                        <span>{mentor.education}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-2 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "academics",
                  label: "Academic Journey",
                  icon: GraduationCap,
                  gradient: "from-blue-500 to-blue-600",
                },
                {
                  key: "research",
                  label: "Research Experience",
                  icon: FlaskConical,
                  gradient: "from-purple-500 to-purple-600",
                },
                {
                  key: "internships",
                  label: "Internships",
                  icon: Briefcase,
                  gradient: "from-green-500 to-green-600",
                },
              ].map(({ key, label, icon: Icon, gradient }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as any)}
                  className={`flex items-center justify-center space-x-2 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeSection === key
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Academic Journey Comparison */}
          {activeSection === "academics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mentee Section (Left) */}
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">Your Academic Journey</span>
                      <p className="text-sm text-gray-600 font-normal">Current Progress</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gray-50/70 rounded-2xl p-4 space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Your Education Details</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Degree:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.academics.degree}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">University:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.academics.university}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current GPA:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.academics.gpa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Year:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.academics.currentYear}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Courses Completed</h4>
                      <div className="space-y-2">
                        {menteeProfile.academics.completedCourses.map((course, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Planned Courses</h4>
                      <div className="space-y-2">
                        {menteeProfile.academics.plannedCourses.map((course, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm text-gray-600">{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`bg-white/80 backdrop-blur-sm border-2 ${selectedMentor.colorScheme.borderColor} rounded-3xl`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${selectedMentor.colorScheme.gradient} rounded-xl flex items-center justify-center`}
                    >
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">{selectedMentor.name}&apos;s Journey</span>
                      <p className="text-sm text-gray-600 font-normal">Completed Path</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className={`bg-gradient-to-br ${selectedMentor.colorScheme.bgGradient} rounded-2xl p-4 space-y-4`}
                  >
                    <h4 className="font-semibold text-gray-900 mb-3">Education Details</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Degree:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.academics.degree}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">University:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.academics.university}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Final GPA:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.academics.gpa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Graduated:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.academics.graduationYear}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Key Courses Taken</h4>
                      <div className="space-y-2">
                        {selectedMentor.academics.relevantCourses.map((course, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 bg-gradient-to-r ${selectedMentor.colorScheme.gradient} rounded-full`}
                            ></div>
                            <span className="text-sm text-gray-700">{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Research Experience Comparison */}
          {activeSection === "research" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mentee Research Section */}
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">Your Research Goals</span>
                      <p className="text-sm text-gray-600 font-normal">Current Status</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gray-50/70 rounded-2xl p-4 space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Research Status</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Status:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.research.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Experience:</span>
                        <span className="font-medium text-gray-900">{menteeProfile.research.experience}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Research Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {menteeProfile.research.interests.map((interest, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-white/70 border-gray-300 text-gray-700 px-3 py-1"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`bg-white/80 backdrop-blur-sm border-2 ${selectedMentor.colorScheme.borderColor} rounded-3xl`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${selectedMentor.colorScheme.gradient} rounded-xl flex items-center justify-center`}
                    >
                      <FlaskConical className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">{selectedMentor.name}&apos;s Research</span>
                      <p className="text-sm text-gray-600 font-normal">Completed Experience</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className={`bg-gradient-to-br ${selectedMentor.colorScheme.bgGradient} rounded-2xl p-4 space-y-4`}
                  >
                    <h4 className="font-semibold text-gray-900 mb-3">Research Details</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lab:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.research.lab}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Focus Area:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.research.topic}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.research.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Publications:</span>
                        <span className="font-medium text-gray-900">{selectedMentor.research.publications}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Research Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed bg-white/50 rounded-xl p-3">
                      {selectedMentor.research.description}
                    </p>
                    <div className={`mt-4 flex items-center space-x-2 text-sm ${selectedMentor.colorScheme.textColor}`}>
                      <Award className="w-4 h-4" />
                      <span>{selectedMentor.research.publications} peer-reviewed publications</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Internships Comparison */}
          {activeSection === "internships" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mentee Internship Goals */}
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">Your Internship Goals</span>
                      <p className="text-sm text-gray-600 font-normal">Target Companies & Roles</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gray-50/70 rounded-2xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Current Status</h4>
                    <p className="text-sm text-gray-700">{menteeProfile.internships.status}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Target Companies</h4>
                    <div className="flex flex-wrap gap-2">
                      {menteeProfile.internships.targetCompanies.map((company, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-white/70 border-gray-300 text-gray-700 px-3 py-1"
                        >
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Preferred Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {menteeProfile.internships.preferredRoles.map((role, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-white/70 border-green-300 text-green-700 px-3 py-1"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`bg-white/80 backdrop-blur-sm border-2 ${selectedMentor.colorScheme.borderColor} rounded-3xl`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${selectedMentor.colorScheme.gradient} rounded-xl flex items-center justify-center`}
                    >
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-gray-900">{selectedMentor.name}&apos;s Internships</span>
                      <p className="text-sm text-gray-600 font-normal">Completed Experience</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedMentor.internships.map((internship, index) => (
                      <div
                        key={index}
                        className={`bg-gradient-to-br ${selectedMentor.colorScheme.bgGradient} rounded-2xl p-4`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{internship.role}</h4>
                            <p className={`font-medium ${selectedMentor.colorScheme.textColor}`}>
                              {internship.company}
                            </p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{internship.duration}</span>
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{internship.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Building className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Team:</span>
                          <span className="font-medium text-gray-900">{internship.team}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl overflow-hidden">
            <CardContent className="p-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Follow Their Path?</h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
                Connect with {selectedMentor.name} to get personalized guidance on academics, research opportunities,
                and internship strategies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className={`bg-gradient-to-r ${selectedMentor.colorScheme.gradient} hover:opacity-90 text-white border-0 rounded-2xl px-8 py-4 transition-all duration-300 hover:scale-105 shadow-lg`}
                >
                  Connect with {selectedMentor.name}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white bg-white rounded-2xl px-8 py-4 transition-all duration-300 hover:scale-105"
                >
                  Explore All Mentors
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
