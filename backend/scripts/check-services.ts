import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import Redis from 'ioredis';
import {
  S3Client, HeadBucketCommand, CreateBucketCommand,
  PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';

@Module({})
class EnvironmentSmokeModule {}

async function main(): Promise<void> {
  const app = await NestFactory.create(EnvironmentSmokeModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  await app.close();
  console.log('PASS NestJS: application boot and shutdown');

  const pg = new Client({
    host: '127.0.0.1', port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER, database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
  });
  try {
    await pg.connect();
    await pg.query('BEGIN');
    await pg.query('CREATE TEMP TABLE env_probe (value text) ON COMMIT DROP');
    await pg.query('INSERT INTO env_probe VALUES ($1)', ['shiku']);
    const result = await pg.query('SELECT value FROM env_probe');
    if (result.rows[0]?.value !== 'shiku') throw new Error('PostgreSQL read mismatch');
    await pg.query('COMMIT');
    console.log('PASS PostgreSQL: authenticated transaction/write/read');
  } finally { await pg.end(); }

  const redis = new Redis({
    host: '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD, lazyConnect: true,
    maxRetriesPerRequest: 1, retryStrategy: () => null,
  });
  const key = `shiku:env-check:${randomUUID()}`;
  try {
    await redis.connect();
    await redis.set(key, 'ok', 'EX', 30);
    if (await redis.get(key) !== 'ok') throw new Error('Redis read mismatch');
    await redis.del(key);
    console.log('PASS Redis: authenticated write/read/delete');
  } finally { redis.disconnect(); }

  const s3 = new S3Client({
    endpoint: `http://127.0.0.1:${process.env.MINIO_PORT || 9000}`,
    region: 'us-east-1', forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER!,
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
    },
  });
  const Bucket = process.env.S3_BUCKET || 'shiku-photos';
  const Key = `_environment-check/${randomUUID()}.txt`;
  let uploaded = false;
  try {
    try { await s3.send(new HeadBucketCommand({ Bucket })); }
    catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
      await s3.send(new CreateBucketCommand({ Bucket }));
    }
    const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket, Key, ContentType: 'text/plain' }), { expiresIn: 60 });
    const response = await fetch(url, { method: 'PUT', body: 'shiku-environment-ok', headers: { 'Content-Type': 'text/plain' } });
    if (!response.ok) throw new Error(`Presigned upload HTTP ${response.status}`);
    uploaded = true;
    const object = await s3.send(new GetObjectCommand({ Bucket, Key }));
    if (await object.Body?.transformToString() !== 'shiku-environment-ok') throw new Error('S3 read mismatch');
  } finally {
    if (uploaded) await s3.send(new DeleteObjectCommand({ Bucket, Key }));
    s3.destroy();
  }
  console.log('PASS MinIO: private bucket/presigned upload/read/delete');
}

main().catch((error: unknown) => {
  console.error('Environment check failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
