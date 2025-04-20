// Define typed environment variables for Next.js
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_BASE_URL?: string;
    }
  }
}

// API Configuration
const API_BASE_URL = typeof window !== "undefined"
  ? (window as any).__NEXT_DATA__?.props?.pageProps?.apiBaseUrl || "http://localhost:8000/api"
  : "http://localhost:8000/api";

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  requestTimeout: 5000, // 5 seconds
  useMockDataFallback: true, // Always fall back to mock data if API fails
  alwaysUseMockData: false, // Using real API first
  debug: true, // Enable debug logging
  retryAttempts: 1, // Number of retry attempts for failed requests
}
