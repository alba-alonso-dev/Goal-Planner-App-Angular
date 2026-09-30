import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator';
import { IsDateOnly, Trim } from '../../common/validation.js';

export class MilestoneDto {
  /** Id de un milestone existente del goal; 0 o ausente para uno nuevo. */
  @IsOptional()
  @IsInt()
  @Min(0)
  milestoneId?: number;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  milestoneName!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateOnly()
  targetDate!: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

/** Cuerpo para crear o reemplazar (PUT) un goal con sus milestones. */
export class GoalDto {
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  goalName!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateOnly()
  startDate!: string;

  @IsDateOnly()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  isAchieved?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];
}
