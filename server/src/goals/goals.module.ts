import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from './goal.entity.js';
import { Milestone } from './milestone.entity.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Goal, Milestone])],
  controllers: [GoalsController],
  providers: [GoalsService]
})
export class GoalsModule {}
