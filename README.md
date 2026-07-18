# 홈택스 가이드 (hometax.me)

Astro + Decap CMS 정적 사이트. `blogincome`과 같은 Cloudflare Pages 패턴입니다.

- **세금 가이드**: `src/content/blog/`
- **군마트 자산**: `src/content/gunmart/` (URL은 기존과 같이 `/슬러그/`)

## 로컬

```bash
npm install
npm run import:wp   # WXR → markdown (이미 한 번 돌렸으면 생략 가능)
npm run dev
```

```bash
npm run build   # → dist/
```

## 워드프레스 글 가져오기

1. 워드프레스 **도구 → 보내기 → 글(발행됨)** XML을 프로젝트 루트에 둡니다.
2. 실행:

```bash
npm run import:wp
# 또는
node scripts/import-wxr.mjs "hometax 2026-07-18.xml"
```

이미지 재다운로드를 끄려면: `DOWNLOAD_IMAGES=0 npm run import:wp`

## Decap CMS

- 관리: `/admin/`
- GitHub repo·OAuth·R2는 `public/admin/config.yml`, `wrangler.toml`에서 `hometax`용으로 바꿔 둔 상태입니다.
- 배포 전 GitHub 저장소 이름·R2 버킷·OAuth 시크릿을 실제 값에 맞게 확인하세요.

## 배포 (Cloudflare Pages)

1. GitHub에 이 저장소 연결
2. Build: `npm run build` / Output: `dist` / Node 20
3. 커스텀 도메인: `hometax.me`
