import { Module } from '@nestjs/common';
import { GlossaryController } from './glossary.controller';
import { GLOSSARY_REPOSITORY } from './glossary.repository';
import { GlossaryService } from './glossary.service';
import { PrismaGlossaryRepository } from './prisma-glossary.repository';

@Module({
  controllers: [GlossaryController],
  providers: [
    GlossaryService,
    {
      provide: GLOSSARY_REPOSITORY,
      useClass: PrismaGlossaryRepository,
    },
  ],
})
export class GlossaryModule {}
