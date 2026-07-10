# frontgem

개인 기술 블로그 + AI 퇴고 파이프라인 내장 플랫폼.
"초안(원석)을 깎아 발행(보석)한다"는 컨셉. 퇴고 엔진 모듈명은 **lapidary**(보석 세공사).

- 작성자: gembitious (frontend developer)
- 글 언어: 한국어 (한글 IME / 한국어 토큰화가 주요 기술 과제)
- 배포: Vercel / 레포: github.com/gembitious/frontgem

## 핵심 사용 흐름

실제 블로그 서비스를 쓰듯: `/write` 진입 → 초안 작성 → lapidary로 퇴고
(수정 방향 옵션 설정 → AI 리라이트 → diff 확인 → hunk 단위 수락/거부/직접수정
→ 필요 시 라운드 반복) → 발행(레포에 MDX 커밋).

## 아키텍처 결정과 근거

### Next.js App Router + Vercel

- 공개 블로그는 SSG/ISR, `/write` 어드민 라우트와 API Route를 같은 레포에 둔다.
- 퇴고 기능은 Anthropic API 호출이 필요 → API 키 보호를 위해 서버 레이어 필수 →
  GitHub Pages(정적 전용) 배제.

### 콘텐츠 저장: MDX-in-repo + GitHub Contents API 발행

- 발행 = `content/posts/*.mdx`에 GitHub Contents API로 커밋. DB 없음.
- 글이 git 히스토리에 남고, 백업·이전·버전관리가 공짜. 발행 후 on-demand
  revalidation으로 반영.
- 초안은 로컬(localStorage) + 선택적으로 `content/drafts/` 커밋.

### 블록 모델 = 문서의 single source of truth

- 문서는 블록 배열: `paragraph | heading | code | list | image | quote`.
- **에디터와 diff 엔진이 같은 블록 모델을 소비한다.** diff의 hunk 단위 = 블록이라
  accept/reject UI가 모델과 1:1로 떨어진다.
- 발행 시 블록 모델 → MDX 직렬화, 편집 시 MDX → 블록 역파싱.

### 커스텀 WYSIWYG (Phase 4, 블록 단위 contenteditable)

- ProseMirror식 단일 contenteditable 대신 블록마다 독립 contenteditable
  (Notion 방식). IME/Selection 문제를 블록 내 인라인 범위로 국한시켜
  개인이 감당 가능한 난이도로 통제.
- **한글 IME가 최대 난제**: composition(`compositionstart/update/end`) 중
  controlled 렌더링을 멈추고 조합 종료 후 모델 반영. React 리렌더와의 공존이 핵심.
- 코드블록은 contenteditable 대신 textarea + 하이라이트 오버레이(실용 우선).
- 크로스 블록 선택/드래그는 MVP 제외, 후순위.
- 에디터가 완성되기 전까지는 마크다운 textarea + 프리뷰가 임시 에디터
  (블로그 전체를 에디터가 블로킹하지 않도록 트랙 분리).

### lapidary 퇴고 엔진 (`src/features/lapidary/`)

- **입력**: 초안 + 수정 방향 옵션 = 프리셋 다중 선택(간결하게 / 기술적 정확성 /
  문장 호흡 / 독자 눈높이 / 제목·소제목 제안 등) + 자유 텍스트 지시.
- **AI 호출**: 전체 리라이트 방식. 프롬프트로 마크다운 구조(헤딩·코드블록·리스트)
  보존, 코드블록 내용 불변, 문단 분할 유지를 강제. 긴 글은 헤딩 섹션 단위 청킹.
  문단별 개별 요청 방식은 문맥 품질과 구현 복잡도 모두 불리해서 배제.
- **diff 계산은 클라이언트에서**: 블록 정렬(LCS 기반) 후 블록 내 단어 단위 diff.
  한국어는 공백 토큰화가 부정확하므로 `Intl.Segmenter`로 어절/문장 분할 커스텀.
- **hunk 상태 모델**:
  `{ id, original, revised, status: 'pending' | 'accepted' | 'rejected' | 'edited' }`
  — `git add -p`처럼 hunk 단위 수락/거부 + 인라인 직접 수정, 최종 머지 결과를
  에디터에 반영. 머지 결과를 다시 초안 삼아 다른 옵션으로 재퇴고 가능(라운드).
- **표시**: unified(GitHub 기본) / split(좌우) 토글.

### 어드민 인증

- 개인용이므로 환경변수 단일 패스워드 + 미들웨어 세션 쿠키. 필요해지면
  GitHub OAuth로 승격.

## 레포 구조

```
frontgem/
├── content/
│   ├── posts/              # 발행된 MDX (발행 = 여기로 커밋)
│   └── drafts/             # (선택) 초안 커밋
├── src/
│   ├── app/
│   │   ├── (public)/       # 홈, 포스트 상세, 태그, RSS
│   │   ├── (admin)/write/  # 에디터 + lapidary 퇴고 UI
│   │   └── api/
│   │       ├── revise/     # Anthropic API 프록시 (스트리밍)
│   │       └── publish/    # GitHub Contents API 커밋 + revalidate
│   ├── features/
│   │   ├── lapidary/       # diff 엔진, hunk 상태, 프롬프트 프리셋
│   │   └── editor/         # 블록 에디터 (Phase 4)
│   ├── entities/document/  # 블록 모델, MDX serialize/parse
│   └── lib/                # github client, mdx 파이프라인, auth
└── CLAUDE.md
```

## Phase 로드맵

### Phase 1 — 공개 블로그 뼈대

- Next.js App Router + TypeScript strict + Tailwind 스캐폴드.
- MDX 파이프라인: 라이브러리는 스캐폴딩 시점에 유지보수 상태 확인 후 결정
  (`next-mdx-remote` 계열 vs velite 등). contentlayer는 유지보수 중단 이력 주의.
- 포스트 목록/상세, 태그, 코드 하이라이팅(shiki), 다크모드, RSS, sitemap,
  OG 이미지 생성.
- 완료 기준: 레포에 MDX를 수동 커밋하면 글이 발행되는 상태.

### Phase 2 — 발행 플로우

- `/write` 어드민 라우트 + env 패스워드 인증 미들웨어.
- 임시 에디터: 마크다운 textarea + 실시간 프리뷰.
- `/api/publish`: GitHub Contents API 커밋 → on-demand revalidation.
- frontmatter 폼(제목, 태그, 요약, 슬러그), 초안 localStorage 저장.
- 완료 기준: 웹에서 글을 쓰고 발행 버튼으로 배포까지 완결.

### Phase 3 — lapidary 퇴고 엔진

- 블록 모델 정의 + MDX serialize/parse (**에디터보다 diff가 먼저 블록 모델을
  소비한다** — 여기서 모델을 확정).
- `/api/revise`: Anthropic API 프록시, 스트리밍, 구조 보존 프롬프트, 섹션 청킹.
- diff 엔진: 블록 정렬 + `Intl.Segmenter` 기반 단어 diff.
- hunk accept/reject/edit UI, unified/split 토글, 옵션 패널(프리셋 + 자유 지시).
- 완료 기준: textarea 초안 → 퇴고 → diff 검토 → 머지 → 발행 흐름 완결.

### Phase 4 — 커스텀 WYSIWYG 에디터

- 블록 단위 contenteditable, 블록 타입: 문단, 헤딩(2단계), 코드, 리스트, 이미지.
- 인라인 마크: bold / italic / code / 링크.
- 한글 IME composition 처리, Selection 관리, 붙여넣기 새니타이즈,
  undo/redo 스택, 마크다운 단축 입력(`## ` → 헤딩 등).
- 완료 기준: textarea 임시 에디터를 대체.

### Phase 5 — 고도화

- 퇴고 라운드 히스토리, 커스텀 프리셋 저장, 스트리밍 중 diff 프리뷰,
  이미지 업로드(GitHub or Vercel Blob), 검색, 크로스 블록 선택.

## 컨벤션

- TypeScript strict, `readonly` 우선, 명시적 네이밍. 트레이드오프가 있는 결정은
  코드 주석 또는 이 파일에 rationale 기록.
- 상태 관리: 에디터/lapidary의 hunk 상태는 세밀한 구독이 필요 → **zustand로 확정**
  (근거는 아래 "스캐폴딩 결정 로그").
- 커밋은 Phase-체크포인트 단위로 작게.

## 스캐폴딩 결정 로그 (Phase 1, 2026-07)

라이브러리는 스캐폴딩 시점에 유지보수 상태를 확인해 확정하기로 했으므로, 확인 결과와
근거를 남긴다.

### MDX 파이프라인 → Velite

- **선택**: `velite` (빌드타임 콘텐츠 레이어 + Zod 스키마), 하이라이팅은 `@shikijs/rehype`.
- **유지보수 상태 확인 (npm 기준)**:
  - `contentlayer`: 유지보수 중단(스폰서가 Netlify에 인수된 뒤 방치). CLAUDE.md 경고대로 배제.
  - `next-mdx-remote`: npm 활동 "Inactive"(최근 배포 2026-02), CVE-2026-0969로 Vercel이
    취약 버전 배포를 기본 차단한 이력 → 리스크.
  - `velite`: v0.4.0, 최신 배포 2026-06으로 활발히 유지보수 중.
- **근거**: MDX + frontmatter를 Zod로 검증해 빌드 시 **타입 안전 데이터 레이어**로 컴파일 →
  TS strict 컨벤션과 정합. 정적 블로그(SSG/ISR) + git-as-CMS 발행(커밋 → Vercel 재빌드로
  반영)에 최적. 블록 모델(Phase 3)도 같은 MDX를 소비하므로 파이프라인이 일관된다.
  하이라이팅은 `@shikijs/rehype` 듀얼 테마(github-light/dark)로 클라이언트 JS 없이 다크모드 대응.
- **Next 16 통합 주의**: velite의 async `build()`는 top-level await가 필요한데 Next 16의
  config 로더는 require() 기반이라 TLA를 거부한다(`ERR_REQUIRE_ASYNC_MODULE`). 그래서
  next.config에서 호출하지 않고 npm 스크립트(`velite && next build`, dev는 `velite --watch`)로
  분리했다.
- **후속(Phase 2/3)**: textarea 초안의 실시간 프리뷰·퇴고 결과 렌더는 빌드타임 velite로는
  부족 → 그 시점에 런타임 MDX 렌더러(`next-mdx-remote-client`, 활발히 유지보수되는 포크)를
  추가한다.

### 상태 관리 → Zustand

- **선택**: `zustand` (selector 기반 세밀 구독).
- **유지보수 상태 확인**: `zustand` v5, 최신 배포 2026-05로 활발. `@preact/signals-react`도
  유지보수는 되나 아래 이유로 배제.
- **근거**: App Router는 RSC가 기본인데 `@preact/signals-react`는 **Server Components와
  비호환**이고 React 버전 간 취약(React 팀도 signals 모델을 지원하지 않음). zustand는 RSC와
  공존하며 selector로 hunk 단위 세밀 구독이 가능해 lapidary의 "세밀한 구독" 요구를 충족한다.
- **설치 시점**: Phase 1은 공개 블로그(전부 서버 렌더)라 클라이언트 상태가 없어 **미설치**.
  클라이언트 상태가 처음 등장하는 Phase 2/3에서 도입한다(불필요한 의존성 선반영 회피).

## 스캐폴딩 결정 로그 (Phase 2, 2026-07)

발행 플로우를 구현하며 확정한 선택과 근거.

### 런타임 MDX 렌더러 → next-mdx-remote-client

- **선택**: `next-mdx-remote-client` v2 (활발히 유지보수되는 포크). 서버에서 `serialize`로
  MDX를 컴파일 → 클라이언트에서 `MDXClient`로 렌더.
- **근거**: `/write`의 실시간 프리뷰는 빌드타임 velite로 불가능(런타임 입력). serialize를
  서버(`/api/preview`)에서 돌려 **MDX 컴파일러를 클라이언트 번들에서 제외**하고, 발행 페이지와
  **동일한 remark/rehype 파이프라인**(remark-gfm + rehype-slug + `@shikijs/rehype`)을 써서
  프리뷰가 최종 렌더와 일치하도록 했다. 프리뷰 MDX는 `disableImports/disableExports`로 서버
  모듈 접근을 차단.

### 어드민 인증 → env 패스워드 + HMAC 서명 세션 쿠키

- **선택**: 환경변수 단일 패스워드(`BLOG_ADMIN_PASSWORD`) 검증 후, `AUTH_SECRET`으로 HMAC
  서명한 세션 쿠키(httpOnly) 발급. `middleware`가 `/write`·`/api/publish`·`/api/preview`를 게이트.
- **근거**: 개인용이라 OAuth는 과함(CLAUDE.md 방침). 인증 로직은 Web Crypto만 사용해 **edge
  미들웨어와 node 라우트 핸들러에서 동일 코드로 검증**된다. 필요해지면 GitHub OAuth로 승격.
- **한계**: 쿠키 탈취 시 만료(7일)까지 유효. 개인 블로그 수준에서 수용.

### 발행 반영 = 커밋 → Vercel 재빌드 (revalidate는 best-effort)

- 발행은 `content/posts/*.mdx`를 GitHub Contents API로 커밋하는 것. **velite가 빌드타임**이라
  새 글은 커밋이 트리거한 **Vercel 재빌드 후** 반영된다. `/api/publish`의 `revalidatePath`는
  best-effort일 뿐(빌드타임 데이터 레이어라 신규 글을 즉시 노출하진 못함) — 향후 ISR/런타임
  콘텐츠 레이어를 얹으면 그때 실효를 가진다.

### 라우트 그룹 (public / admin)

- `src/app/(public)`(max-w-3xl)와 `src/app/(admin)`(에디터 2단 레이아웃용 max-w-6xl)로 분리해
  루트 레이아웃이 폭을 강제하지 않게 했다(CLAUDE.md 구조와 정합).

## 스캐폴딩 결정 로그 (Phase 3, 2026-07)

lapidary 퇴고 엔진을 구현하며 확정한 선택과 근거.

### 블록 모델 (`src/entities/document/blocks.ts`)

- 문서 = 블록 배열(`paragraph | heading | code | list | image | quote`). 마크다운 ↔ 블록
  파서/직렬화를 두고, **diff 엔진이 에디터보다 먼저 이 모델을 소비한다**(CLAUDE.md 원칙).
- 풀 CommonMark 파서가 아니라, diff·라운드트립에 필요한 안정적 단위만 만드는 실용 스플리터.
  코드블록은 펜스 사이를 그대로 보존(내용 불변 요구와 정합).

### AI 호출 → Anthropic 전체 리라이트, 스트리밍 (`/api/revise`)

- **모델**: `claude-opus-4-8`(env `ANTHROPIC_MODEL`로 오버라이드). adaptive thinking +
  effort `medium` — 구조 보존형 한국어 퇴고에 품질·지연 균형.
- **스트리밍**: `messages.stream`을 SSE(`data: {text|error|done}`)로 프록시. 긴 글의 HTTP
  타임아웃 회피 + 에디터에서 토큰 실시간 표시. 미들웨어가 `/api/revise`를 게이트.
- **프롬프트**: 마크다운 구조·코드블록 불변·문단 분할 유지를 시스템 프롬프트로 강제. 수정
  방향은 프리셋(간결/기술 정확성/문장 호흡/독자 눈높이/제목 제안) + 자유 지시. 프리셋 정의는
  `features/lapidary/presets.ts`에 두어 UI·서버가 공유.
- **청킹**: 개인 블로그 글 길이는 1M 컨텍스트에 충분해 현재는 전체 1회 요청. 헤딩 섹션 청킹은
  아주 긴 글에서만 필요 → Phase 5로 미룸.

### diff 계산은 클라이언트에서 (`features/lapidary/diff/`)

- 2단계: ① 블록 LCS 정렬(정규화 텍스트 동일성) → ② 짝지어진 블록 내부만 어절 단위 diff.
- 한국어는 공백 토큰화가 부정확 → `Intl.Segmenter('ko', 'word')`로 어절 분할. 공백·문장부호
  세그먼트까지 보존해 join 시 원문이 정확히 복원(무손실 머지의 전제).
- **hunk 상태**: `{ id, kind, original, revised, words, status }`, status ∈
  `pending|accepted|rejected|edited`. 머지 규칙 = **미결정(pending)은 원문 유지**(수락해야 반영)
  이라 검토 안 한 diff를 머지하면 원문이 그대로 나온다. 라운드: 머지 결과를 에디터 본문에
  반영 → 다시 `퇴고`로 재실행.
- 표시: unified(통합) / split(좌우) 토글. hunk 상태는 zustand로 세밀 구독(행별 재렌더).

## 스캐폴딩 결정 로그 (Phase 4, 2026-07)

커스텀 WYSIWYG 에디터를 구현하며 확정한 선택과 근거. 한글 IME가 최대 난제였다.

### 블록 단위 contenteditable + uncontrolled-after-mount (한글 IME 해법)

- 블록마다 독립 contenteditable(Notion 방식). **React가 마운트 후 innerHTML을 다시 쓰지
  않는다** — 캐럿 아래 DOM을 건드리지 않으므로 한글 조합이 깨지지 않는다.
- `compositionstart/end` 가드: 조합 중에는 DOM을 읽어 모델에 반영하지 않고, `compositionend`
  에 한 번만 동기화. keydown은 `isComposing`이면 무시.
- **구조 변경(분할·병합·타입 전환)은 대상 블록에 새 id를 부여**해 React가 in-place로
  innerHTML을 덮어쓰는 대신 **깨끗이 remount**하게 한다. 타이핑은 상태를 전혀 건드리지 않고
  (DOM=uncontrolled, 값은 `contentRef`에 보관), 직렬화는 필요할 때만. 새 블록 포커스는 타이머가
  아니라 **마운트 시점(registerEl)** 에 적용해 race를 없앤다.
- 코드블록은 contenteditable 대신 textarea(언어+코드). 이미지/리스트는 간단 편집.

### 편집 기능

- 마크다운 단축 입력: 줄 시작에서 `#`/`##`/`###`·`-`/`*`·`>`·`1.` + space → 블록 타입 전환.
- Enter=문단 분할(caret 기준 Range로 앞/뒤 분리), Backspace(시작)=이전 블록 병합 또는 타입 강등.
- 인라인 마크: bold/italic는 `execCommand`(styleWithCSS off로 `<b>/<i>` 태그 강제), code/link는
  Range 수동 wrap. 붙여넣기는 plaintext로 새니타이즈. undo/redo는 스냅샷 스택 + 강제 remount.
- 인라인 직렬화(`entities/document/inline.ts`): 블록 텍스트 마크다운 ↔ HTML(bold/italic/code/link).

### 트랙 분리 — 마크다운 ↔ 에디터 모드 토글

- 에디터가 블로그를 블로킹하지 않도록(CLAUDE.md), `body`(마크다운)를 canonical로 두고
  마크다운 textarea와 WYSIWYG를 **모드 토글**로 공존. WYSIWYG는 블록 모델로 body를 parse/serialize
  → 발행·프리뷰·lapidary가 그대로 body를 읽는다. 크로스 블록 선택은 MVP 제외.

### 검증

- Playwright + CDP `Input.imeSetComposition`으로 **실제 한글 조합**(하→한 등) 시뮬레이션 →
  중복·자모 잔여 없이 커밋되고 마크다운으로 무손실 왕복함을 확인. 마크다운 단축·Enter 분할·
  bold 툴바·모드 토글 왕복도 브라우저 e2e로 검증.

## 스캐폴딩 결정 로그 (Phase 5, 2026-07)

고도화 항목 중 이미지 업로드와 퇴고 라운드 히스토리를 구현했다.

### 이미지 업로드 → GitHub Contents API 재사용 (`/api/upload`)

- **선택**: 발행에 이미 쓰는 GitHub Contents API를 재사용해 `public/uploads/`에 커밋하고,
  `raw.githubusercontent.com` URL을 반환한다(별도 Blob 스토리지 미도입).
- **근거**: git-as-CMS 일관성 + 새 의존성/토큰 없음(기존 `GITHUB_TOKEN` 재사용). raw URL은
  커밋 즉시 사용 가능하고 배포 후에도 유효 → `public/uploads/`의 배포-후-노출 지연 문제를 회피.
  **공개 레포 전제**. Velite 이미지 파이프라인으로 승격(로컬 최적화·`/uploads` 경로)은 후속.
- 미들웨어가 `/api/upload` 게이트. 이미지 mime·5MB 검증. 에디터 이미지 블록의 업로드 버튼 +
  WYSIWYG 툴바의 `+ 이미지`/`+ 코드` 블록 삽입.

### 퇴고 라운드 히스토리 → zustand persist (`features/lapidary/rounds.ts`)

- **선택**: 적용된 머지를 `{presets, instruction, before, after, at}`로 localStorage에 지속
  (zustand `persist`), 최근 30개 유지.
- **근거**: 라운드 반복 중 이전 상태로 **되돌리기**가 필요(before로 복원). 크로스 세션 지속으로
  글을 이어 쓸 때도 기록이 남는다. 에디터 액션바의 `라운드 기록` 버튼 → 목록·되돌리기 모달.

## 아티클 파이프라인 (이 블로그의 존재 이유)

구축 과정 자체가 첫 발행 글 소재. 후보:

1. 블로그 구축기 — git을 CMS로 쓰기 (GitHub Contents API 발행 플로우)
2. AI 퇴고 diff 엔진 만들기 — 한국어 텍스트 diff와 `Intl.Segmenter`
3. contenteditable과 한글 IME 분투기 (Phase 4 이후)
