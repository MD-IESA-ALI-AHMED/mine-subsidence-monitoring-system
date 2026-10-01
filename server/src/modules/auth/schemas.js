import { z } from 'zod';

// Sign-in names are compared with existing accounts only (there is no sign-up), so any
// reasonable email-like name is accepted, including ones without a dotted domain.
export const loginBody = z.object({
  email: z.string().trim().toLowerCase().min(3).max(200),
  password: z.string().min(1).max(200),
});
