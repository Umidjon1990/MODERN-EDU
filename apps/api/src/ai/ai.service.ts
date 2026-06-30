import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { aiMessages, classes, type Database } from '@modern-edu/db';
import type { AccessTokenClaims, TutorResponse } from '@modern-edu/contracts';
import { DRIZZLE, APP_ENV } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';
import { MembershipService } from '../classes/membership.service.js';
import { AI_PROVIDER, type AiProvider } from './ai.provider.js';

@Injectable()
export class AiService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @Inject(APP_ENV) private readonly env: AppEnv,
    private readonly membership: MembershipService,
  ) {}

  async tutor(actor: AccessTokenClaims, classId: string, question: string): Promise<TutorResponse> {
    await this.membership.requireMembership(actor.sub, classId);

    const [cls] = await this.db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    const subject = cls?.subject ?? cls?.name ?? 'umumiy fan';

    const system = [
      'Sen "Modern Edu" platformasidagi do‘stona, sabrli AI-repetitorsan.',
      `Fan/mavzu: ${subject}.`,
      'O‘quvchiga tushunarli, qisqa va bosqichma-bosqich yordam ber.',
      'Faol baholanadigan test yoki nazorat ishi javoblarini to‘g‘ridan-to‘g‘ri berma — fikrlashga yo‘naltir.',
      'Hurmatli, yoshga mos ohangda va o‘zbek tilida javob ber.',
    ].join(' ');

    const result = await this.provider.complete({
      system,
      user: question,
      model: this.env.AI_MODEL,
    });

    await this.db.insert(aiMessages).values({
      orgId: actor.orgId,
      userId: actor.sub,
      classId,
      kind: 'tutor',
      question,
      answer: result.text,
      model: result.model,
      tokensIn: result.tokensIn ?? null,
      tokensOut: result.tokensOut ?? null,
    });

    return { answer: result.text, model: result.model };
  }
}
