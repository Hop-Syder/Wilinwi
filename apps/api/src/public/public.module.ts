import { Module } from '@nestjs/common';
import { PublicReceiptController } from './public.controller';

@Module({
  controllers: [PublicReceiptController],
})
export class PublicModule {}
