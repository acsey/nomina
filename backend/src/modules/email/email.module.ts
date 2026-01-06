import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { SystemConfigModule } from '@/modules/system-config/system-config.module';

@Global()
@Module({
  imports: [SystemConfigModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
