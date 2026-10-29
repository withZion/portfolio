# Portfolio

Source for [portfolio.zion-ojuwonlo.workers.dev](https://portfolio.zion-ojuwonlo.workers.dev), the portfolio of Zion O'Juwonlo, a developer in Lagos.

It's a static site: plain HTML, CSS and JavaScript, no framework and no build step beyond copying files. It's hosted on Cloudflare Workers static assets.

## Files

- `v3.html`: the page
- `styles.css`, `v3.css`: base styles, then the v3 layer on top
- `script.js`, `v3.js`: base behaviour, then the v3 layer on top
- `assets/`: portrait and social preview image
- `scripts/build-portfolio.py`: copies only the files the page uses into `publish/` and sets the live title, canonical URL and social tags

## Run it locally

```
python scripts/build-portfolio.py
python -m http.server 8000 --directory publish
```

Then open http://localhost:8000.

## Deploy

```
python scripts/build-portfolio.py
npx wrangler deploy -c portfolio.wrangler.jsonc
```

`main` always matches the live site. Earlier versions are in the git history.
