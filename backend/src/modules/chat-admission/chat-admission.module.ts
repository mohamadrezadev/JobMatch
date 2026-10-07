import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ChatAdmissionService } from "./chat-admission.service";
@Module({
  imports: [PrismaModule],
  providers: [ChatAdmissionService],
  exports: [ChatAdmissionService],
})
export class ChatAdmissionModule {}
