"""アイコン一式を生成する: python3 tools/make-icons.py [案]（既定は sprout）
案: bubble（吹き出しの花）/ sprout（芽吹く花）/ ring（花のリング）
--preview <dir> を付けると、全案を並べた比較画像だけを出力する。
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "icons"
SS = 4  # 縮小前の描きこみ倍率（なめらかにするため）

PINK = (224, 96, 126)
PINK_LIGHT = (246, 184, 200)
PINK_PALE = (252, 228, 234)
GOLD = (245, 200, 66)
GOLD_DEEP = (232, 169, 58)
LEAF = (94, 156, 118)
LEAF_LIGHT = (125, 186, 143)
CREAM = (255, 250, 243)
WHITE = (255, 255, 255)


# ---------- 部品 ----------
def gradient(S, top, bottom):
    img = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / (S - 1)
        d.line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,))
    return img


def petal_points(cx, cy, length, width, angle, steps=80, base=0.35):
    """中心から外へ伸びる、先の丸いしずく形の花びら"""
    pts = []
    for i in range(steps + 1):
        t = math.pi * i / steps
        r = length * (0.5 - 0.5 * math.cos(t))
        w = width * math.sin(t) ** 0.8 * (base + (1 - base) * (r / length))
        pts.append((r, w))
    outline = pts + [(r, -w) for r, w in reversed(pts)]
    ca, sa = math.cos(angle), math.sin(angle)
    return [(cx + r * ca - w * sa, cy + r * sa + w * ca) for r, w in outline]


def leaf_points(x, y, length, width, angle, steps=60):
    """両端のとがった葉っぱ"""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        pts.append((length * t, width * math.sin(math.pi * t) ** 0.9))
    outline = pts + [(r, -w) for r, w in reversed(pts)]
    ca, sa = math.cos(angle), math.sin(angle)
    return [(x + r * ca - w * sa, y + r * sa + w * ca) for r, w in outline]


def flower(d, cx, cy, L, n=5, petal=PINK, inner=PINK_LIGHT, center=GOLD, rot=-math.pi / 2):
    for k in range(n):
        a = rot + 2 * math.pi * k / n
        d.polygon(petal_points(cx, cy, L, L * 0.44, a), fill=petal)
    for k in range(n):
        a = rot + 2 * math.pi * k / n
        d.polygon(petal_points(cx, cy, L * 0.6, L * 0.2, a), fill=inner)
    r = L * 0.23
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=center)
    h = r * 0.35
    d.ellipse((cx - r * 0.45 - h, cy - r * 0.45 - h, cx - r * 0.45 + h, cy - r * 0.45 + h), fill=(255, 236, 170))


def sparkle(d, cx, cy, r, color):
    pts = []
    for i in range(8):
        a = -math.pi / 2 + math.pi * i / 4
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=color)


def soft_shadow(img, shape_fn, offset, blur, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shape_fn(ImageDraw.Draw(layer), (90, 50, 60, alpha), offset)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


# ---------- 案 ----------
# k: 0〜1 の縮尺。maskable 用に小さく描けるように中心から拡大縮小する
def draw_bubble(S, k):
    """桃色のグラデーションに白い吹き出し。中に花。声＋花"""
    img = gradient(S, (255, 214, 222), (246, 160, 182))
    c = S / 2
    u = S * k

    def bubble(d, fill, off=0):
        bx0, by0, bx1, by1 = c - u * 0.36, c - u * 0.33 + off, c + u * 0.36, c + u * 0.30 + off
        d.rounded_rectangle((bx0, by0, bx1, by1), radius=u * 0.17, fill=fill)
        d.polygon([(c - u * 0.17, by1 - u * 0.02), (c - u * 0.25, by1 + u * 0.14), (c - u * 0.02, by1 - u * 0.02)], fill=fill)

    soft_shadow(img, lambda d, f, o: bubble(d, f, o), S * 0.015, S * 0.02, 70)
    d = ImageDraw.Draw(img)
    bubble(d, CREAM + (255,))
    flower(d, c, c - u * 0.015, u * 0.24)
    sparkle(d, c + u * 0.33, c - u * 0.36, u * 0.055, WHITE)
    sparkle(d, c + u * 0.40, c - u * 0.24, u * 0.03, WHITE)
    return img


def draw_sprout(S, k):
    """やわらかい緑の地に、茎と葉のある一輪。花畑の最初の一輪"""
    img = gradient(S, (236, 245, 232), (190, 222, 196))
    d = ImageDraw.Draw(img)
    c = S / 2
    u = S * k
    fy = c - u * 0.1
    # 小さな丘
    d.ellipse((c - u * 0.62, c + u * 0.30, c + u * 0.62, c + u * 0.95), fill=LEAF_LIGHT)
    # 茎
    d.line([(c, fy), (c, c + u * 0.38)], fill=LEAF, width=round(u * 0.045))
    d.polygon(leaf_points(c, c + u * 0.24, u * 0.25, u * 0.075, -math.pi * 0.82), fill=LEAF)
    d.polygon(leaf_points(c, c + u * 0.16, u * 0.22, u * 0.065, -math.pi * 0.2), fill=LEAF_LIGHT)
    flower(d, c, fy, u * 0.25)
    sparkle(d, c - u * 0.33, c - u * 0.33, u * 0.05, WHITE)
    sparkle(d, c + u * 0.34, c - u * 0.22, u * 0.035, (255, 245, 210))
    return img


def draw_ring(S, k):
    """アプリの進み具合リングと同じモチーフ。クリーム地にピンクの輪と花"""
    img = gradient(S, (255, 250, 243), (250, 236, 228))
    d = ImageDraw.Draw(img)
    c = S / 2
    u = S * k
    r = u * 0.36
    w = u * 0.055
    d.ellipse((c - r, c - r, c + r, c + r), outline=(240, 220, 214), width=round(w))
    d.arc((c - r, c - r, c + r, c + r), start=-90, end=200, fill=PINK, width=round(w))
    end = math.radians(200)
    for a in (math.radians(-90), end):  # 端を丸く
        x, y = c + (r - w / 2) * math.cos(a), c + (r - w / 2) * math.sin(a)
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=PINK)
    flower(d, c, c, u * 0.2, n=5, petal=PINK, inner=PINK_LIGHT)
    x, y = c + r * math.cos(end), c + r * math.sin(end)
    sparkle(d, x - u * 0.02, y - u * 0.1, u * 0.05, GOLD_DEEP)
    return img


VARIANTS = {"bubble": draw_bubble, "sprout": draw_sprout, "ring": draw_ring}
LABELS = {"bubble": "A 吹き出しの花", "sprout": "B 芽吹く一輪", "ring": "C 花のリング"}


def render(variant, size, k=1.0, rounded=False):
    S = size * SS
    img = VARIANTS[variant](S, k).resize((size, size), Image.LANCZOS)
    if rounded:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, S, S), radius=S * 0.225, fill=255)
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def preview(out_dir):
    """全案を、大きいサイズとホーム画面サイズで並べる"""
    from PIL import ImageFont
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    W, H = 3 * 420 + 40, 640
    sheet = Image.new("RGBA", (W, H), (245, 245, 247, 255))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", 28)
        small = ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc", 20)
    except OSError:
        font = small = ImageFont.load_default()
    d = ImageDraw.Draw(sheet)
    # 下段はホーム画面風の暗い壁紙
    d.rectangle((0, 430, W, H), fill=(52, 64, 84))
    for i, v in enumerate(VARIANTS):
        x = 40 + i * 420
        sheet.alpha_composite(render(v, 340, rounded=True), (x + 20, 30))
        d.text((x + 190, 395), LABELS[v], font=font, fill=(40, 40, 40), anchor="mm")
        icon = render(v, 120, rounded=True)
        sheet.alpha_composite(icon, (x + 130, 455))
        d.text((x + 190, 600), "ありがとう", font=small, fill=(255, 255, 255), anchor="mm")
    sheet.convert("RGB").save(out_dir / "icon-options.png")
    print("preview written to", out_dir / "icon-options.png")


def build(variant):
    OUT.mkdir(exist_ok=True)
    render(variant, 192).save(OUT / "icon-192.png")
    render(variant, 512).save(OUT / "icon-512.png")
    render(variant, 512, k=0.8).save(OUT / "icon-maskable-512.png")  # Android の丸型などでも欠けないよう小さめ
    render(variant, 180).convert("RGB").save(OUT / "apple-touch-icon.png")  # iOS は透過不可。角丸は iOS が付ける
    render(variant, 64, rounded=True).save(OUT / "favicon-64.png")
    print(f"icons ({variant}) written to", OUT)


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--preview"]:
        preview(args[1])
    else:
        build(args[0] if args else "sprout")
