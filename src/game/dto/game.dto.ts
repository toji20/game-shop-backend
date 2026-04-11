import { OrderType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;
}

export class GameDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  ageLimit?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(OrderType, {
    message:
      'Статус должен быть одним из: ' + Object.values(OrderType).join(', '),
  })
  type: OrderType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItemDto[];
}
