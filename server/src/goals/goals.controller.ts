import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { GoalDto } from './dto/goal.dto.js';
import { toGoalResponse, GoalResponse } from './goal.mapper.js';
import { GoalsService } from './goals.service.js';

@Controller('goals')
export class GoalsController {
  constructor(@Inject(GoalsService) private readonly goals: GoalsService) {}

  @Get()
  async findAll(@CurrentUserId() userId: number): Promise<GoalResponse[]> {
    return (await this.goals.findAll(userId)).map(toGoalResponse);
  }

  @Get(':id')
  async findOne(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.findOne(userId, id));
  }

  @Post()
  async create(@CurrentUserId() userId: number, @Body() dto: GoalDto): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.create(userId, dto));
  }

  @Put(':id')
  async update(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GoalDto
  ): Promise<GoalResponse> {
    return toGoalResponse(await this.goals.update(userId, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.goals.remove(userId, id);
  }
}
