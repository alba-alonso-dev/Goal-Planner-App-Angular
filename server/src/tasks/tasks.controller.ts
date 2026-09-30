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
import { TaskDto } from './dto/task.dto.js';
import { toTaskResponse, TaskResponse } from './task.mapper.js';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @Get()
  async findAll(@CurrentUserId() userId: number): Promise<TaskResponse[]> {
    return (await this.tasks.findAll(userId)).map(toTaskResponse);
  }

  @Get(':id')
  async findOne(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<TaskResponse> {
    return toTaskResponse(await this.tasks.findOne(userId, id));
  }

  @Post()
  async create(@CurrentUserId() userId: number, @Body() dto: TaskDto): Promise<TaskResponse> {
    return toTaskResponse(await this.tasks.create(userId, dto));
  }

  @Put(':id')
  async update(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TaskDto
  ): Promise<TaskResponse> {
    return toTaskResponse(await this.tasks.update(userId, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.tasks.remove(userId, id);
  }
}
