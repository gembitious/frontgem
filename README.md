# frontgem

개인 기술 블로그 + AI 퇴고 파이프라인(lapidary) 플랫폼.
프로젝트 배경·아키텍처·로드맵은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 스택 (Phase 1)

- **Next.js 16** App Router + React 19 + TypeScript (strict)
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **Velite** — MDX를 Zod 스키마로 검증하는 빌드타임 콘텐츠 레이어
- **Shiki** (`@shikijs/rehype`) — 듀얼 테마 코드 하이라이팅
- **next-themes** — 플래시 없는 다크모드

라이브러리 선택 근거는 CLAUDE.md의 "스캐폴딩 결정 로그" 참고.

## 개발

```bash
npm install
npm run dev      # velite --watch + next dev
npm run build    # velite --clean && next build
npm run lint
npm run typecheck
```

`NEXT_PUBLIC_SITE_URL`은 `.env.example`를 참고해 배포 환경에 설정한다.

## 글 발행 (Phase 1 방식)

발행 = `content/posts/`에 MDX 파일을 커밋하는 것. frontmatter 스키마는
[`velite.config.ts`](./velite.config.ts) 참고.

```md
---
title: 글 제목
description: 목록·OG·RSS에 쓰이는 요약
date: 2026-07-07
tags: [태그1, 태그2]
draft: false   # 선택. dev에서만 보이고 프로덕션에선 숨김
---

본문 (마크다운 / MDX)
```

파일명이 슬러그가 된다 (`hello.mdx` → `/posts/hello`). 커밋을 푸시하면 Vercel이
재빌드하며 글이 반영된다. (웹 에디터·발행 버튼은 Phase 2)
