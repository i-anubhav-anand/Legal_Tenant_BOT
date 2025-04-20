"use client"

import type { Case, Lawyer } from "@/types"
import { Scale, User, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import * as api from "@/services/api"

interface CaseStatusProps {
  case: Case
}

export default function CaseStatus({ case: caseData }: CaseStatusProps) {
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)

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
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-amber-100 text-amber-800"
      case "in_progress":
        return "bg-purple-100 text-purple-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-secondary-100 text-secondary-800"
      default:
        return "bg-secondary-100 text-secondary-800"
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
        return "bg-secondary-100 text-secondary-800"
      case 2:
        return "bg-blue-100 text-blue-800"
      case 3:
        return "bg-amber-100 text-amber-800"
      case 4:
        return "bg-orange-100 text-orange-800"
      case 5:
        return "bg-red-100 text-red-800"
      default:
        return "bg-amber-100 text-amber-800"
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

  return (
    <div className="mb-6 rounded-lg border border-secondary-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-primary-100 p-2 text-primary-600">
          <Scale size={18} />
        </div>
        <h3 className="text-lg font-medium text-secondary-800">Legal Case: {caseData.title}</h3>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-secondary-500">Status</p>
          <div className="mt-1 flex items-center">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor()}`}>
              {caseData.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-secondary-500">Priority</p>
          <div className="mt-1 flex items-center">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor()}`}>
              {getPriorityLabel()}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-secondary-500">Issue Type</p>
          <p className="text-sm font-medium text-secondary-800">{caseData.issue_type}</p>
        </div>
      </div>

      {lawyer && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <p className="text-xs font-medium text-secondary-700">Assigned Lawyer</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-800">{lawyer.name}</p>
              <p className="text-xs text-secondary-500">
                {lawyer.specialization} • {lawyer.years_experience} years experience
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-secondary-100 pt-3">
        <p className="text-xs font-medium text-secondary-700">Case Timeline</p>
        <div className="mt-2 flex items-start gap-2">
          <div className="mt-0.5 text-secondary-400">
            <Clock size={14} />
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-800">Case Created</p>
            <p className="text-xs text-secondary-500">{formatDate(caseData.created_at)}</p>
          </div>
        </div>
      </div>

      {caseData.legal_analysis && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <p className="text-xs font-medium text-secondary-700">Legal Analysis</p>
          <p className="mt-1 text-sm text-secondary-600">{caseData.legal_analysis}</p>
        </div>
      )}

      {caseData.recommendations && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <p className="text-xs font-medium text-secondary-700">Recommendations</p>
          <p className="mt-1 text-sm text-secondary-600">{caseData.recommendations}</p>
        </div>
      )}

      {caseData.key_facts && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <p className="text-xs font-medium text-secondary-700">Key Facts</p>
          <p className="mt-1 text-sm text-secondary-600">{caseData.key_facts}</p>
        </div>
      )}

      {caseData.citations && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <p className="text-xs font-medium text-secondary-700">Citations</p>
          <p className="mt-1 text-sm text-secondary-600">{caseData.citations}</p>
        </div>
      )}
    </div>
  )
}
