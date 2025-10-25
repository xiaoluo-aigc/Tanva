import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { normalizePhone } from './phone-normalizer';

export class SmsLoginDto {
  @ApiProperty({ description: '手机号（必填）' })
  @Transform(normalizePhone)
  @IsString()
  @Matches(/^1[3-9]\d{9}$/,{ message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({ description: '短信验证码' })
  code!: string;
}
