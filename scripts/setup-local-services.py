#!/usr/bin/env python3
"""Create private, local Compose env files from the checked-in examples."""
import os
from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parents[1]
RANDOM_FIELDS = {'POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'MINIO_ROOT_PASSWORD', 'JWT_SECRET', 'AI_GATEWAY_TOKEN'}


def create_private_config(template, target):
    lines = []
    for line in (ROOT / template).read_text().splitlines():
        field, _, value = line.partition('=')
        if field in RANDOM_FIELDS:
            line = f'{field}={secrets.token_urlsafe(48)}'
        lines.append(line)
    try:
        fd = os.open(ROOT / target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        print(f'保留已有 {target}')
        return
    with os.fdopen(fd, 'w', encoding='utf-8') as config:
        config.write('\n'.join(lines) + '\n')
    print(f'已创建 {target}（0600）')


if __name__ == '__main__':
    create_private_config('.env.example', '.env')
    create_private_config('.ai.env.example', '.ai.env')
