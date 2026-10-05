import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ChatModule } from "../chat/chat.module";
import { JobDiscoveryModule } from "../job-discovery/job-discovery.module";
import { ChatRunService } from "./chat-run.service";
import { ChatRunController } from "./chat-run.controller";

@Module({
  imports: [PrismaModule, ChatModule, JobDiscoveryModule],
  providers: [ChatRunService],
  controllers: [ChatRunController],
})
export class ChatRunsModule {}
