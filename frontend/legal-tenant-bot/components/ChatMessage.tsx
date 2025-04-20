"use client"

import type { Message } from "@/types"
import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react"
import ThinkingIndicator from "./ThinkingIndicator"

interface ChatMessageProps {
  message: Message
  isNew?: boolean
}

export default function ChatMessage({ message, isNew = false }: ChatMessageProps) {
  const isUser = message.is_from_user
  const [showSources, setShowSources] = useState(false)
  const [isTyping, setIsTyping] = useState(isNew && !isUser)
  const [displayedContent, setDisplayedContent] = useState("")
  const [showCursor, setShowCursor] = useState(true)
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Split content into main message and citations if needed - do this with useMemo to avoid recalculation
  const { mainContent, citations, hasCitations } = useMemo(() => {
    // Check if the message contains sources section with the format used by the backend
    const hasCitations = message.content.includes("**Sources:**")
    let mainContent = message.content
    let citationsRaw = ""
    let citations: Array<{ title: string, content: string }> = []

    if (hasCitations) {
      // Split at the Sources marker
      const parts = message.content.split("**Sources:**")
      mainContent = parts[0].trim()
      citationsRaw = parts[1].trim()
      
      // Parse the citations based on the format from backend
      // Format from formatCitations function:
      // 1. **Document Title** (from Knowledge Base)
      //    "Content excerpt..."
      const citationMatches = citationsRaw.match(/\d+\.\s+\*\*(.*?)\*\*(?:\s+\(from (.*?)\))?\s+(?:"([\s\S]*?)"|)/g) || []
      
      // Use a Set to track unique titles and prevent duplicates
      const uniqueTitles = new Set<string>()
      
      citations = citationMatches.map(match => {
        // Extract document title
        const titleMatch = match.match(/\d+\.\s+\*\*(.*?)\*\*/)
        const title = titleMatch ? titleMatch[1].trim() : "Unknown Source"
        
        // Extract knowledge base name if present
        const kbMatch = match.match(/\(from (.*?)\)/)
        const kb = kbMatch ? kbMatch[1].trim() : ""
        
        // Extract content if present (between quotes)
        const contentMatch = match.match(/"([\s\S]*?)"/)
        const content = contentMatch ? contentMatch[1].trim() : ""
        
        const fullTitle = kb ? `${title} (from ${kb})` : title
        
        // Track this title to eliminate duplicates
        uniqueTitles.add(fullTitle)
        
        return { 
          title: fullTitle, 
          content 
        }
      })
      
      // Remove duplicate entries by using the unique titles Set
      citations = citations.filter((citation, index, self) => 
        self.findIndex(c => c.title === citation.title) === index
      )
      
      // If no citations were parsed but we have raw citation text,
      // just create a single citation with the raw text
      if (citations.length === 0 && citationsRaw.trim()) {
        citations.push({
          title: "Referenced Source",
          content: citationsRaw.trim()
        })
      }
    }

    return { mainContent, citations, hasCitations }
  }, [message.content])

  // Format the content with markdown-like syntax - memoize to avoid recalculation
  const formatContent = useMemo(() => {
    return (content: string) => {
      // Replace bold markdown with spans
      let formatted = content.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
      
      // Replace newlines with <br>
      formatted = formatted.replace(/\n/g, "<br>")
      
      return formatted
    }
  }, [])

  // Typing effect for new assistant messages
  useEffect(() => {
    if (isTyping) {
      let i = 0;
      // Adjust typing speed for a more natural effect
      const baseTypingSpeed = 20; // slightly faster base milliseconds per character
      
      // Setup blinking cursor effect
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500); // Blink every 500ms
      
      const interval = setInterval(() => {
        if (i <= mainContent.length) {
          setDisplayedContent(mainContent.substring(0, i));
          
          // Randomly vary typing speed to make it feel more natural
          const variableSpeed = Math.random() * 40;
          clearInterval(interval);
          
          // Pause longer at punctuation
          const char = mainContent[i - 1];
          let delayMultiplier = 1;
          if (char === '.' || char === '!' || char === '?') {
            delayMultiplier = 4; // Slightly shorter pause at end of sentences
          } else if (char === ',' || char === ';' || char === ':') {
            delayMultiplier = 2.5; // Slightly shorter pause at punctuation
          }
          
          setTimeout(() => {
            const newInterval = setInterval(() => {
              i++;
              setDisplayedContent(mainContent.substring(0, i));
              
              if (i > mainContent.length) {
                clearInterval(newInterval);
                // Keep cursor blinking for a moment after typing completes
                setTimeout(() => {
                  if (cursorIntervalRef.current) {
                    clearInterval(cursorIntervalRef.current);
                    cursorIntervalRef.current = null;
                  }
                  setShowCursor(false);
                  setIsTyping(false);
                }, 800);
              }
            }, baseTypingSpeed + variableSpeed);
          }, baseTypingSpeed * delayMultiplier);
        }
      }, baseTypingSpeed);
      
      return () => {
        clearInterval(interval);
        if (cursorIntervalRef.current) {
          clearInterval(cursorIntervalRef.current);
          cursorIntervalRef.current = null;
        }
      }
    } else {
      setDisplayedContent(mainContent);
    }
  }, [isTyping, mainContent]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[90%] rounded-lg px-4 py-3 ${
          isUser ? "bg-primary-600 text-white" : "bg-secondary-100 text-secondary-800"
        }`}
      >
        {message.isThinking ? (
          <ThinkingIndicator />
        ) : (
          <>
            <p
              className="text-sm whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ 
                __html: isTyping ? formatContent(displayedContent) + (showCursor ? '<span class="inline-block w-[2px] h-[14px] bg-secondary-800 ml-[1px] animate-pulse"></span>' : '') : formatContent(mainContent) 
              }}
            />

            {hasCitations && !isTyping && (
              <div className="mt-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className={`flex items-center text-xs font-medium py-1 px-2 rounded-md ${
                    isUser 
                      ? `bg-primary-500 text-white/90 hover:bg-primary-400` 
                      : `bg-secondary-200 text-secondary-700 hover:bg-secondary-300`
                  } transition-colors`}
                >
                  {showSources ? (
                    <>
                      <ChevronUp size={14} className="mr-1" /> Hide sources ({citations.length})
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} className="mr-1" /> Show sources ({citations.length})
                    </>
                  )}
                </button>

                {showSources && (
                  <div className={`mt-3 text-xs rounded-md overflow-hidden ${
                    isUser ? "bg-primary-500/30" : "bg-secondary-200/70"
                  }`}>
                    <div className={`py-2 px-3 font-medium ${
                      isUser ? "bg-primary-500/50 text-white" : "bg-secondary-300 text-secondary-800"
                    }`}>
                      Sources Referenced
                    </div>
                    <div className="divide-y divide-dashed">
                      {citations.map((citation, index) => (
                        <div key={index} className={`p-3 ${
                          isUser ? "text-white/90" : "text-secondary-700"
                        }`}>
                          <div className="flex items-start mb-1">
                            <FileText size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                            <h4 className="font-medium">{citation.title}</h4>
                          </div>
                          {citation.content && (
                            <div className={`ml-6 pt-1 border-l-2 pl-2 ${
                              isUser ? "border-white/20" : "border-secondary-300"
                            }`}>
                              <p dangerouslySetInnerHTML={{ __html: formatContent(citation.content) }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
