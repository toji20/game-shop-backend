import { Controller } from '@nestjs/common';
import { DonatehubSteamService } from './donatehub-steam.service';

@Controller('donatehub-steam')
export class DonatehubSteamController {
  constructor(private readonly donatehubSteamService: DonatehubSteamService) {}
}
