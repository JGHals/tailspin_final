export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
} 