export const errorBody = (code: string, message: string, details?: unknown) => ({
  code,
  message,
  details,
});
