import { Global, Module } from '@nestjs/common';
import { createDb, type Database } from '@modern-edu/db';
import { loadEnv } from '../config/env.js';

export const DRIZZLE = Symbol('DRIZZLE');
export const APP_ENV = Symbol('APP_ENV');

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: () => loadEnv(),
    },
    {
      provide: DRIZZLE,
      useFactory: (): Database => {
        const env = loadEnv();
        return createDb(env.DATABASE_URL);
      },
    },
  ],
  exports: [DRIZZLE, APP_ENV],
})
export class DbModule {}
