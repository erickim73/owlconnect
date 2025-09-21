"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Clock, Activity, Zap } from "lucide-react"
import Navigation from "@/components/nav"

interface StreamMessage {
    id: string
    content: string
    timestamp: Date
    type: "system" | "dialogue" | "summary"
}

export default function AgentsPage() {
    const router = useRouter()
    const [isConnected, setIsConnected] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [hasFinished, setHasFinished] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">(
        "disconnected",
    )
    const [messages, setMessages] = useState<StreamMessage[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const benchmarkAccumulatorRef = useRef("")
    const isBenchmarkModeRef = useRef(false)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Redirect to /mentors 2 seconds after all messages are done
    useEffect(() => {
        if (hasFinished && !isStreaming && messages.length > 0) {
            const timer = setTimeout(() => {
                router.push('/mentors')
            }, 10000)

            return () => clearTimeout(timer)
        }
    }, [hasFinished, isStreaming, messages.length, router])

    useEffect(() => {
        setIsMounted(true)

        // Auto-connect immediately when component mounts
        const sessionId = localStorage.getItem("negotiation_session_id")

        if (sessionId) {
            console.log("Session ID found, auto-connecting WebSocket...")
            // Connect immediately without waiting for user interaction
            setTimeout(() => {
                connectWebSocket()
            }, 100) // Small delay to ensure component is mounted
        } else {
            console.log("No session ID found")
        }
    }, [])

    // WebSocket refs
    const wsRef = useRef<WebSocket | null>(null)
    const accumulatorRef = useRef("")

    // WebSocket configuration
    const WS_BACKEND = process.env.NEXT_PUBLIC_WS_BACKEND || "ws://127.0.0.1:8000"
    const getSessionId = () => {
        const storedSessionId = localStorage.getItem("negotiation_session_id")
        return storedSessionId || "test-session-1"
    }

    // Fragment parsing logic
    const SENTENCE_END = /[.!?…]["'")]?$/

    const pushFragment = (text: string) => {
        const s = text.trim()
        if (!s) return

        if (s.includes("=== BENCHMARK RESULTS ===")) {
            isBenchmarkModeRef.current = true
            benchmarkAccumulatorRef.current = s
            return
        }

        if (isBenchmarkModeRef.current) {
            benchmarkAccumulatorRef.current += "\n" + s

            // Check if benchmark section is complete
            if (s.includes("[done]") || s.includes("[closed]")) {
                processStreamMessage(benchmarkAccumulatorRef.current)
                benchmarkAccumulatorRef.current = ""
                isBenchmarkModeRef.current = false
            }
            return
        }

        if (s.length > 80 || SENTENCE_END.test(s)) {
            if (accumulatorRef.current) {
                const fullMessage = (accumulatorRef.current + " " + s).replace(/[ \t]+/g, " ").trim()
                processStreamMessage(fullMessage)
                accumulatorRef.current = ""
            } else {
                processStreamMessage(s)
            }
            return
        }

        accumulatorRef.current = (accumulatorRef.current ? accumulatorRef.current + " " : "") + s
        if (accumulatorRef.current.length > 160 || SENTENCE_END.test(accumulatorRef.current)) {
            const fullMessage = accumulatorRef.current.replace(/[ \t]+/g, " ").trim()
            processStreamMessage(fullMessage)
            accumulatorRef.current = ""
        }
    }

    const flushAccumulator = () => {
        if (accumulatorRef.current.trim()) {
            const fullMessage = accumulatorRef.current.replace(/[ \t]+/g, " ").trim()
            processStreamMessage(fullMessage)
            accumulatorRef.current = ""
        }

        if (benchmarkAccumulatorRef.current.trim()) {
            processStreamMessage(benchmarkAccumulatorRef.current)
            benchmarkAccumulatorRef.current = ""
            isBenchmarkModeRef.current = false
        }
    }

    const getMessageType = (text: string): "system" | "dialogue" | "summary" => {
        if (
            text.includes("===") ||
            text.includes("streaming started") ||
            text.includes("PROCESSING MENTEE") ||
            text.includes("NEGOTIATION ROUND") ||
            text.includes("potential mentors found") ||
            text.includes("SUCCESSFUL MATCH") ||
            text.includes("FINAL MATCHING SUMMARY")
        ) {
            return "system"
        }

        if (
            text.includes("Negotiation successful") ||
            text.includes("Successfully negotiated") ||
            text.includes("MULTIPLE SUCCESSFUL") ||
            text.includes("Test Case") ||
            text.includes("Final Weighted Score") ||
            text.includes("BENCHMARK RESULTS") ||
            text.includes("Interpersonal") ||
            text.includes("Professional") ||
            text.includes("FINAL SCORE") ||
            text.includes("Excellent Match") ||
            text.includes("Mismatched") ||
            text.includes("Summary") ||
            text.includes("│") // Detect table formatting characters
        ) {
            return "summary"
        }

        return "dialogue"
    }

    const processStreamMessage = (text: string) => {
        if (!text.trim()) return

        // Skip very noisy messages
        if (
            text.includes("Warning: Invalid mentor") ||
            text.includes("defaulting to first option") ||
            (text.includes("MENTOR CAPACITY") && text.includes("mentees"))
        ) {
            return
        }

        const messageType = getMessageType(text)

        const newMessage: StreamMessage = {
            id: `msg-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
            content: text,
            timestamp: new Date(),
            type: messageType,
        }

        setMessages((prev) => [...prev, newMessage])

        if (text.includes("BENCHMARK RESULTS") || text.includes("[done]") || text.includes("[closed]")) {
            setHasFinished(true)
            setIsStreaming(false)
        }
    }

    const connectWebSocket = async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        setConnectionStatus("connecting")
        setHasFinished(false)

        const sessionId = getSessionId()
        const url = `${WS_BACKEND.replace(/\/$/, "")}/ws/negotiation/${encodeURIComponent(sessionId)}`

        try {
            wsRef.current = new WebSocket(url)

            wsRef.current.onopen = () => {
                setIsConnected(true)
                setConnectionStatus("connected")
                setIsStreaming(true)

                try {
                    const startCommand = JSON.stringify({
                        cmd: "start",
                        session_id: getSessionId(),
                    })
                    wsRef.current?.send(startCommand)
                } catch (e) {
                    console.error("Failed to send start command:", e)
                }
            }

            wsRef.current.onmessage = (event) => {
                const data = event.data
                if (data === "__DONE__") {
                    flushAccumulator()
                    setIsStreaming(false)
                    setHasFinished(true)
                    wsRef.current?.close()
                    return
                }
                if (data.includes("[done]") || data.includes("[closed]")) {
                    pushFragment(data)
                    flushAccumulator()
                    setIsStreaming(false)
                    setHasFinished(true)
                    return
                }
                pushFragment(data)
            }

            wsRef.current.onerror = (error) => {
                console.error("WebSocket error:", error)
                setConnectionStatus("error")
                setIsConnected(false)
                setIsStreaming(false)
            }

            wsRef.current.onclose = (event) => {
                flushAccumulator()
                setIsConnected(false)
                setIsStreaming(false)
                setConnectionStatus("disconnected")
                if (!hasFinished) {
                    setHasFinished(true)
                }
            }
        } catch (error) {
            console.error("WebSocket connection failed:", error)
            setConnectionStatus("error")
            setIsConnected(false)
        }
    }

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close()
        }
        setIsStreaming(false)
    }

    const clearMessages = () => {
        setMessages([])
        setHasFinished(false)
    }

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <Navigation />

            <div>
                <div className="max-w-5xl mx-auto">
                    {/* Messages Display */}
                    <div className="space-y-3">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
                                className={`rounded-lg p-4 border transition-all duration-500 ease-out transform ${
                                    message.type === "system"
                                        ? "bg-primary/5 border-primary/20 border-l-4 border-l-primary"
                                        : message.type === "summary"
                                            ? "bg-muted/50 border-border border-l-4 border-l-primary"
                                            : "bg-card border-border"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div
                                        className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${
                                            message.type === "system"
                                                ? "bg-primary/10 text-primary"
                                                : message.type === "summary"
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {message.type === "system" && <Zap className="w-3 h-3" />}
                                        {message.type === "system" ? "System" : message.type === "summary" ? "Summary" : "Dialogue"}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {isMounted ? message.timestamp.toLocaleTimeString() : "--:--:--"}
                                    </div>
                                </div>
                                <div
                                    className={`text-sm leading-relaxed font-mono whitespace-pre-line ${
                                        message.type === "system"
                                            ? "text-primary font-medium"
                                            : message.type === "summary"
                                                ? "text-foreground font-semibold"
                                                : "text-foreground"
                                    }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {(isStreaming || hasFinished) && (
                            <div className="flex justify-center py-6">
                                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        {isStreaming && (
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                                <div
                                                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                                                    style={{ animationDelay: "0.2s" }}
                                                ></div>
                                                <div
                                                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                                                    style={{ animationDelay: "0.4s" }}
                                                ></div>
                                            </div>
                                        )}
                                        {hasFinished && !isStreaming && <div className="text-green-500">✓</div>}
                                        <span className="text-sm font-medium">
                                            {isStreaming
                                                ? "AI agents are negotiating..."
                                                : hasFinished
                                                    ? "AI agents are done negotiating"
                                                    : "AI agents are done negotiating"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && !isStreaming && !hasFinished && (
                            <div className="text-center py-16">
                                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <div className="text-muted-foreground text-lg mb-2">No negotiations yet</div>
                                <div className="text-muted-foreground text-sm">Click Start to begin the AI matching process</div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>
        </div>
    )
}