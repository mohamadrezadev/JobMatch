import { Module } from "@nestjs/common";
import { ResumeService } from "./resume.service";
import { ResumeController, ResumesController } from "./resume.controller";

@Module({
  providers: [ResumeService],
  controllers: [ResumeController, ResumesController],
})
export class ResumeModule {}
