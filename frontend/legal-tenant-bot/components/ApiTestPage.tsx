"use client"

import { useState } from "react"
import { API_CONFIG } from "@/config"

type ApiResponse = {
  data: any
  status: number
  error?: string
}

export default function ApiTestPage() {
  const [results, setResults] = useState<Record<string, ApiResponse>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const apiBaseUrl = API_CONFIG.baseUrl

  const endpoints = [
    { id: "apiRoot", name: "API Root", path: "/" },
    { id: "knowledgeBases", name: "Knowledge Bases", path: "/knowledge-bases/" },
    { id: "conversations", name: "Conversations", path: "/conversations/" },
    { id: "healthCheck", name: "Health Check", path: "/health-check" },
  ]

  async function testEndpoint(endpoint: string, id: string) {
    setLoading((prev) => ({ ...prev, [id]: true }))

    try {
      console.log(`Testing endpoint: ${apiBaseUrl}${endpoint}`)

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      })

      let data
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      setResults((prev) => ({
        ...prev,
        [id]: {
          data,
          status: response.status,
        },
      }))
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error)
      setResults((prev) => ({
        ...prev,
        [id]: {
          data: null,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  function getStatusColor(status: number) {
    if (status >= 200 && status < 300) return "text-green-600"
    if (status >= 400) return "text-red-600"
    return "text-amber-600"
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-700">API Connection Test</h1>
      <p className="mb-4 text-secondary-600">
        This page tests if the CORS configuration on the backend is working properly and if the API is accessible.
      </p>

      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-secondary-800">API Base URL</h2>
        <div className="rounded-md bg-secondary-50 p-2 font-mono text-sm">{apiBaseUrl}</div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-lg font-medium text-secondary-800">{endpoint.name}</h3>
            <p className="mb-3 text-sm text-secondary-500">
              {apiBaseUrl}
              {endpoint.path}
            </p>

            <button
              onClick={() => testEndpoint(endpoint.path, endpoint.id)}
              disabled={loading[endpoint.id]}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-primary-300"
            >
              {loading[endpoint.id] ? "Testing..." : "Test Endpoint"}
            </button>

            {results[endpoint.id] && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className={getStatusColor(results[endpoint.id].status)}>
                    {results[endpoint.id].status || "Error"}
                  </span>
                </div>

                {results[endpoint.id].error ? (
                  <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{results[endpoint.id].error}</div>
                ) : (
                  <div className="mt-2 max-h-60 overflow-auto rounded-md bg-secondary-50 p-3">
                    <pre className="text-xs text-secondary-700">
                      {typeof results[endpoint.id].data === "object"
                        ? JSON.stringify(results[endpoint.id].data, null, 2)
                        : results[endpoint.id].data}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-secondary-800">CORS Troubleshooting</h2>

        <div className="space-y-2 text-sm text-secondary-600">
          <p>If you're experiencing CORS errors, ensure your backend has the following configuration:</p>

          <div className="rounded-md bg-secondary-50 p-3 font-mono text-xs">
            <p># Django settings.py</p>
            <p>CORS_ALLOW_ALL_ORIGINS = False</p>
            <p>CORS_ALLOW_CREDENTIALS = True</p>
            <p>CORS_ALLOWED_ORIGINS = [</p>
            <p> "http://localhost:3000",</p>
            <p> "http://127.0.0.1:3000",</p>
            <p> # Add your frontend URL here</p>
            <p>]</p>
          </div>

          <p className="mt-4">Common CORS errors:</p>
          <ul className="list-inside list-disc">
            <li>Access to fetch at '...' from origin '...' has been blocked by CORS policy</li>
            <li>No 'Access-Control-Allow-Origin' header is present</li>
            <li>The value of the 'Access-Control-Allow-Origin' header does not match the supplied origin</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
