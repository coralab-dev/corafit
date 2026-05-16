import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ExercisesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
