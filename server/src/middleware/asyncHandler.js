/** Wraps an async controller so rejected promises reach the error handler (Express 4). */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
