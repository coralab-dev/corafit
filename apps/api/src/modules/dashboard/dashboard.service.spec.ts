import { ForbiddenException } from '@nestjs/common';
import {
  ClientOperationalStatus,
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  DayOfWeek,
  OrganizationMemberRole,
  TrainingDayType,
  type OrganizationMember,
} from 'db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardService } from './dashboard.service';

type PrismaServiceMock = {
  $transaction: ReturnType<typeof vi.fn>;
  client: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  trainingPlan: {
    count: ReturnType<typeof vi.fn>;
  };
  clientAccess: {
    count: ReturnType<typeof vi.fn>;
  };
  clientTrainingPlanAssignment: {
    count: ReturnType<typeof vi.fn>;
  };
  organization: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createMockPrisma(): PrismaServiceMock {
  const mock = {
    $transaction: vi.fn(),
    client: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    trainingPlan: {
      count: vi.fn(),
    },
    clientAccess: {
      count: vi.fn(),
    },
    clientTrainingPlanAssignment: {
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  };

  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      const cb = arg as (prisma: PrismaService) => Promise<unknown>;
      return cb(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return mock;
}

const mockMember: OrganizationMember = {
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-1',
  role: OrganizationMemberRole.owner,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  describe('getStatus', () => {
    it('returns ready status', () => {
      const result = service.getStatus();
      expect(result).toEqual({ module: 'dashboard', status: 'ready' });
    });
  });

  describe('getOnboardingStats', () => {
    it('throws Forbidden when member is undefined', async () => {
      await expect(service.getOnboardingStats(undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns stats with all counts at zero for empty org', async () => {
      prisma.client.count.mockResolvedValue(0);
      prisma.trainingPlan.count.mockResolvedValue(0);
      prisma.clientAccess.count.mockResolvedValue(0);
      prisma.clientTrainingPlanAssignment.count.mockResolvedValue(0);

      const result = await service.getOnboardingStats(mockMember);

      expect(result).toEqual({
        totalClients: 0,
        totalPlans: 0,
        clientsWithPlan: 0,
        clientsWithoutPlan: 0,
        clientsWithAccess: 0,
        checklist: {
          hasCreatedClient: false,
          hasCreatedOrSelectedPlan: false,
          hasAssignedPlan: false,
          hasGeneratedAccess: false,
          hasPreviewedPortal: false,
        },
      });
    });

    it('returns stats with counts and completed checklist', async () => {
      prisma.client.count.mockResolvedValue(3);
      prisma.trainingPlan.count.mockResolvedValue(2);
      prisma.clientAccess.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      prisma.clientTrainingPlanAssignment.count.mockResolvedValue(2);

      const result = await service.getOnboardingStats(mockMember);

      expect(result.totalClients).toBe(3);
      expect(result.totalPlans).toBe(2);
      expect(result.clientsWithPlan).toBe(2);
      expect(result.clientsWithoutPlan).toBe(1);
      expect(result.clientsWithAccess).toBe(1);
      expect(result.checklist.hasCreatedClient).toBe(true);
      expect(result.checklist.hasCreatedOrSelectedPlan).toBe(true);
      expect(result.checklist.hasAssignedPlan).toBe(true);
      expect(result.checklist.hasGeneratedAccess).toBe(true);
      expect(result.checklist.hasPreviewedPortal).toBe(true);
      expect(prisma.clientTrainingPlanAssignment.count).toHaveBeenCalledWith({
        where: {
          status: ClientTrainingPlanAssignmentStatus.active,
          client: { organizationId: 'org-1' },
        },
      });
    });

    it('keeps portal preview pending until an access has been used', async () => {
      prisma.client.count.mockResolvedValue(1);
      prisma.trainingPlan.count.mockResolvedValue(1);
      prisma.clientAccess.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      prisma.clientTrainingPlanAssignment.count.mockResolvedValue(1);

      const result = await service.getOnboardingStats(mockMember);

      expect(result.checklist.hasGeneratedAccess).toBe(true);
      expect(result.checklist.hasPreviewedPortal).toBe(false);
    });
  });

  describe('getCoachDashboard', () => {
    const today = new Date('2026-05-20T18:00:00.000Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(today);
      prisma.organization.findUnique.mockResolvedValue({
        timezone: 'America/Mexico_City',
      });
      prisma.client.count.mockResolvedValue(0);
      prisma.trainingPlan.count.mockResolvedValue(0);
      prisma.clientAccess.count.mockResolvedValue(0);
      prisma.clientTrainingPlanAssignment.count.mockResolvedValue(0);
      prisma.client.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('throws Forbidden when member is undefined', async () => {
      await expect(service.getCoachDashboard(undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns empty dashboard for an empty organization', async () => {
      const result = await service.getCoachDashboard(mockMember);

      expect(result).toMatchObject({
        timezone: 'America/Mexico_City',
        summary: {
          activeClients: 0,
          clientsWithoutPlan: 0,
          clientsUpToDate: 0,
          clientsAtRisk: 0,
          clientsWithoutActivity: 0,
          pausedClients: 0,
          inactiveClients: 0,
          sessionsCompletedThisWeek: 0,
        },
        attention: [],
        onboarding: {
          totalClients: 0,
          totalPlans: 0,
          clientsWithPlan: 0,
          clientsWithoutPlan: 0,
          clientsWithAccess: 0,
        },
      });
      expect(result.generatedAt).toBe('2026-05-20T18:00:00.000Z');
    });

    it('scopes organization queries to the member organization', async () => {
      await service.getCoachDashboard(mockMember);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        select: { timezone: true },
      });
      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            operationalStatus: { not: ClientOperationalStatus.archived },
          },
        }),
      );
    });

    it('classifies an active client without plan as without_plan', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({ id: 'client-1', name: 'Ana' }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.activeClients).toBe(1);
      expect(result.summary.clientsWithoutPlan).toBe(1);
      expect(result.attention).toEqual([
        expect.objectContaining({
          clientId: 'client-1',
          name: 'Ana',
          status: 'without_plan',
          currentPlan: null,
        }),
      ]);
    });

    it('counts paused and inactive clients without classifying them as risky', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({ operationalStatus: ClientOperationalStatus.paused }),
        createClient({ operationalStatus: ClientOperationalStatus.inactive }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.pausedClients).toBe(1);
      expect(result.summary.inactiveClients).toBe(1);
      expect(result.summary.clientsAtRisk).toBe(0);
      expect(result.summary.clientsWithoutActivity).toBe(0);
      expect(result.attention).toEqual([]);
    });

    it('excludes archived clients from main counts', async () => {
      await service.getCoachDashboard(mockMember);

      const call = prisma.client.findMany.mock.calls[0]?.[0] as {
        where?: { operationalStatus?: unknown };
      };
      expect(call.where?.operationalStatus).toEqual({
        not: ClientOperationalStatus.archived,
      });
    });

    it('classifies a future active plan as future_plan', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [
            createAssignment({ startDate: new Date('2026-05-25T06:00:00.000Z') }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.attention[0]).toMatchObject({
        status: 'future_plan',
        nextExpectedSessionDate: '2026-05-25',
      });
      expect(result.summary.clientsAtRisk).toBe(0);
    });

    it('classifies a plan beyond durationWeeks as plan_finished', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [
            createAssignment({
              startDate: new Date('2026-05-01T06:00:00.000Z'),
              assignedPlan: createPlan({ durationWeeks: 1 }),
            }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.attention[0]).toMatchObject({ status: 'plan_finished' });
    });

    it.each([
      ClientSessionStatus.completed,
      ClientSessionStatus.partially_completed,
    ])('classifies %s activity in the last 7 days as up_to_date', async (status) => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [createAssignment()],
          sessionLogs: [
            createLog({
              status,
              scheduledDate: new Date('2026-05-19T00:00:00.000Z'),
              completedAt: new Date('2026-05-19T15:00:00.000Z'),
            }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.clientsUpToDate).toBe(1);
      expect(result.attention).toEqual([]);
    });

    it.each([
      ClientSessionStatus.opened,
      ClientSessionStatus.in_progress,
    ])('%s only does not count as up_to_date', async (status) => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [createAssignment()],
          sessionLogs: [createLog({ status })],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.clientsUpToDate).toBe(0);
    });

    it('classifies expected sessions in last 7 days with no completion as at_risk', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [createAssignment()],
          sessionLogs: [
            createLog({
              scheduledDate: new Date('2026-05-12T00:00:00.000Z'),
              completedAt: new Date('2026-05-12T15:00:00.000Z'),
            }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.clientsAtRisk).toBe(1);
      expect(result.attention[0]).toMatchObject({
        status: 'at_risk',
        nextExpectedSessionDate: '2026-05-18',
      });
    });

    it('classifies expected sessions in last 14 days with no completion as without_activity', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [
            createAssignment({
              assignedPlan: createPlan({
                weeks: [
                  createWeek({
                    weekNumber: 1,
                    days: [createDay(DayOfWeek.friday)],
                  }),
                  createWeek({
                    weekNumber: 2,
                    days: [createDay(DayOfWeek.friday)],
                  }),
                ],
              }),
            }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.clientsWithoutActivity).toBe(1);
      expect(result.attention[0]).toMatchObject({ status: 'without_activity' });
    });

    it('without_activity wins over at_risk', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({ planAssignments: [createAssignment()] }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.attention[0].status).toBe('without_activity');
      expect(result.summary.clientsAtRisk).toBe(0);
      expect(result.summary.clientsWithoutActivity).toBe(1);
    });

    it('rest days do not count as expected sessions', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [
            createAssignment({
              assignedPlan: createPlan({
                weeks: [
                  createWeek({
                    weekNumber: 1,
                    days: [
                      createDay(DayOfWeek.monday, {
                        dayType: TrainingDayType.rest,
                        session: null,
                      }),
                    ],
                  }),
                ],
              }),
            }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.clientsAtRisk).toBe(0);
      expect(result.summary.clientsWithoutActivity).toBe(0);
      expect(result.attention).toEqual([]);
    });

    it('sessionsCompletedThisWeek counts completed and partially_completed', async () => {
      prisma.client.findMany.mockResolvedValue([
        createClient({
          planAssignments: [createAssignment()],
          sessionLogs: [
            createLog({ status: ClientSessionStatus.completed }),
            createLog({ status: ClientSessionStatus.partially_completed }),
            createLog({ status: ClientSessionStatus.opened }),
          ],
        }),
      ]);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.summary.sessionsCompletedThisWeek).toBe(2);
    });

    it('includes onboarding stats in the coach dashboard', async () => {
      prisma.client.count.mockResolvedValue(2);
      prisma.trainingPlan.count.mockResolvedValue(1);
      prisma.clientAccess.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      prisma.clientTrainingPlanAssignment.count.mockResolvedValue(1);

      const result = await service.getCoachDashboard(mockMember);

      expect(result.onboarding).toEqual({
        totalClients: 2,
        totalPlans: 1,
        clientsWithPlan: 1,
        clientsWithoutPlan: 1,
        clientsWithAccess: 1,
        checklist: {
          hasCreatedClient: true,
          hasCreatedOrSelectedPlan: true,
          hasAssignedPlan: true,
          hasGeneratedAccess: true,
          hasPreviewedPortal: false,
        },
      });
    });
  });
});

function createClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    name: 'Client',
    operationalStatus: ClientOperationalStatus.active,
    planAssignments: [],
    sessionLogs: [],
    ...overrides,
  };
}

function createAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-1',
    assignedPlanId: 'assigned-plan-1',
    startDate: new Date('2026-05-11T06:00:00.000Z'),
    endedAt: null,
    status: ClientTrainingPlanAssignmentStatus.active,
    assignedPlan: createPlan(),
    ...overrides,
  };
}

function createPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assigned-plan-1',
    name: 'Base plan',
    durationWeeks: 4,
    weeks: [
      createWeek({ weekNumber: 1 }),
      createWeek({ weekNumber: 2 }),
    ],
    ...overrides,
  };
}

function createWeek(overrides: Record<string, unknown> = {}) {
  return {
    id: 'week-1',
    weekNumber: 1,
    days: [createDay(DayOfWeek.monday)],
    ...overrides,
  };
}

function createDay(
  dayOfWeek: DayOfWeek,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `day-${dayOfWeek}`,
    dayOfWeek,
    dayOrder: 1,
    dayType: TrainingDayType.training,
    session: { id: `session-${dayOfWeek}`, name: `${dayOfWeek} session` },
    ...overrides,
  };
}

function createLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    assignmentId: 'assignment-1',
    trainingSessionId: 'session-monday',
    scheduledDate: new Date('2026-05-18T00:00:00.000Z'),
    status: ClientSessionStatus.completed,
    completedAt: new Date('2026-05-18T15:00:00.000Z'),
    ...overrides,
  };
}
