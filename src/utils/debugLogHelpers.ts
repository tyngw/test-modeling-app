export const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data);
    }
  };