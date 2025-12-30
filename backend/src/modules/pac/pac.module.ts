import { Module } from '@nestjs/common';
import { PacController } from './controllers/pac.controller';
import { PacService } from './services/pac.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SecurityModule } from '@/common/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [PacController],
  providers: [PacService],
  exports: [PacService],
})
export class PacModule {}
