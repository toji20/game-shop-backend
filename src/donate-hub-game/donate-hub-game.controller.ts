import { Controller } from '@nestjs/common';
import { DonatehubGameService } from './donate-hub-game.service';

@Controller('donate-hub-game')
export class DonateHubGameController {
  constructor(private readonly donateHubGameService: DonatehubGameService) {}
}
