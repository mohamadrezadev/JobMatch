import { Body, Controller, Module, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

class EventDto {
  @IsIn(["Job Viewed", "Resume Downloaded", "Source Job Opened"])
  declare name: string;
  @IsOptional() @IsUUID() resourceId?: string;
}
@Controller("api/analytics/events")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}
  @Post()
  record(@CurrentUser() user: { sub: string }, @Body() dto: EventDto) {
    return this.prisma.analyticsEvent.create({
      data: { userId: user.sub, ...dto },
    });
  }
}
@Module({ controllers: [AnalyticsController] })
export class AnalyticsModule {}
