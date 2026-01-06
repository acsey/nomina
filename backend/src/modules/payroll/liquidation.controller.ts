import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { LiquidationCalculatorService } from './services/liquidation-calculator.service';
import { LiquidationType } from '@/common/types/prisma-enums';
import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';

class CalculateLiquidationDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  terminationDate: string;

  @IsEnum(LiquidationType)
  type: LiquidationType;

  @IsOptional()
  @IsString()
  terminationReason?: string;

  @IsOptional()
  @IsBoolean()
  saveToDb?: boolean;
}

@Controller('liquidations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiquidationController {
  constructor(private readonly liquidationService: LiquidationCalculatorService) {}

  /**
   * Preview liquidation calculation (without saving)
   */
  @Post('calculate')
  @Roles('admin', 'company_admin', 'rh')
  async calculate(@Body() dto: CalculateLiquidationDto) {
    const result = await this.liquidationService.saveLiquidation({
      employeeId: dto.employeeId,
      terminationDate: dto.terminationDate,
      type: dto.type,
      terminationReason: dto.terminationReason,
      saveToDb: dto.saveToDb ?? false,
    });
    return result;
  }

  /**
   * Create and save liquidation
   */
  @Post()
  @Roles('admin', 'company_admin', 'rh')
  async create(@Body() dto: CalculateLiquidationDto) {
    return this.liquidationService.saveLiquidation({
      employeeId: dto.employeeId,
      terminationDate: dto.terminationDate,
      type: dto.type,
      terminationReason: dto.terminationReason,
      saveToDb: true,
    });
  }

  /**
   * Get liquidation by ID
   */
  @Get(':id')
  @Roles('admin', 'company_admin', 'rh')
  async getById(@Param('id') id: string) {
    return this.liquidationService.getLiquidation(id);
  }

  /**
   * Get all liquidations for an employee
   */
  @Get('employee/:employeeId')
  @Roles('admin', 'company_admin', 'rh')
  async getByEmployee(@Param('employeeId') employeeId: string) {
    return this.liquidationService.getEmployeeLiquidations(employeeId);
  }

  /**
   * Approve a liquidation
   */
  @Post(':id/approve')
  @Roles('admin', 'company_admin')
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.liquidationService.approveLiquidation(id, req.user.id);
  }

  /**
   * Mark liquidation as paid
   */
  @Post(':id/pay')
  @Roles('admin', 'company_admin')
  async pay(@Param('id') id: string) {
    return this.liquidationService.markAsPaid(id);
  }

  /**
   * Cancel a liquidation
   */
  @Post(':id/cancel')
  @Roles('admin', 'company_admin')
  async cancel(@Param('id') id: string) {
    return this.liquidationService.cancelLiquidation(id);
  }
}
