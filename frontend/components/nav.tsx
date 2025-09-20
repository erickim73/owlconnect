"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bot, Users, GraduationCap } from "lucide-react"

export default function Navigation() {
    const pathname = usePathname()

    const navItems = [
        { id: "dashboard", icon: BarChart3, label: "Dashboard", href: "/dashboard" },
        { id: "agents", icon: Bot, label: "Agents", href: "/agents" },
        { id: "mentors", icon: Users, label: "Mentors", href: "/mentors" },
    ]

    const getActiveId = () => {
        if (pathname === "/dashboard") return "dashboard"
        if (pathname === "/agents") return "agents"
        if (pathname === "/mentors") return "mentors"
        return "dashboard"
    }

    const activeId = getActiveId()

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Left section - fixed width */}
                    <div className="flex items-center w-48">
                        <Link href="/dashboard" className="flex items-center group">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center mr-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                OwlConnect
                            </span>
                        </Link>
                    </div>

                    {/* Center section - flex grow */}
                    <div className="flex-1 flex justify-center">
                        <nav className="flex items-center bg-gray-100/50 backdrop-blur-sm rounded-full p-2 border border-gray-200/50">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`relative flex items-center px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
                                        activeId === item.id
                                            ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                                    }`}
                                >
                                    <item.icon className="w-4 h-4 mr-2" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                    {activeId === item.id && <div className="absolute inset-0 rounded-full bg-gray-900/10 animate-pulse" />}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Right section - fixed width, same as left */}
                    <div className="flex items-center justify-end w-48">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-sm font-medium transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-gray-500/20 cursor-pointer text-white">
                            JR
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}