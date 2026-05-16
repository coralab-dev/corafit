import { Module } from '@nestjs/common';
import { ExerciseMediaService } from './exercise-media.service';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  controllers: [ExercisesController],
  providers: [ExerciseMediaService, ExercisesService],
  exports: [ExerciseMediaService, ExercisesService],
})
export class ExercisesModule {}
