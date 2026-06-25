import { Controller, Get } from '@nestjs/common';

// Лёгкий public-эндпоинт для healthcheck'ов Docker / Nginx / аптайм-мониторинга.
// Без guard'ов — должен отвечать без авторизации.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
