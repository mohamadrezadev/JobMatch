import { ChatModule } from './modules/chat';
import { JobDiscoveryModule } from './modules/job-discovery/job-discovery.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SkillsModule } from './modules/skills/skills.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MatchingModule } from './modules/matching/matching.module';
import { ResumeModule } from './modules/resume/resume.module';
import { FeedbackModule } from './modules/feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SkillsModule,
    JobsModule,
    MatchingModule,
    ResumeModule,
    FeedbackModule,
    ChatModule,
    JobDiscoveryModule,
  ],

})
export class AppModule {}
