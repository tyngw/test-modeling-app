export const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (message: string, data?: unknown) => {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, data);
  }
};
