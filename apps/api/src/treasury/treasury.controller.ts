import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CashCloseSchema,
  RecordCashMovementSchema,
  RecordExpenseSchema,
  TransferSchema,
  type AuthContext,
  type CashAccount,
  type CashCloseInput,
  type RecordCashMovementInput,
  type RecordExpenseInput,
  type TransferInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TreasuryService } from './treasury.service';

@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasury: TreasuryService) {}

  @RequireCapabilities('treasury:read')
  @Get('balances')
  balances(@CurrentUser() user: AuthContext) {
    return this.treasury.balances(user);
  }

  @RequireCapabilities('treasury:read')
  @Get('movements')
  movements(@CurrentUser() user: AuthContext, @Query('compte') compte?: CashAccount) {
    return this.treasury.listMovements(user, compte);
  }

  @RequireCapabilities('treasury:write')
  @Post('expenses')
  expense(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(RecordExpenseSchema)) dto: RecordExpenseInput,
  ) {
    return this.treasury.recordExpense(user, dto);
  }

  @RequireCapabilities('treasury:write')
  @Post('movements')
  movement(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(RecordCashMovementSchema)) dto: RecordCashMovementInput,
  ) {
    return this.treasury.recordMovement(user, dto);
  }

  @RequireCapabilities('treasury:write')
  @Post('transfers')
  transfer(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(TransferSchema)) dto: TransferInput,
  ) {
    return this.treasury.transfer(user, dto);
  }

  // Clôture de caisse — autorisée au caissier (cash:close).
  @RequireCapabilities('cash:close')
  @Post('close')
  close(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CashCloseSchema)) dto: CashCloseInput,
  ) {
    return this.treasury.close(user, dto);
  }
}
