import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateProfileDto, AddSkillDto } from "./dto/users.dto";
import { PreferencesDto } from "./dto/preferences.dto";

@Controller("api/users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("preferences")
  preferences(@CurrentUser() user: { sub: string }) {
    return this.usersService.getPreferences(user.sub);
  }

  @Put("preferences")
  async savePreferences(
    @CurrentUser() user: { sub: string },
    @Body() dto: PreferencesDto,
  ) {
    await this.usersService.updateProfile(user.sub, dto);
    return this.usersService.getPreferences(user.sub);
  }

  @Get("profile")
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.sub);
  }

  @Put("profile")
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get("skills")
  async getSkills(@CurrentUser() user: any) {
    return this.usersService.getUserSkills(user.sub);
  }

  @Post("skills")
  async addSkill(@CurrentUser() user: any, @Body() dto: AddSkillDto) {
    return this.usersService.addSkill(user.sub, dto);
  }

  @Delete("skills/:id")
  async removeSkill(@CurrentUser() user: any, @Param("id") id: string) {
    return this.usersService.removeSkill(user.sub, id);
  }
}
