import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestUserContext {
  userId?: string;
  role?: string;
  fullName?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestUserContext>();

  run<T>(ctx: RequestUserContext, callback: () => T): T {
    return this.storage.run(ctx, callback);
  }

  setContext(ctx: RequestUserContext): void {
    const store = this.storage.getStore() || {};
    Object.assign(store, ctx);
  }

  getContext(): RequestUserContext {
    return this.storage.getStore() || {};
  }
}


