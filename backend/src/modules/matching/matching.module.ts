import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';

@Module({
  providers: [MatchingService],
  controllers: [MatchingController],
})
export class MatchingModule {}
