import { Controller, Get } from '@nestjs/common';
import { TrainingPlansService } from './training-plans.service';

@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Get('status')
  getStatus() {
    return this.trainingPlansService.getStatus();
  }
}
