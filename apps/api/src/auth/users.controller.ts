import { Controller, Get } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @RequireCapabilities('sale:create')
  @Get()
  listForPos(@CurrentUser() user: AuthContext) {
    return this.prisma.forTenant(user.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: user.tenantId, actif: true },
        select: { id: true, nom: true, role: true },
        orderBy: { nom: 'asc' },
      }),
    );
  }
}
