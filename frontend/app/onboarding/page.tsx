"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { GraduationCap, Users, ChevronRight, ChevronLeft, Sparkles, Clock, Upload, Loader2 } from "lucide-react"

interface OnboardingData {
  role: "mentee" | "mentor" | null
  major: string
  careerInterests: string[]
  goals: string
  expertise: string[]
  availability: string
  experience: string
  resume: File | null
  transcript: File | null
  hobbies: string
  mbti: string
  careerGoals: string
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // Added submission state
  const [submitError, setSubmitError] = useState<string | null>(null) // Added error state
  const [data, setData] = useState<OnboardingData>({
    role: null,
    major: "",
    careerInterests: [],
    goals: "",
    expertise: [],
    availability: "",
    experience: "",
    resume: null,
    transcript: null,
    hobbies: "",
    mbti: "",
    careerGoals: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const totalSteps = 3
  const progress = ((currentStep + 1) / totalSteps) * 100

  const majors = [
    "Computer Science",
    "Engineering",
    "Business",
    "Biology",
    "Chemistry",
    "Physics",
    "Mathematics",
    "Psychology",
    "Economics",
    "Political Science",
  ]

  const careerAreas = [
    "Software Engineering",
    "Data Science",
    "Product Management",
    "Research",
    "Consulting",
    "Finance",
    "Healthcare",
    "Academia",
    "Entrepreneurship",
    "Design",
  ]

  const expertiseAreas = [
    "Machine Learning",
    "Web Development",
    "Data Analysis",
    "Research Methods",
    "Product Strategy",
    "Leadership",
    "Technical Writing",
    "Public Speaking",
  ]

  const handleNext = () => {
    // Always proceed to next step immediately
    if (currentStep < totalSteps - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentStep(prevStep => prevStep + 1)
        setIsTransitioning(false)
      }, 200)
    }
    
    // If we're on the file upload step and have files to upload, start upload in background
    if (currentStep === 1 && data.role === 'mentee' && data.resume && data.transcript) {
      const uploadFiles = async () => {
        try {
          const formData = new FormData()
          formData.append('resume_file', data.resume!)
          formData.append('transcript_file', data.transcript!)

          // Add a timeout to the fetch request
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

          try {
            const response = await fetch('http://localhost:8000/onboard-files', {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            })
            clearTimeout(timeoutId)

            if (!response.ok) {
              const errorText = await response.text()
              console.error('Background file upload failed:', errorText)
            }
          } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn('File upload timed out. Continuing without upload.')
            } else {
              console.error('Network error during file upload:', error)
            }
          }
        } catch (error) {
          console.error('Error preparing file upload:', error)
        }
      }
      
      // Start the upload in the background without blocking the UI
      uploadFiles().catch(error => {
        console.error('Unexpected error in file upload:', error)
      })
    }
  }

  const handleRoleSelection = (role: "mentee" | "mentor") => {
    setData((prev) => ({ ...prev, role }))
    // Auto-advance to next step after role selection
    setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentStep(1)
        setIsTransitioning(false)
      }, 200)
    }, 500)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setIsTransitioning(false)
      }, 200)
    }
  }

  // Handle the final form submission with text data
  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (data.role === "mentee") {
        // Create paragraph text from all the profile data
        const paragraphText = `
          Hobbies and Interests: ${data.hobbies}
          
          Personality and MBTI: ${data.mbti}
          
          Career Goals and Aspirations: ${data.careerGoals}
        `.trim()

        // Send the text data to the backend
        const response = await fetch('http://localhost:8000/onboard-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            paragraph_text: paragraphText
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { detail: errorText || `HTTP ${response.status}` }
          }
          throw new Error(errorData.detail || 'Text submission failed')
        }

        const result = await response.json()
        console.log("Text submission completed:", result)

        // Open WebSocket connection before redirecting
        // Generate a unique session ID for this user
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Store session ID in localStorage for the agents page to use
        localStorage.setItem('negotiation_session_id', sessionId)
        localStorage.setItem('should_auto_connect', 'true')

        // Redirect to dashboard after successful submission
        window.location.href = "/agentslive"
      } else {
        // For mentors, you would implement mentor-specific submission logic
        console.log("Mentor onboarding completed:", data)
        alert("Mentor onboarding completed!")
      }
    } catch (error) {
      console.error("Onboarding error:", error)
      setSubmitError(error instanceof Error ? error.message : "Submission failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSelection = (item: string, field: "careerInterests" | "expertise") => {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item) ? prev[field].filter((i) => i !== item) : [...prev[field], item],
    }))
  }

  // Added file upload handler with validation
  const handleFileUpload = (file: File | null, fileType: "resume" | "transcript") => {
    if (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        alert("Please upload a PDF file")
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB")
        return
      }
    }

    setData((prev) => ({ ...prev, [fileType]: file }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center animate-scale-in">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-black mb-3">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-black to-neutral-600 bg-clip-text text-transparent">
                  OwlConnect
                </span>
              </h2>
              <p className="text-neutral-600 text-base max-w-xl mx-auto">
                AI agents will negotiate the perfect mentor matches for you. Let&apos;s get started by understanding your
                role.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
              <Card
                className={`cursor-pointer transition-all duration-500 hover:scale-105 border-2 animate-slide-in-left ${
                  data.role === "mentee"
                    ? "border-black bg-black/10 shadow-lg shadow-black/20 animate-pulse-glow"
                    : "border-neutral-300 bg-neutral-50 hover:border-black/50"
                }`}
                onClick={() => handleRoleSelection("mentee")}
              >
                <CardContent className="p-7 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 hover:scale-110">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">I&apos;m a Mentee</h3>
                  <p className="text-neutral-600 text-sm">
                    Looking for guidance and mentorship to advance my career and academic goals
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-500 hover:scale-105 border-2 animate-slide-in-right ${
                  data.role === "mentor"
                    ? "border-black bg-black/10 shadow-lg shadow-black/20 animate-pulse-glow"
                    : "border-neutral-300 bg-neutral-50 hover:border-black/50"
                }`}
                onClick={() => handleRoleSelection("mentor")}
              >
                <CardContent className="p-7 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 hover:scale-110">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">I&apos;m a Mentor</h3>
                  <p className="text-neutral-600 text-sm">
                    Ready to share my expertise and guide the next generation of students
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 1:
        if (data.role === "mentee") {
          return (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-black">Upload Documents</h2>
                <p className="text-neutral-600 text-md">Please upload your resume and transcript</p>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-black font-medium mb-1 text-md">Resume (PDF)</label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-2 text-center hover:border-black/50 transition-all duration-300">
                    <Upload className="w-4 h-4 text-neutral-600 mx-auto mb-1" />
                    <p className="text-neutral-600 text-sm mb-1">Click to upload or drag and drop</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, "resume")}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="inline-block bg-neutral-200 text-black px-2 py-1 text-xs rounded-lg cursor-pointer hover:bg-neutral-300 transition-colors"
                    >
                      Choose File
                    </label>
                    {data.resume && <p className="text-green-600 text-xs mt-1">✓ {data.resume.name}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-black font-medium mb-1 text-md">Transcript (PDF)</label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-2 text-center hover:border-black/50 transition-all duration-300">
                    <Upload className="w-4 h-4 text-neutral-600 mx-auto mb-1" />
                    <p className="text-neutral-600 text-sm mb-1">Click to upload or drag and drop</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, "transcript")}
                      className="hidden"
                      id="transcript-upload"
                    />
                    <label
                      htmlFor="transcript-upload"
                      className="inline-block bg-neutral-200 text-black px-2 py-1 text-xs rounded-lg cursor-pointer hover:bg-neutral-300 transition-colors"
                    >
                      Choose File
                    </label>
                    {data.transcript && <p className="text-green-600 text-xs mt-1">✓ {data.transcript.name}</p>}
                  </div>
                </div>
              </div>
            </div>
          )
        } else {
          return (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-black">Your Expertise</h2>
                <p className="text-neutral-600 text-sm">Select the areas where you can provide guidance</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-black font-medium mb-2 text-sm">Select your expertise areas</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {expertiseAreas.map((area, index) => (
                      <button
                        key={area}
                        onClick={() => toggleSelection(area, "expertise")}
                        className={`p-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 animate-fade-in ${
                          data.expertise.includes(area)
                            ? "bg-black text-white shadow-lg shadow-black/20"
                            : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 hover:text-black"
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }

      case 2:
        if (data.role === "mentee") {
          return (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-black">Tell Us About Yourself</h2>
                <p className="text-neutral-600 text-sm">Help us understand your personality and interests</p>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-black font-medium mb-1 text-sm">Hobbies & Interests</label>
                  <Textarea
                    placeholder="What do you enjoy doing in your free time? (e.g., reading, gaming, sports, music, cooking...)"
                    value={data.hobbies}
                    onChange={(e) => setData((prev) => ({ ...prev, hobbies: e.target.value }))}
                    className="bg-neutral-50 border-neutral-300 text-black placeholder-neutral-500 focus:border-black/50 rounded-lg min-h-[50px] transition-all duration-300 focus:scale-[1.02] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1 text-sm">Personality (MBTI)</label>
                  <Textarea
                    placeholder="What's your MBTI type (e.g., INTJ) and how do you like to work? Describe your working style and personality."
                    value={data.mbti}
                    onChange={(e) => setData((prev) => ({ ...prev, mbti: e.target.value }))}
                    className="bg-neutral-50 border-neutral-300 text-black placeholder-neutral-500 focus:border-black/50 rounded-lg min-h-[50px] transition-all duration-300 focus:scale-[1.02] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1 text-sm">Career Goals</label>
                  <Textarea
                    placeholder="What are your career aspirations? What industry do you want to work in? What type of role are you targeting?"
                    value={data.careerGoals}
                    onChange={(e) => setData((prev) => ({ ...prev, careerGoals: e.target.value }))}
                    className="bg-neutral-50 border-neutral-300 text-black placeholder-neutral-500 focus:border-black/50 rounded-lg min-h-[50px] transition-all duration-300 focus:scale-[1.02] text-sm"
                  />
                </div>
              </div>

              {/* Added error display */}
              {submitError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mt-4">
                  <p className="text-red-600 text-sm">{submitError}</p>
                </div>
              )}
            </div>
          )
        } else {
          return (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-black">Your Availability</h2>
                <p className="text-neutral-600 text-sm">Let us know how much time you can commit</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-black font-medium mb-2 text-sm">Weekly availability</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { time: "1-2 hours", desc: "Light mentoring" },
                      { time: "3-5 hours", desc: "Regular guidance" },
                      { time: "5+ hours", desc: "Deep involvement" },
                    ].map(({ time, desc }, index) => (
                      <button
                        key={time}
                        onClick={() => setData((prev) => ({ ...prev, availability: time }))}
                        className={`p-3 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 animate-scale-in ${
                          data.availability === time
                            ? "bg-black text-white shadow-lg shadow-black/20"
                            : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 hover:text-black"
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold">{time}</span>
                          <span className="text-xs opacity-75">{desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }

      default:
        return null
    }
  }

  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return data.role !== null
      case 1:
        return data.role === "mentee" ? data.resume !== null && data.transcript !== null : data.expertise.length > 0
      case 2:
        return data.role === "mentee"
          ? data.hobbies.trim() !== "" && data.mbti.trim() !== "" && data.careerGoals.trim() !== ""
          : data.availability !== ""
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center group">
              <div className="w-8 h-8 bg-gradient-to-br from-black to-neutral-700 rounded-full flex items-center justify-center mr-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-black to-neutral-600 bg-clip-text text-transparent">
                OwlConnect
              </span>
            </div>

            {/* Progress */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-neutral-600">
                Step {currentStep + 1} of {totalSteps}
              </div>
              <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-black to-neutral-700 transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4">
        <div className="h-[calc(100vh-100px)] flex items-center justify-center">
          <Card className="w-full max-w-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-200/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-neutral-300/50">
            <CardContent className="px-8 py-3 md:px-12 md:py-4 max-h-[calc(100vh-200px)] overflow-hidden">
              <div className={`transition-opacity duration-200 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
                {renderStep()}
              </div>

              {/* Navigation */}
              {currentStep > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 0 || isSubmitting}
                    className="text-neutral-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-6 transition-all duration-300 hover:scale-105"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>

                  {currentStep === totalSteps - 1 ? (
                    <Button
                      onClick={handleComplete}
                      disabled={!isStepComplete() || isSubmitting}
                      className="bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/20"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Complete Setup
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isStepComplete()}
                      className="bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/20"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
