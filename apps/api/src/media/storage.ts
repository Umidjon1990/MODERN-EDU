import { ServiceUnavailableException } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppEnv } from '../config/env.js';

export interface StorageProvider {
  readonly configured: boolean;
  presignUpload(key: string, contentType: string): Promise<string>;
  presignDownload(key: string): Promise<string>;
  head(key: string): Promise<{ size?: number; contentType?: string }>;
}

export const STORAGE = Symbol('STORAGE');

class S3Storage implements StorageProvider {
  readonly configured = true;
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  presignUpload(key: string, contentType: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 900 },
    );
  }

  presignDownload(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 3600,
    });
  }

  async head(key: string): Promise<{ size?: number; contentType?: string }> {
    const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return { size: res.ContentLength, contentType: res.ContentType };
  }
}

class DisabledStorage implements StorageProvider {
  readonly configured = false;
  private fail(): never {
    throw new ServiceUnavailableException('Fayl xizmati sozlanmagan (S3_* o‘zgaruvchilari yo‘q)');
  }
  presignUpload(): Promise<string> {
    return this.fail();
  }
  presignDownload(): Promise<string> {
    return this.fail();
  }
  head(): Promise<{ size?: number; contentType?: string }> {
    return this.fail();
  }
}

export function createStorage(env: AppEnv): StorageProvider {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return new DisabledStorage();
  }
  const client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return new S3Storage(client, env.S3_BUCKET);
}
