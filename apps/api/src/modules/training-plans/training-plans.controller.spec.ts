import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingPlanDaysController, TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

type ServiceMock = {
  list: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  quickCreate: ReturnType<typeof vi.fn>;
  createManual: ReturnType<typeof vi.fn>;
  duplicate: ReturnType<typeof vi.fn>;
  duplicateWeek: ReturnType<typeof vi.fn>;
  copyDay: ReturnType<typeof vi.fn>;
};

const mockMember = {
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-1',
  role: 'owner' as const,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRequest = {
  organizationMember: mockMember,
} as unknown as Parameters<TrainingPlansController['list']>[1];

describe('TrainingPlansController', () => {
  let controller: TrainingPlansController;
  let service: ServiceMock;

  beforeEach(() => {
    service = {
      list: vi.fn(),
      getById: vi.fn(),
      quickCreate: vi.fn(),
      createManual: vi.fn(),
      duplicate: vi.fn(),
      duplicateWeek: vi.fn(),
      copyDay: vi.fn(),
    };
    controller = new TrainingPlansController(service as unknown as TrainingPlansService);
  });

  it('list delegates to service with member', async () => {
    service.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    await controller.list({}, mockRequest);

    expect(service.list).toHaveBeenCalledWith({}, mockMember);
  });

  it('getById delegates to service with planId and member', async () => {
    service.getById.mockResolvedValue({ id: 'plan-1' });

    await controller.getById('plan-1', mockRequest);

    expect(service.getById).toHaveBeenCalledWith('plan-1', mockMember);
  });

  it('quickCreate delegates to service with body and member', async () => {
    service.quickCreate.mockResolvedValue({ id: 'plan-1' });

    await controller.quickCreate(
      {
        name: 'Test',
        weeks: 4,
        daysPerWeek: [1, 3, 5],
        exercises: ['ex-1'],
      },
      mockRequest,
    );

    expect(service.quickCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test' }),
      mockMember,
    );
  });

  it('create delegates to service with body and member', async () => {
    service.createManual.mockResolvedValue({ id: 'plan-1' });

    await controller.create({ name: 'Test', durationWeeks: 4 }, mockRequest);

    expect(service.createManual).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test' }),
      mockMember,
    );
  });

  it('duplicate delegates to service with planId, body and member', async () => {
    service.duplicate.mockResolvedValue({ id: 'copy-1' });

    await controller.duplicate('plan-1', {}, mockRequest);

    expect(service.duplicate).toHaveBeenCalledWith('plan-1', {}, mockMember);
  });

  it('duplicateWeek delegates to service with planId, weekId and member', async () => {
    service.duplicateWeek.mockResolvedValue({ id: 'week-copy-1' });

    await controller.duplicateWeek('plan-1', 'week-1', mockRequest);

    expect(service.duplicateWeek).toHaveBeenCalledWith('plan-1', 'week-1', mockMember);
  });
});

describe('TrainingPlanDaysController', () => {
  let controller: TrainingPlanDaysController;
  let service: ServiceMock;

  beforeEach(() => {
    service = {
      list: vi.fn(),
      getById: vi.fn(),
      quickCreate: vi.fn(),
      createManual: vi.fn(),
      duplicate: vi.fn(),
      duplicateWeek: vi.fn(),
      copyDay: vi.fn(),
    };
    controller = new TrainingPlanDaysController(service as unknown as TrainingPlansService);
  });

  it('copyDay delegates to service with dayId, body and member', async () => {
    service.copyDay.mockResolvedValue({ id: 'day-copy-1' });

    await controller.copyDay('day-1', { dayOfWeek: 'wednesday' }, mockRequest);

    expect(service.copyDay).toHaveBeenCalledWith(
      'day-1',
      { dayOfWeek: 'wednesday' },
      mockMember,
    );
  });
});