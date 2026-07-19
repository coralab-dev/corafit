import type { Request } from 'express';
import type { Client, ClientAccess, ClientPortalSession, Organization } from 'db';

export type ClientPortalRequest = Request & {
  clientPortalAccess?: ClientAccess & { client: Client & { organization: Organization } };
  clientPortalSession?: ClientPortalSession;
};
