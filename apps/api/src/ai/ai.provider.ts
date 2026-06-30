import { ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { AppEnv } from '../config/env.js';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type CompletionRequest = { system: string; user: string; model: string };
export type CompletionResult = {
  text: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
};

export interface AiProvider {
  readonly enabled: boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

class ClaudeProvider implements AiProvider {
  readonly enabled = true;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const res = await this.client.messages.create({
      model: req.model,
      max_tokens: 1024,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    });
    const text = res.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
    return {
      text,
      model: res.model,
      tokensIn: res.usage?.input_tokens,
      tokensOut: res.usage?.output_tokens,
    };
  }
}

class DisabledAiProvider implements AiProvider {
  readonly enabled = false;
  complete(): Promise<CompletionResult> {
    throw new ServiceUnavailableException('AI yoqilmagan (ANTHROPIC_API_KEY yo‘q)');
  }
}

export function createAiProvider(env: AppEnv): AiProvider {
  return env.ANTHROPIC_API_KEY
    ? new ClaudeProvider(env.ANTHROPIC_API_KEY)
    : new DisabledAiProvider();
}
