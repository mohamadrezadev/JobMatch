import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { CompleteOnboardingDto } from "./dto/onboarding.dto";

@Controller("api/onboarding")
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly users: UsersService) {}
  @Post("complete")
  complete(
    @CurrentUser() user: { sub: string },
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.users.completeOnboarding(user.sub, dto);
  }
}
