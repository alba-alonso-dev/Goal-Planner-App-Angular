import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GoalDto, MilestoneDto } from './dto/goal.dto.js';
import { Goal } from './goal.entity.js';
import { assertValidGoalDates, resolveAchieved } from './goal.rules.js';
import { Milestone } from './milestone.entity.js';

/** Todas las operaciones se limitan a los goals del usuario indicado. */
@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal) private readonly goals: Repository<Goal>,
    @Inject(DataSource) private readonly dataSource: DataSource
  ) {}

  /** A diferencia de la API anterior, el listado ya incluye los milestones. */
  findAll(userId: number): Promise<Goal[]> {
    return this.goals.find({
      where: { userId },
      relations: { milestones: true },
      order: { endDate: 'ASC', id: 'ASC' }
    });
  }

  async findOne(userId: number, id: number): Promise<Goal> {
    const goal = await this.goals.findOne({ where: { id, userId }, relations: { milestones: true } });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  async create(userId: number, dto: GoalDto): Promise<Goal> {
    assertValidGoalDates(dto);
    const goal = this.goals.create({
      userId,
      ...this.fields(dto),
      milestones: (dto.milestones ?? []).map((m, position) => this.milestoneFields(m, position))
    });
    const saved = await this.goals.save(goal);
    return this.findOne(userId, saved.id);
  }

  /**
   * Reemplaza el goal y su lista de milestones: se actualizan los que traen id, se crean los nuevos
   * y se borran los que ya no aparecen. Todo en una transacción.
   */
  async update(userId: number, id: number, dto: GoalDto): Promise<Goal> {
    assertValidGoalDates(dto);
    await this.dataSource.transaction(async manager => {
      const goal = await manager.findOne(Goal, { where: { id, userId }, relations: { milestones: true } });
      if (!goal) throw new NotFoundException('Goal not found');

      const existing = new Map(goal.milestones.map(m => [m.id, m]));
      const incoming = dto.milestones ?? [];
      for (const m of incoming) {
        if (m.milestoneId && !existing.has(m.milestoneId)) {
          throw new BadRequestException(`Milestone ${m.milestoneId} does not belong to this goal`);
        }
      }

      Object.assign(goal, this.fields(dto));
      goal.milestones = incoming.map((m, position) =>
        Object.assign(m.milestoneId ? existing.get(m.milestoneId)! : new Milestone(), this.milestoneFields(m, position))
      );
      await manager.save(goal);
    });
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.goals.remove(await this.findOne(userId, id));
  }

  private fields(dto: GoalDto): Partial<Goal> {
    return {
      name: dto.goalName,
      description: dto.description ?? '',
      startDate: dto.startDate,
      endDate: dto.endDate,
      isAchieved: resolveAchieved(dto.milestones ?? [], dto.isAchieved ?? false)
    };
  }

  private milestoneFields(m: MilestoneDto, position: number): Partial<Milestone> {
    return {
      name: m.milestoneName,
      description: m.description ?? '',
      targetDate: m.targetDate,
      isCompleted: m.isCompleted ?? false,
      position
    };
  }
}
