import { Module } from '@nestjs/common';
import {
  SessionExerciseAlternativesController,
  SessionExercisesController,
  TrainingPlanDaysController,
  TrainingPlansController,
  TrainingSessionsController,
} from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  controllers: [
    TrainingPlansController,
    TrainingPlanDaysController,
    TrainingSessionsController,
    SessionExercisesController,
    SessionExerciseAlternativesController,
  ],
  providers: [TrainingPlansService],
})
export class TrainingPlansModule {}
