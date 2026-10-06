import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { SearchJobsDto } from "./dto/jobs.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("api/jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}
  @Get()
  list(@Query() dto: SearchJobsDto) {
    return this.jobsService.search(dto);
  }
  @Post("search")
  search(@Body() dto: SearchJobsDto) {
    return this.jobsService.search(dto);
  }
  @Get("search")
  @UseGuards(JwtAuthGuard)
  searchQuery(
    @Query() dto: SearchJobsDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.jobsService.search(dto, user.sub);
  }
  @Get("recommended")
  @UseGuards(JwtAuthGuard)
  recommended(@CurrentUser() user: { sub: string }) {
    return this.jobsService.getRecommended(user.sub);
  }
  @Get(":id")
  getById(@Param("id") id: string) {
    return this.jobsService.getById(id);
  }
}
