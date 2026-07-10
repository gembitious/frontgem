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

`ANTHROPIC_API_KEY` 필요 (`ANTHROPIC_MODEL`로 모델 오버라이드, 기본 `claude-sonnet-5`).

> **모델 선택(런타임)**: 퇴고 옵션 패널의 **모델** 드롭다운에서 매 요청마다
> `Sonnet 5 / Opus 4.8 / Haiku 4.5 / 목(무료)`을 고를 수 있다(선택은 localStorage에 기억).
> 서버는 허용 목록으로 검증하므로 임의 모델 주입이 안 된다. `ANTHROPIC_MODEL`은 폴백 기본값.
>
> **목 모드(무료 테스트)**: 드롭다운에서 `목(무료)`을 고르거나 `LAPIDARY_MOCK=1`을 켜면
> AI 호출·API 키 없이 규칙 기반으로 퇴고 결과를 스트리밍한다. 코드/이미지는 보존하고 prose만
> 가볍게 다듬어 **diff → 수락/거부 → 머지 → 라운드** UI 전체를 공짜로 테스트할 수 있다.

## 커스텀 WYSIWYG 에디터 (Phase 4)

`/write` 본문에서 **마크다운 / 에디터** 모드를 토글한다.

- 블록 단위 contenteditable(Notion 방식). React는 마운트 후 DOM을 덮어쓰지 않고
  `compositionstart/end` 가드로 조합을 처리 → **한글 IME가 깨지지 않는다**
- 마크다운 단축(`## `·`- `·`> ` 등), Enter 분할/Backspace 병합, 인라인 마크(bold/italic/code/link),
  붙여넣기 새니타이즈, undo/redo
- 코드블록은 textarea. `body`(마크다운)가 canonical이라 발행·프리뷰·lapidary와 그대로 호환

## 고도화 (Phase 5)

- **이미지 업로드** — 에디터 이미지 블록에서 업로드 → `/api/upload`가 `public/uploads/`에
  GitHub 커밋 후 raw URL 삽입 (기존 `GITHUB_TOKEN` 재사용, 공개 레포 전제). 툴바에서
  `+ 이미지`·`+ 코드` 블록 삽입
- **퇴고 라운드 히스토리** — 적용한 lapidary 라운드를 localStorage에 기록(프리셋·지시·
  before/after). `라운드 기록` 버튼에서 이전 상태로 되돌리기
