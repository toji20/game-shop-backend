import { ManualStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateManualStatusDto {
  @IsEnum(ManualStatus, {
    message:
      'Статус должен быть одним из: ' + Object.values(ManualStatus).join(', '),
  })
  status: ManualStatus;

  @IsOptional()
  @IsString()
  comment?: string; // необязательный комментарий сотрудника
}

export class Provide2FADto {
  @IsString({ message: '2FA код обязателен' })
  code: string;
}
