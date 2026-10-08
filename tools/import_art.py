#!/usr/bin/env python3
"""
디자인 에셋 가져오기 — 원본 PNG(1254px 등)를 게임용 크기로 줄이고 public/art/ 에 저장한다.
사용법: python3 tools/import_art.py <원본 폴더> [<원본 폴더> ...]
- tools/asset_map.json 에 정의된 파일만 처리 (없는 파일은 경고만)
- 투명 여백을 잘라내고(trim), 종류별 최대 크기로 축소, 256색 팔레트로 압축
- public/art/manifest.json 에 key → 파일 목록을 합쳐서(merge) 기록 — 다음 팩도 같은 방식으로 추가
"""
import json
import os
import sys

from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'art')
MAP = json.load(open(os.path.join(ROOT, 'tools', 'asset_map.json'), encoding='utf-8'))
# 종류별 최대 변 길이 (게임 화면 2배 해상도 + 메뉴용 여유)
MAX = {'icon': 128, 'fx': 128, 'building': 288, 'cart': 192, 'node': 160, 'animal': 160, 'crop': 128, 'tile': 64, 'bg': 1280, 'ui': 256, 'char': 128, 'portrait': 160}


def find(srcs, name):
    for s in srcs:
        for dirpath, _, files in os.walk(s):
            if name in files:
                return os.path.join(dirpath, name)
    return None


def alpha_bbox(im):
    return im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()


def process(path, kind, enhance=None, crop=None):
    im = Image.open(path)
    if enhance:
        rgba = im.convert('RGBA')
        a = rgba.getchannel('A')
        rgb = rgba.convert('RGB')
        if 'brightness' in enhance:
            rgb = ImageEnhance.Brightness(rgb).enhance(enhance['brightness'])
        if 'color' in enhance:
            rgb = ImageEnhance.Color(rgb).enhance(enhance['color'])
        rgb.putalpha(a)
        im = rgb
    if kind in ('bg',):
        im = im.convert('RGB')
        im.thumbnail((MAX[kind], MAX[kind]), Image.LANCZOS)
        return im, 'jpg'
    im = im.convert('RGBA')
    if crop:
        im = im.crop(crop)
    elif kind not in ('tile', 'ui'):
        bbox = alpha_bbox(im)
        if bbox:
            im = im.crop(bbox)
    if kind == 'tile':
        im = im.resize((MAX[kind], MAX[kind]), Image.LANCZOS)
    else:
        im.thumbnail((MAX[kind], MAX[kind]), Image.LANCZOS)
    # 256색 팔레트 (알파 유지) — 파일 크기 절약
    q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    return q, 'png'


def main():
    srcs = sys.argv[1:]
    if not srcs:
        print(__doc__)
        sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {'assets': []}
    by_file = {a['src']: a for a in manifest['assets']}
    # 캐릭터 애니메이션: 같은 key 의 프레임은 공통 영역으로 잘라 흔들림 방지
    union = {}
    for name, spec in MAP.items():
        if name.startswith('_') or spec['kind'] != 'char':
            continue
        path = find(srcs, name)
        if not path:
            continue
        bb = alpha_bbox(Image.open(path).convert('RGBA'))
        k = spec['keys'][0]
        if bb:
            u = union.get(k)
            union[k] = bb if not u else (min(u[0], bb[0]), min(u[1], bb[1]), max(u[2], bb[2]), max(u[3], bb[3]))
    done = 0
    for name, spec in MAP.items():
        if name.startswith('_'):
            continue
        path = find(srcs, name)
        if not path:
            continue
        img, ext = process(path, spec['kind'], spec.get('enhance'), union.get(spec['keys'][0]) if spec['kind'] == 'char' else None)
        out_name = os.path.splitext(name)[0] + '.' + ext
        if ext == 'jpg':
            img.save(os.path.join(OUT, out_name), quality=82, optimize=True)
        else:
            img.save(os.path.join(OUT, out_name), optimize=True)
        entry = {'src': name, 'file': out_name, 'kind': spec['kind'], 'w': img.width, 'h': img.height}
        for k in ('keys', 'frame', 'portrait', 'tiles', 'seasons'):
            if k in spec:
                entry[k] = spec[k]
        by_file[name] = entry
        done += 1
    manifest['assets'] = sorted(by_file.values(), key=lambda a: a['src'])
    json.dump(manifest, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, a['file'])) for a in manifest['assets'])
    print(f'processed {done} files, manifest {len(manifest["assets"])} entries, {total // 1024} KB')
    missing = [n for n in MAP if not n.startswith('_') and n not in by_file]
    if missing:
        print('not found yet:', ', '.join(missing))


if __name__ == '__main__':
    main()
