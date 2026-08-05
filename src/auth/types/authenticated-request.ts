import { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
