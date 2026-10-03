import { Controller, Get } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('api/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async listAll() {
    return this.skillsService.listAll();
  }
}
