import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClientAccessStatus,
  ClientOperationalStatus,
  ClientSessionStatus,
  ClientTrainingPlanAssignmentStatus,
  TrainingPlanType,
  type OrganizationMember,
} from 'db';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  addDays,
  classifyClientActivity,
  getCurrentWeekRange,
  toLocalDateKey,
  toDateKeyFromUtcDate,
  toScheduledDate,
  type CoachAttentionStatus,
  type DashboardClient,
} from './dashboard-activity';

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus() {
    return { module: 'dashboard', status: 'ready' };
  }

  async getOnboardingStats(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;

    const [
      totalClients,
      totalPlans,
      clientsWithAccessCount,
      clientsWithPortalPreviewCount,
    ] =
      await this.prismaService.$transaction([
        this.prismaService.client.count({ where: { organizationId } }),
        this.prismaService.trainingPlan.count({
          where: {
            organizationId,
            planType: TrainingPlanType.template,
          },
        }),
        this.prismaService.clientAccess.count({
          where: {
            status: { not: ClientAccessStatus.disabled },
            client: { organizationId },
          },
        }),
        this.prismaService.clientAccess.count({
          where: {
            lastAccessAt: { not: null },
            client: { organizationId },
          },
        }),
      ]);

    const clientsWithPlan = await this.prismaService.clientTrainingPlanAssignment.count({
      where: {
        status: ClientTrainingPlanAssignmentStatus.active,
        client: { organizationId },
      },
    });

    return {
      totalClients,
      totalPlans,
      clientsWithPlan,
      clientsWithoutPlan: totalClients - clientsWithPlan,
      clientsWithAccess: clientsWithAccessCount,
      checklist: {
        hasCreatedClient: totalClients > 0,
        hasCreatedOrSelectedPlan: totalPlans > 0,
        hasAssignedPlan: clientsWithPlan > 0,
        hasGeneratedAccess: clientsWithAccessCount > 0,
        hasPreviewedPortal: clientsWithPortalPreviewCount > 0,
      },
    };
  }

  async getCoachDashboard(member: OrganizationMember | undefined) {
    if (!member) {
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = member.organizationId;
    const generatedAt = new Date();
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const timezone = organization?.timezone ?? 'America/Mexico_City';
    const todayKey = toLocalDateKey(generatedAt, timezone);
    const last7StartKey = addDays(todayKey, -6);
    const last14StartKey = addDays(todayKey, -13);
    const weekRange = getCurrentWeekRange(todayKey);
    const queryStartDate = toScheduledDate(last14StartKey);
    const queryEndDate = toScheduledDate(weekRange.end > todayKey ? weekRange.end : todayKey);

    const [clients, onboarding] = await Promise.all([
      this.prismaService.client.findMany({
        where: {
          organizationId,
          operationalStatus: { not: ClientOperationalStatus.archived },
        },
        include: {
          planAssignments: {
            where: {
              status: {
                in: [
                  ClientTrainingPlanAssignmentStatus.active,
                  ClientTrainingPlanAssignmentStatus.finished,
                ],
              },
            },
            orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
            take: 2,
            include: {
              assignedPlan: {
                include: {
                  weeks: {
                    orderBy: { weekNumber: 'asc' },
                    include: {
                      days: {
                        orderBy: [{ dayOrder: 'asc' }, { dayOfWeek: 'asc' }],
                        include: { session: true },
                      },
                    },
                  },
                },
              },
            },
          },
          sessionLogs: {
            where: {
              scheduledDate: {
                gte: queryStartDate,
                lte: queryEndDate,
              },
            },
            orderBy: { scheduledDate: 'desc' },
          },
        },
      }),
      this.getOnboardingStats(member),
    ]);

    const summary = {
      activeClients: 0,
      clientsWithoutPlan: 0,
      clientsUpToDate: 0,
      clientsAtRisk: 0,
      clientsWithoutActivity: 0,
      pausedClients: 0,
      inactiveClients: 0,
      sessionsCompletedThisWeek: 0,
    };
    const attention: Array<{
      clientId: string;
      name: string;
      status: CoachAttentionStatus;
      reason: string;
      lastCompletedSessionAt: Date | null;
      nextExpectedSessionDate: string | null;
      currentPlan: {
        assignmentId: string;
        assignedPlanId: string;
        name: string;
        startDate: Date;
      } | null;
    }> = [];

    for (const client of clients as DashboardClient[]) {
      summary.sessionsCompletedThisWeek += client.sessionLogs.filter((log) => {
        if (
          log.status !== ClientSessionStatus.completed &&
          log.status !== ClientSessionStatus.partially_completed
        ) {
          return false;
        }

        const dateKey = toDateKeyFromUtcDate(log.scheduledDate);

        return dateKey >= weekRange.start && dateKey <= weekRange.end;
      }).length;

      const classification = classifyClientActivity(client, {
        todayKey,
        last7StartKey,
        last14StartKey,
      });

      if (client.operationalStatus === ClientOperationalStatus.active) {
        summary.activeClients += 1;
      }

      if (classification.status === 'paused') {
        summary.pausedClients += 1;
        continue;
      }

      if (classification.status === 'inactive') {
        summary.inactiveClients += 1;
        continue;
      }

      if (classification.status === 'without_plan') {
        summary.clientsWithoutPlan += 1;
      }

      if (classification.status === 'up_to_date') {
        summary.clientsUpToDate += 1;
        continue;
      }

      if (classification.status === 'at_risk') {
        summary.clientsAtRisk += 1;
      }

      if (classification.status === 'without_activity') {
        summary.clientsWithoutActivity += 1;
      }

      attention.push({
        clientId: client.id,
        name: client.name,
        status: classification.status,
        reason: classification.reason,
        lastCompletedSessionAt: classification.lastCompletedSessionAt,
        nextExpectedSessionDate: classification.nextExpectedSessionDate,
        currentPlan: classification.currentPlan,
      });
    }

    return {
      timezone,
      generatedAt: generatedAt.toISOString(),
      summary,
      attention,
      onboarding,
    };
  }
}
