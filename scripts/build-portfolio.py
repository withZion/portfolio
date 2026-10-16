"""Build the public portfolio from v3 into ./publish, ready for Cloudflare.

Only files the v3 page uses are copied, so the product sites, Contacts.env
and working notes never go online.

Run from the "My Website" folder:   python scripts/build-portfolio.py
Deploy afterwards:                   npx wrangler deploy -c portfolio.wrangler.jsonc
"""
import re
import shutil
from pathlib import Path

SITE_URL = "https://portfolio.zion-ojuwonlo.workers.dev"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "publish"

FILES = [
    "styles.css", "v3.css", "script.js", "v3.js", "favicon.svg",
    "assets/portrait-560.webp", "assets/portrait-1000.webp",
]
OPTIONAL = ["assets/og-portfolio.png"]   # social preview, made separately

TITLE = "Zion O'Juwonlo | Full Stack Developer"


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)

    html = (ROOT / "v3.html").read_text(encoding="utf-8")
    swaps = [
        (r"<title>.*?</title>", f"<title>{TITLE}</title>"),
        (r'<meta name="robots" content="[^"]*" />', '<meta name="robots" content="index, follow" />'),
        (r'<link rel="canonical" href="[^"]*" />', f'<link rel="canonical" href="{SITE_URL}/" />'),
        (r'<meta property="og:url" content="[^"]*" />', f'<meta property="og:url" content="{SITE_URL}/" />'),
        (r'<meta property="og:title" content="[^"]*" />', f'<meta property="og:title" content="{TITLE}" />'),
        (r'<meta name="twitter:title" content="[^"]*" />', f'<meta name="twitter:title" content="{TITLE}" />'),
        (r'<meta name="twitter:card" content="summary" />', '<meta name="twitter:card" content="summary_large_image" />'),
        (r"\s*<!-- TODO: add a 1200x630 og:image once designed -->",
         f'\n  <meta property="og:image" content="{SITE_URL}/assets/og-portfolio.png" />'
         f'\n  <meta property="og:image:width" content="1200" />'
         f'\n  <meta property="og:image:height" content="630" />'
         f'\n  <meta name="twitter:image" content="{SITE_URL}/assets/og-portfolio.png" />'),
    ]
    for pattern, repl in swaps:
        html, n = re.subn(pattern, repl, html, count=1, flags=re.S)
        if n != 1:
            raise SystemExit(f"Could not update: {pattern}")
    if "zionojuwonlo.com" in html:
        raise SystemExit("The expired domain is still referenced in v3.html")
    (OUT / "index.html").write_text(html, encoding="utf-8")

    for f in FILES:
        shutil.copy2(ROOT / f, OUT / f)
    for f in OPTIONAL:
        if (ROOT / f).exists():
            shutil.copy2(ROOT / f, OUT / f)

    (OUT / "404.html").write_text(
        """<!DOCTYPE html>
<html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | Zion O'Juwonlo</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css"></head>
<body><main class="container section"><p class="kicker">404</p><h1 class="section-title">This page doesn't exist.</h1>
<p class="section-sub">It may have moved, or the link has a typo.</p>
<p style="margin-top:2rem"><a class="btn btn-primary" href="/">Go to the Home Page</a></p></main></body></html>
""", encoding="utf-8")

    (OUT / "_headers").write_text(
        """/*
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()

/assets/*
  Cache-Control: public, max-age=604800
""", encoding="utf-8")

    files = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file())
    print(f"Built {len(files)} files into publish/:", ", ".join(files))


if __name__ == "__main__":
    build()
