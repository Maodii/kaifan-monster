"""Generate portable common-Han readings using macOS system CoreFoundation/ICU.

No package installation, network, per-recipe text table or runtime native dependency.
The generated source is checked in and works on ArkTS and Node. Culinary/polyphone
context overrides belong to recipe-search-core.ts, not this character dictionary.
"""
import ctypes
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

if sys.platform != 'darwin':
    raise SystemExit('Regeneration requires macOS; runtime uses the existing portable source.')

cf = ctypes.CDLL('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
cf.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
cf.CFStringCreateWithCString.restype = ctypes.c_void_p
cf.CFStringCreateMutableCopy.argtypes = [ctypes.c_void_p, ctypes.c_long, ctypes.c_void_p]
cf.CFStringCreateMutableCopy.restype = ctypes.c_void_p
cf.CFStringTransform.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_bool]
cf.CFStringTransform.restype = ctypes.c_bool
cf.CFStringGetCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_long, ctypes.c_uint32]
cf.CFStringGetCString.restype = ctypes.c_bool
cf.CFRelease.argtypes = [ctypes.c_void_p]
transform = ctypes.c_void_p.in_dll(cf, 'kCFStringTransformMandarinLatin').value
groups = defaultdict(list)
for start in range(0x4E00, 0xA000, 1024):
    chars = [chr(code) for code in range(start, min(start + 1024, 0xA000))]
    source = cf.CFStringCreateWithCString(None, '|'.join(chars).encode(), 0x08000100)
    mutable = cf.CFStringCreateMutableCopy(None, 0, source)
    try:
        if not cf.CFStringTransform(mutable, None, transform, False):
            raise RuntimeError('System Han transliteration failed')
        buffer = ctypes.create_string_buffer(65536)
        if not cf.CFStringGetCString(mutable, buffer, len(buffer), 0x08000100):
            raise RuntimeError('Transliteration output exceeded buffer')
        readings = buffer.value.decode().split('|')
        if len(chars) != len(readings):
            raise RuntimeError('Character/readings alignment failed')
        for char, reading in zip(chars, readings):
            normalized = ''.join(c for c in unicodedata.normalize('NFD', reading) if not unicodedata.combining(c)).replace(' ', '')
            if re.fullmatch('[a-z]+', normalized):
                groups[normalized].append(char)
    finally:
        cf.CFRelease(mutable)
        cf.CFRelease(source)

root = Path(__file__).resolve().parent.parent
target = root / 'backend/src/search-pinyin-data.ts'
lines = ['/** Generated common-Han readings from system ICU; see scripts/generate-search-pinyin.py. */', 'export const SEARCH_PINYIN_GROUPS: string[] = [']
lines.extend(' ' + json.dumps(reading + ':' + ''.join(chars), ensure_ascii=False) + ',' for reading, chars in sorted(groups.items()))
lines.append('];\n')
target.write_text('\n'.join(lines))
print(f'Generated {sum(map(len, groups.values()))} character readings / {len(groups)} syllables / {target.stat().st_size} bytes')
