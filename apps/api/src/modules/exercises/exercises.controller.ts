import { Controller, Get } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get('status')
  getStatus() {
    return this.exercisesService.getStatus();
  }
}
