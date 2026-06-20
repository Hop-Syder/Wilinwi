import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthContext } from '@wilinwi/types';
import { ActivityService } from './activity.service';

// Routes déjà journalisées sémantiquement ailleurs (évite les doublons).
const SKIP = [/\/api\/sync\//, /\/api\/auth\/pin-login/];

/**
 * Journalise automatiquement les mutations réussies (POST/PATCH/PUT/DELETE)
 * avec l'utilisateur et la route. Les actions clés ont aussi un log sémantique
 * dédié dans les services (action explicite + entityId).
 */
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly activity: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const url: string = req.originalUrl ?? req.url ?? '';
    const mutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(() => {
        const user = req.user as AuthContext | undefined;
        if (!mutating || !user || SKIP.some((re) => re.test(url))) return;
        void this.activity.log({
          tenantId: user.tenantId,
          userId: user.userId,
          action: `${method} ${url.split('?')[0]}`,
          ip: req.ip,
        });
      }),
    );
  }
}
