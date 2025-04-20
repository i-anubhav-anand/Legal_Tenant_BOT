// Logger utility for consistent debugging
export const logger = {
  debug: (message: string, ...data: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, ...data);
    }
  },
  
  info: (message: string, ...data: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${message}`, ...data);
    }
  },
  
  warn: (message: string, ...data: any[]) => {
    console.warn(`[WARN] ${message}`, ...data);
  },
  
  error: (message: string, ...data: any[]) => {
    console.error(`[ERROR] ${message}`, ...data);
  }
}

export default logger; 