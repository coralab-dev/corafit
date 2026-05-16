import type { Request } from 'express';
import type { Client, ClientAccess, ClientPortalSession } from 'db';

export type ClientPortalRequest = Request & {
  clientPortalAccess?: ClientAccess & { client: Client };
  clientPortalSession?: ClientPortalSession;
};
