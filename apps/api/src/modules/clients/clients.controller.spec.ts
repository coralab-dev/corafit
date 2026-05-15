import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientType,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type OrganizationMember,
} from 'db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

type ClientsServiceMock = {
  getStatus: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
  getNotes: ReturnType<typeof vi.fn>;
  createAccess: ReturnType<typeof vi.fn>;
  getAccess: ReturnType<typeof vi.fn>;
  regenerateAccess: ReturnType<typeof vi.fn>;
  disableAccess: ReturnType<typeof vi.fn>;
};

function createOrganizationMember(
  overrides: Partial<OrganizationMember> = {},
): OrganizationMember {
  return {
    id: 'member-id',
    organizationId: 'org-id',
    userId: 'user-id',
    role: OrganizationMemberRole.owner,
    status: OrganizationMemberStatus.active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createMockRequest(): AuthenticatedRequest {
  return {
    headers: { 'x-organization-id': 'org-id' },
    organizationMember: createOrganizationMember(),
  } as AuthenticatedRequest;
}

describe('ClientsController', () => {
  let service: ClientsServiceMock;
  let controller: ClientsController;

  beforeEach(() => {
    service = {
      getStatus: vi.fn().mockReturnValue({ module: 'clients', status: 'ready' }),
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'client-id',
            name: 'Client One',
            operationalStatus: ClientOperationalStatus.active,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      }),
      create: vi.fn().mockResolvedValue({
        id: 'client-id',
        name: 'Client One',
        clientType: ClientType.online,
        mainGoal: 'Strength',
        heightCm: 170,
        initialWeightKg: 70,
      }),
      getById: vi.fn().mockResolvedValue({
        id: 'client-id',
        name: 'Client One',
        operationalStatus: ClientOperationalStatus.active,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'client-id',
        name: 'Updated Name',
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: 'client-id',
        operationalStatus: ClientOperationalStatus.paused,
      }),
      getNotes: vi.fn().mockResolvedValue([]),
      createAccess: vi.fn().mockResolvedValue({
        access: {
          clientId: 'client-id',
          id: 'access-id',
          status: ClientAccessStatus.active,
        },
        link: 'https://corafit-web.vercel.app/c/abc123token45678901234567890123456789012345',
        token: 'abc123token45678901234567890123456789012345',
      }),
      getAccess: vi.fn().mockResolvedValue(null),
      regenerateAccess: vi.fn()
        .mockResolvedValueOnce({
          access: { clientId: 'client-id', id: 'access-id', status: ClientAccessStatus.active },
          link: 'https://corafit-web.vercel.app/c/token1',
          token: 'token1',
        })
        .mockResolvedValueOnce({
          access: { clientId: 'client-id', id: 'access-id', status: ClientAccessStatus.active },
          link: 'https://corafit-web.vercel.app/c/token2',
          token: 'token2',
        }),
      disableAccess: vi.fn().mockResolvedValue({
        clientId: 'client-id',
        id: 'access-id',
        status: ClientAccessStatus.disabled,
      }),
    };
    controller = new ClientsController(service as unknown as ClientsService);
  });

  describe('getStatus', () => {
    it('returns module status', () => {
      const result = controller.getStatus();

      expect(result).toEqual({ module: 'clients', status: 'ready' });
      expect(service.getStatus).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns paginated clients', async () => {
      const request = createMockRequest();
      const query = { page: '1', limit: '20' };

      const result = await controller.list(query, request);

      expect(result.items).toBeInstanceOf(Array);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(1);
      expect(service.list).toHaveBeenCalledWith(query, request.organizationMember);
    });

    it('returns empty items when no clients exist', async () => {
      service.list.mockResolvedValueOnce({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });
      const request = createMockRequest();

      const result = await controller.list({}, request);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('create', () => {
    it('creates a client with provided data', async () => {
      const request = createMockRequest();
      const body = {
        name: 'New Client',
        clientType: ClientType.online,
        mainGoal: 'Weight Loss',
        heightCm: 165,
        initialWeightKg: 65,
      };

      const result = await controller.create(body, request);

      expect(service.create).toHaveBeenCalledWith(body, request.organizationMember);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
    });
  });

  describe('getById', () => {
    it('returns client when it exists', async () => {
      const request = createMockRequest();

      const result = await controller.getById('client-id', request);

      expect(service.getById).toHaveBeenCalledWith('client-id', request.organizationMember);
      expect(result).toHaveProperty('id', 'client-id');
      expect(result).toHaveProperty('name');
    });

    it('throws NotFoundException when client does not exist', async () => {
      service.getById.mockRejectedValueOnce(new NotFoundException('Client was not found'));
      const request = createMockRequest();

      await expect(
        controller.getById('non-existent-id', request),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates client fields', async () => {
      const request = createMockRequest();
      const body = { name: 'Updated Name' };

      const result = await controller.update('client-id', body, request);

      expect(service.update).toHaveBeenCalledWith('client-id', body, request.organizationMember);
      expect(result).toHaveProperty('name', 'Updated Name');
    });
  });

  describe('updateStatus', () => {
    it('transitions client to paused status', async () => {
      const request = createMockRequest();
      const body = { status: ClientOperationalStatus.paused };

      const result = await controller.updateStatus('client-id', body, request);

      expect(service.updateStatus).toHaveBeenCalledWith('client-id', body, request.organizationMember);
      expect(result.operationalStatus).toBe(ClientOperationalStatus.paused);
    });

    it('transitions client to active status', async () => {
      service.updateStatus.mockResolvedValueOnce({
        id: 'client-id',
        operationalStatus: ClientOperationalStatus.active,
      });
      const request = createMockRequest();
      const body = { status: ClientOperationalStatus.active };

      const result = await controller.updateStatus('client-id', body, request);

      expect(result.operationalStatus).toBe(ClientOperationalStatus.active);
    });

    it('transitions client to archived status', async () => {
      service.updateStatus.mockResolvedValueOnce({
        id: 'client-id',
        operationalStatus: ClientOperationalStatus.archived,
      });
      const request = createMockRequest();
      const body = { status: ClientOperationalStatus.archived };

      const result = await controller.updateStatus('client-id', body, request);

      expect(result.operationalStatus).toBe(ClientOperationalStatus.archived);
    });
  });

  describe('getNotes', () => {
    it('returns empty array when client has no notes', async () => {
      const request = createMockRequest();

      const result = await controller.getNotes('client-id', request);

      expect(service.getNotes).toHaveBeenCalledWith('client-id', request.organizationMember);
      expect(result).toEqual([]);
    });

    it('returns notes array when notes exist', async () => {
      const mockNotes = [
        { id: 'note-1', text: 'First note', createdAt: new Date() },
        { id: 'note-2', text: 'Second note', createdAt: new Date() },
      ];
      service.getNotes.mockResolvedValueOnce(mockNotes);
      const request = createMockRequest();

      const result = await controller.getNotes('client-id', request);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text');
    });
  });

  describe('createAccess', () => {
    it('returns token and link format', async () => {
      const request = createMockRequest();

      const result = await controller.createAccess('client-id', request);

      expect(result).toHaveProperty('access');
      expect(result).toHaveProperty('link');
      expect(result).toHaveProperty('token');
      expect(result.link).toMatch(/^https:\/\/corafit-web\.vercel\.app\/c\/.+$/);
      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(service.createAccess).toHaveBeenCalledWith('client-id', request.organizationMember);
    });
  });

  describe('getAccess', () => {
    it('returns null when no access exists', async () => {
      const request = createMockRequest();

      const result = await controller.getAccess('client-id', request);

      expect(service.getAccess).toHaveBeenCalledWith('client-id', request.organizationMember);
      expect(result).toBeNull();
    });

    it('returns access details when access exists', async () => {
      const mockAccess = {
        clientId: 'client-id',
        id: 'access-id',
        lastAccessAt: null,
        lockedUntil: null,
        status: ClientAccessStatus.active,
      };
      service.getAccess.mockResolvedValueOnce(mockAccess);
      const request = createMockRequest();

      const result = await controller.getAccess('client-id', request);

      expect(result).toEqual(mockAccess);
    });
  });

  describe('regenerateAccess', () => {
    it('returns new token each time', async () => {
      const request = createMockRequest();

      const result1 = await controller.regenerateAccess('client-id', request);
      const result2 = await controller.regenerateAccess('client-id', request);

      expect(result1.token).not.toBe(result2.token);
      expect(result1.link).toMatch(/^https:\/\/corafit-web\.vercel\.app\/c\/.+$/);
      expect(result2.link).toMatch(/^https:\/\/corafit-web\.vercel\.app\/c\/.+$/);
    });
  });

  describe('disableAccess', () => {
    it('sets status to disabled', async () => {
      const request = createMockRequest();

      const result = await controller.disableAccess('client-id', request);

      expect(result.status).toBe(ClientAccessStatus.disabled);
      expect(service.disableAccess).toHaveBeenCalledWith('client-id', request.organizationMember);
    });

    it('throws NotFoundException when no access exists', async () => {
      service.disableAccess.mockRejectedValueOnce(
        new NotFoundException('Client access was not found'),
      );
      const request = createMockRequest();

      await expect(
        controller.disableAccess('client-id', request),
      ).rejects.toThrow(NotFoundException);
    });
  });
});