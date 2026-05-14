import type { Request } from 'express';
import type { User } from 'db';

export type AuthenticatedRequest = Request & {
  user?: User;
};
