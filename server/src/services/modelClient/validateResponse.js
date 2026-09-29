import { modelResponseSchema } from '@subsidence/shared';

export class ModelError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Validates a model response against the shared contract and the request it answers. */
export function validateModelResponse(body, request) {
  const parsed = modelResponseSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ModelError(
      'invalid_response',
      `Model response does not match the contract (${detail})`,
    );
  }
  if (parsed.data.requestId !== request.requestId) {
    throw new ModelError('invalid_response', 'Model response is for a different request');
  }
  return parsed.data;
}
