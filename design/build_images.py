"""design/raw/*.png (GPT 가 그린 원본) → site/img/ 에 앱용 크기·WebP 로 만든다. Pillow 필요(개발할 때만)."""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
RAW, OUT = HERE / "raw", HERE.parent / "site" / "img"
OUT.mkdir(parents=True, exist_ok=True)

icon = Image.open(RAW / "icon.png").convert("RGB")
for s in (512, 192, 180):
    icon.resize((s, s), Image.LANCZOS).save(OUT / f"icon-{s}.png", optimize=True)

PAGE_BG = {"header_light": (0xF7, 0xF5, 0xF0), "header_dark": (0x15, 0x1D, 0x1B)}
for name in ("header_light", "header_dark"):
    im = Image.open(RAW / f"{name}.png").convert("RGB")
    # 그림의 빈 바탕(왼쪽) 색을 화면 바탕색과 똑같이 맞춰 경계선이 안 보이게
    left = im.crop((0, 0, im.width // 3, im.height)).resize((1, 1), Image.BOX).getpixel((0, 0))
    delta = [t - s for t, s in zip(PAGE_BG[name], left)]
    im = Image.merge("RGB", [ch.point(lambda v, d=d: max(0, min(255, v + d))) for ch, d in zip(im.split(), delta)])
    im = im.resize((1200, round(1200 * im.height / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name.replace('_', '-')}.webp", quality=80, method=6)

for name in ("empty_none", "empty_error"):
    im = Image.open(RAW / f"{name}.png").convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:  # 투명한 가장자리를 잘라 그림을 가운데 크게
        pad = 40
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
        im = im.crop(bbox)
    side = max(im.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq.resize((300, 300), Image.LANCZOS).save(OUT / f"{name.replace('_', '-')}.webp", quality=82, method=6)

for f in sorted(OUT.iterdir()):
    print(f"{f.name:22} {f.stat().st_size // 1024:4} KB")
