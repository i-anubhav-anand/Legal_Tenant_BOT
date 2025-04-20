"use client"

import type { Case, Lawyer } from "@/types"
import { Scale, User, Clock, FileText, BookOpen, CheckSquare, AlertTriangle, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import * as api from "@/services/api"

interface CaseStatusProps {
  case: Case
}

export default function CaseStatus({ case: caseData }: CaseStatusProps) {
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>("analysis")

  useEffect(() => {
    if (caseData.lawyer_id) {
      loadLawyer(caseData.lawyer_id)
    }
  }, [caseData.lawyer_id])

  const loadLawyer = async (lawyerId: string) => {
    try {
      const lawyerData = await api.getLawyer(lawyerId)
      setLawyer(lawyerData)
    } catch (error) {
      console.error("Failed to load lawyer:", error)
    }
  }

  const getStatusColor = () => {
    switch (caseData.status) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "assigned":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "closed":
        return "bg-secondary-100 text-secondary-800 border-secondary-200"
      default:
        return "bg-secondary-100 text-secondary-800 border-secondary-200"
    }
  }

  const getStatusIcon = () => {
    switch (caseData.status) {
      case "new":
        return <FileText size={14} />
      case "assigned":
        return <User size={14} />
      case "in_progress":
        return <Clock size={14} />
      case "resolved":
        return <CheckSquare size={14} />
      case "closed":
        return <BookOpen size={14} />
      default:
        return <FileText size={14} />
    }
  }

  const getPriorityLabel = () => {
    switch (caseData.priority) {
      case 1:
        return "Very Low"
      case 2:
        return "Low"
      case 3:
        return "Medium"
      case 4:
        return "High"
      case 5:
        return "Urgent"
      default:
        return "Medium"
    }
  }

  const getPriorityColor = () => {
    switch (caseData.priority) {
      case 1:
        return "bg-green-100 text-green-800 border-green-200"
      case 2:
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 3:
        return "bg-amber-100 text-amber-800 border-amber-200"
      case 4:
        return "bg-orange-100 text-orange-800 border-orange-200"
      case 5:
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-amber-100 text-amber-800 border-amber-200"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null)
    } else {
      setExpandedSection(section)
    }
  }

  // Function to parse and format legal analysis with paragraphs and lists
  const formatAnalysis = (text: string) => {
    if (!text) return null
    
    return text.split('\n').map((line, i) => {
      // Check if line is a numbered list item
      const listMatch = line.match(/^(\d+)\.\s+(.+)$/)
      
      if (listMatch) {
        return (
          <div key={i} className="flex gap-2 my-1">
            <span className="font-medium">{listMatch[1]}.</span>
            <span>{listMatch[2]}</span>
          </div>
        )
      }
      
      // Check if line is a section header
      if (line.match(/^([A-Z][A-Za-z\s]+):$/)) {
        return <h4 key={i} className="font-medium mt-2 mb-1">{line}</h4>
      }
      
      // Regular paragraph
      return line.trim() ? <p key={i} className="my-1">{line}</p> : <br key={i} />
    })
  }

  return (
    <div className="mb-6 rounded-lg border border-secondary-200 bg-white shadow-sm overflow-hidden">
      {/* Case header */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 border-b border-secondary-200">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary-600 p-2 text-white">
          <Scale size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-secondary-900">Legal Case: {caseData.title}</h3>
            <p className="text-sm text-secondary-600">Created on {formatDate(caseData.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Case details */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-secondary-100 p-3">
            <p className="text-xs font-medium uppercase text-secondary-500">Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusColor()}`}>
                {getStatusIcon()}
              {caseData.status.replace("_", " ")}
            </span>
          </div>
        </div>

          <div className="rounded-lg border border-secondary-100 p-3">
            <p className="text-xs font-medium uppercase text-secondary-500">Priority</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getPriorityColor()}`}>
                {caseData.priority >= 4 && <AlertTriangle size={14} />}
              {getPriorityLabel()}
            </span>
          </div>
        </div>

          <div className="rounded-lg border border-secondary-100 p-3">
            <p className="text-xs font-medium uppercase text-secondary-500">Issue Type</p>
            <p className="mt-2 text-sm font-medium text-secondary-800">{caseData.issue_type}</p>
        </div>
      </div>

        {/* Assigned lawyer */}
      {lawyer && (
          <div className="mt-4 rounded-lg border border-secondary-100 p-3">
            <p className="text-xs font-medium uppercase text-secondary-500">Assigned Lawyer</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <User size={18} />
            </div>
            <div>
                <p className="font-medium text-secondary-800">{lawyer.name}</p>
              <p className="text-xs text-secondary-500">
                {lawyer.specialization} • {lawyer.years_experience} years experience
              </p>
            </div>
          </div>
        </div>
      )}

        {/* Legal analysis section */}
        {caseData.legal_analysis && (
          <div className="mt-4">
            <button 
              onClick={() => toggleSection('analysis')}
              className="w-full rounded-lg border border-secondary-100 bg-white p-3 text-left hover:bg-secondary-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-primary-600" />
                  <p className="font-medium text-secondary-800">Legal Analysis</p>
                </div>
                <ArrowRight 
                  size={16} 
                  className={`text-secondary-400 transition-transform ${expandedSection === 'analysis' ? 'rotate-90' : ''}`} 
                />
              </div>
            </button>
            
            {expandedSection === 'analysis' && (
              <div className="mt-2 rounded-lg border border-secondary-100 p-4 text-sm text-secondary-700">
                {formatAnalysis(caseData.legal_analysis)}
          </div>
            )}
          </div>
        )}

        {/* Recommendations section */}
        {caseData.recommendations && (
          <div className="mt-4">
            <button 
              onClick={() => toggleSection('recommendations')}
              className="w-full rounded-lg border border-secondary-100 bg-white p-3 text-left hover:bg-secondary-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-primary-600" />
                  <p className="font-medium text-secondary-800">Recommendations</p>
        </div>
                <ArrowRight 
                  size={16} 
                  className={`text-secondary-400 transition-transform ${expandedSection === 'recommendations' ? 'rotate-90' : ''}`} 
                />
      </div>
            </button>
            
            {expandedSection === 'recommendations' && (
              <div className="mt-2 rounded-lg border border-secondary-100 p-4 text-sm text-secondary-700">
                {formatAnalysis(caseData.recommendations)}
        </div>
      )}
        </div>
      )}

        {/* Key facts section */}
      {caseData.key_facts && (
          <div className="mt-4">
            <button 
              onClick={() => toggleSection('key_facts')}
              className="w-full rounded-lg border border-secondary-100 bg-white p-3 text-left hover:bg-secondary-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary-600" />
                  <p className="font-medium text-secondary-800">Key Facts</p>
                </div>
                <ArrowRight 
                  size={16} 
                  className={`text-secondary-400 transition-transform ${expandedSection === 'key_facts' ? 'rotate-90' : ''}`} 
                />
              </div>
            </button>
            
            {expandedSection === 'key_facts' && (
              <div className="mt-2 rounded-lg border border-secondary-100 p-4 text-sm text-secondary-700">
                {formatAnalysis(caseData.key_facts)}
              </div>
            )}
        </div>
      )}

        {/* Citations section */}
      {caseData.citations && (
          <div className="mt-4">
            <button 
              onClick={() => toggleSection('citations')}
              className="w-full rounded-lg border border-secondary-100 bg-white p-3 text-left hover:bg-secondary-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-primary-600" />
                  <p className="font-medium text-secondary-800">Citations</p>
                </div>
                <ArrowRight 
                  size={16} 
                  className={`text-secondary-400 transition-transform ${expandedSection === 'citations' ? 'rotate-90' : ''}`} 
                />
              </div>
            </button>
            
            {expandedSection === 'citations' && (
              <div className="mt-2 rounded-lg border border-secondary-100 p-4 text-sm text-secondary-700">
                {formatAnalysis(caseData.citations)}
              </div>
            )}
        </div>
      )}
      </div>
    </div>
  )
}
