import type React from "react"
import { ConversationProvider } from "@/context/ConversationContext"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import NetworkStatusBar from "./NetworkStatusBar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ConversationProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
          <Footer />
        </div>
      </div>
      <NetworkStatusBar />
    </ConversationProvider>
  )
}
