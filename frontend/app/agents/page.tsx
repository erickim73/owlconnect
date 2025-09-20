"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Bot, MessageCircle, Clock, Star, ArrowRight } from "lucide-react"
import Navigation from "@/components/nav"

export default function AgentsPage() {
  const [selectedConversation, setSelectedConversation] = useState(0)

  const menteeData = {
    name: "Alex",
    conversations: [
      {
        mentor: "Dr. Smith",
        compatibility: 100.0,
        messages: [
          {
            speaker: "Mentor",
            message:
              "I'm Dr Smith with 5 years in ML and 12 NeurIPS papers last year alone. I can steer you to a publishable project and teach you the advanced modeling tricks reviewers love. Let's lock in a first 30-min slot - how's this Monday 2pm or Wednesday 4pm?",
          },
          {
            speaker: "Mentee",
            message:
              "Monday 2pm works perfectly! I'll bring a short list of dataset ideas and a rough problem statement so we can pick a direction fast.",
          },
        ],
        result: "successful",
      },
      {
        mentor: "Prof. Johnson",
        compatibility: 66.0,
        messages: [
          {
            speaker: "Mentor",
            message:
              "Hi Alex, Prof Johnson here. I've spent eight years turning ML theory into published papers and can help you design publishable experiments and write R/Python code that reviewers love. Let's find a 45-min slot this Tuesday 3pm or Thursday 1pm to map out a project and set our first milestone - does either window work for you?",
          },
          {
            speaker: "Mentee",
            message:
              "Thanks Prof Johnson! Thursday 1pm works perfectly. Before then I'll email you a one-page outline of two potential projects: time-series anomaly detection and causal inference on observational health data so we can pick one and set the first milestone.",
          },
        ],
        result: "successful",
      },
      {
        mentor: "Dr. Williams",
        compatibility: 85.0,
        messages: [
          {
            speaker: "Mentor",
            message:
              "Hello Alex! I'm Dr. Williams, specializing in deep learning applications for computer vision. I've published extensively in CVPR and ICCV, and I'm excited to help you develop a strong research foundation. I can guide you through the entire research process from ideation to publication. Would you be available for a 45-minute introductory session this Friday at 3pm or next Monday at 10am?",
          },
          {
            speaker: "Mentee",
            message:
              "Hi Dr. Williams! Your background in computer vision aligns perfectly with my interests. Friday at 3pm works great for me. I'll prepare a brief overview of my current projects and specific areas where I'd like guidance. Looking forward to our discussion!",
          },
          {
            speaker: "Mentor",
            message:
              "Excellent! I'll send you a calendar invite with the Zoom link. In preparation, could you also think about what specific computer vision problems excite you most? This will help us identify the best research direction for your goals.",
          },
          {
            speaker: "Mentee",
            message:
              "I'm particularly interested in medical image analysis and autonomous vehicle perception. I'll come prepared with some recent papers I've been reading in these areas and questions about potential research gaps.",
          },
        ],
        result: "successful",
      },
    ],
    finalChoice: "Dr. Smith",
    finalScore: 100.0,
  }

  const selectedConv = menteeData.conversations[selectedConversation]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Navigation />

      <div className="fixed left-6 top-24 bottom-6 w-80 z-10">
        <div className="h-full bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="p-6 border-b border-slate-200/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600">Active Conversations</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Mentor Matches</h2>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto h-full pb-20">
            {menteeData.conversations.map((conv, index) => (
              <button
                key={index}
                className={`w-full p-4 rounded-xl text-left transition-all duration-300 group ${
                  selectedConversation === index
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "bg-slate-50/50 hover:bg-slate-100/80 text-slate-700"
                }`}
                onClick={() => setSelectedConversation(index)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedConversation === index ? "bg-white/20" : "bg-slate-200"
                    }`}
                  >
                    <Bot className={`w-4 h-4 ${selectedConversation === index ? "text-white" : "text-slate-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.mentor}</div>
                    <div
                      className={`text-xs flex items-center gap-1 ${
                        selectedConversation === index ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      <MessageCircle className="w-3 h-3" />
                      {conv.messages.length} messages
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      selectedConversation === index
                        ? "bg-white/20 text-white border-white/20"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    {conv.compatibility}%
                  </Badge>
                  <ArrowRight
                    className={`w-3 h-3 transition-transform ${
                      selectedConversation === index
                        ? "text-white translate-x-1"
                        : "text-slate-400 group-hover:translate-x-1"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ml-96 mr-6 pt-24 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-slate-600 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-slate-200/50">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Connected with {selectedConv.mentor}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Research Mentorship</h1>
            <p className="text-slate-600">AI-powered conversations for academic growth</p>
          </div>

          <div className="space-y-8 mb-12">
            {selectedConv.messages.map((message, msgIndex) => (
              <div key={msgIndex} className={`flex ${message.speaker === "Mentor" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-2xl ${message.speaker === "Mentor" ? "mr-auto" : "ml-auto"}`}>
                  <div
                    className={`flex items-center gap-3 mb-3 ${
                      message.speaker === "Mentor" ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        message.speaker === "Mentor" ? "bg-slate-900" : "bg-slate-600"
                      }`}
                    >
                      {message.speaker === "Mentor" ? (
                        <Bot className="w-5 h-5 text-white" />
                      ) : (
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className={`text-sm ${message.speaker === "Mentor" ? "text-left" : "text-right"}`}>
                      <div className="font-medium text-slate-900">{message.speaker}</div>
                      <div className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />2 min ago
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${
                      message.speaker === "Mentor"
                        ? "bg-white border-slate-200/50 rounded-tl-md"
                        : "bg-slate-50 border-slate-200/50 rounded-tr-md"
                    }`}
                  >
                    <p className="text-slate-800 leading-relaxed text-pretty">{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
