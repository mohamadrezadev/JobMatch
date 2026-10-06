import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { OnboardingController } from "./onboarding.controller";

@Module({
  providers: [UsersService],
  controllers: [UsersController, OnboardingController],
  exports: [UsersService],
})
export class UsersModule {}
