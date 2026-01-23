import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Lista de permisos del rol',
    example: ['employees:read:company', 'employees:write:company', 'vacations:read:company'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
