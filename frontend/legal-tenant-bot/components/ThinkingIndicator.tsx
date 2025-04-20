"use client"

import React from 'react'

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="inline-flex items-center py-1 px-2 rounded bg-secondary-100 text-secondary-700">
      <span className="text-sm font-medium mr-2">Thinking</span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}

export default ThinkingIndicator 