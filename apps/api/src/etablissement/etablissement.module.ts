import { Module } from '@nestjs/common';
import { EtablissementController } from './etablissement.controller';
import { EtablissementService } from './etablissement.service';

@Module({
  controllers: [EtablissementController],
  providers: [EtablissementService],
  exports: [EtablissementService],
})
export class EtablissementModule {}
