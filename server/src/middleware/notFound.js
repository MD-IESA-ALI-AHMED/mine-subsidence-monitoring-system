import { notFound as notFoundError } from './error.js';

export function notFound(req, _res, next) {
  next(notFoundError(`No route for ${req.method} ${req.path}`));
}
