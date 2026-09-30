import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertDateOrder } from '../common/validation.js';
import { TaskDto } from './dto/task.dto.js';
import { Task } from './task.entity.js';

/** Todas las operaciones se limitan a las tareas del usuario indicado (autorización por propietario). */
@Injectable()
export class TasksService {
  constructor(@InjectRepository(Task) private readonly tasks: Repository<Task>) {}

  findAll(userId: number): Promise<Task[]> {
    return this.tasks.find({ where: { userId }, order: { dueDate: 'ASC', id: 'ASC' } });
  }

  /** 404 tanto si no existe como si es de otro usuario: no se revela qué ids existen. */
  async findOne(userId: number, id: number): Promise<Task> {
    const task = await this.tasks.findOneBy({ id, userId });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  create(userId: number, dto: TaskDto): Promise<Task> {
    assertDateOrder(dto.startDate, dto.dueDate, 'dueDate cannot be before startDate');
    return this.tasks.save(this.tasks.create({ userId, ...this.fields(dto) }));
  }

  async update(userId: number, id: number, dto: TaskDto): Promise<Task> {
    assertDateOrder(dto.startDate, dto.dueDate, 'dueDate cannot be before startDate');
    const task = await this.findOne(userId, id);
    return this.tasks.save(Object.assign(task, this.fields(dto)));
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.tasks.remove(await this.findOne(userId, id));
  }

  private fields(dto: TaskDto): Partial<Task> {
    return {
      name: dto.taskName,
      description: dto.description ?? '',
      frequency: dto.frequency,
      startDate: dto.startDate,
      dueDate: dto.dueDate,
      isCompleted: dto.isCompleted ?? false
    };
  }
}
