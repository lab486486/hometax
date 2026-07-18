# Deploy checklist — hometax.me

## Code / GitHub
- [x] Astro + Decap site scaffolded from blogincome
- [x] WXR import (99 posts → blog 72 / gunmart 27)
- [x] Repo: https://github.com/lab486486/hometax.git
- [ ] Push `main` to GitHub
- [ ] Cloudflare Pages connected to GitHub (build: `npm run build`, output: `dist`, Node 20)

## GitHub OAuth App (Decap CMS)
Callback URL must be:

```
https://hometax.me/api/oauth/callback
```

(Also add `https://hometax.pages.dev/api/oauth/callback` for preview if needed.)

Pages **secrets** (Production + Preview):
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## DNS / domain
- [ ] Cloudflare Pages custom domain `hometax.me`
- [ ] Cut over DNS from WordPress host when ready

## R2 (optional)
- [ ] Bucket `hometax-media` + public URL
- [ ] Set `R2_PUBLIC_BASE_URL` + `public/admin/config.yml` media `public_base_url`
