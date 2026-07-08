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
재빌드하며 글이 반영된다.

## 웹에서 발행 (Phase 2)

`/write`에서 직접 쓰고 발행할 수 있다.

- `/write` 접근 → `/login`에서 `BLOG_ADMIN_PASSWORD`로 로그인 (미들웨어가 세션 쿠키 확인)
- frontmatter 폼 + 마크다운 textarea + **실시간 프리뷰**(발행과 동일한 shiki 파이프라인)
- 초안은 브라우저 localStorage에 자동 저장
- **발행** 버튼 → `/api/publish`가 `content/posts/{slug}.mdx`를 GitHub Contents API로 커밋
  → Vercel 재빌드로 반영

필요 env는 [`.env.example`](./.env.example) 참고 (`BLOG_ADMIN_PASSWORD`, `AUTH_SECRET`,
`GITHUB_TOKEN` 등). 로컬은 `.env.local`에 설정한다.

## lapidary 퇴고 (Phase 3)

에디터의 **lapidary 퇴고** 버튼으로 초안을 AI로 다듬는다.

- 수정 방향 프리셋(간결/기술 정확성/문장 호흡/독자 눈높이/제목 제안) + 자유 지시
- `/api/revise`가 Anthropic으로 전체 리라이트를 스트리밍 (구조·코드블록 보존)
- 결과를 블록 정렬 후 **한국어 어절 단위 diff**(`Intl.Segmenter`)로 계산 → hunk 단위
  수락/거부/직접수정 (통합·좌우 보기)
- 머지 결과를 에디터에 반영, 다른 옵션으로 재퇴고(라운드) 가능

`ANTHROPIC_API_KEY` 필요 (`ANTHROPIC_MODEL`로 모델 오버라이드, 기본 `claude-opus-4-8`).
