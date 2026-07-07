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
- 상태 관리: 에디터/lapidary의 hunk 상태는 세밀한 구독이 필요 → signal 계열
  또는 zustand. 스캐폴딩 시점에 결정하고 근거를 여기 남길 것.
- 커밋은 Phase-체크포인트 단위로 작게.

## 아티클 파이프라인 (이 블로그의 존재 이유)

구축 과정 자체가 첫 발행 글 소재. 후보:

1. 블로그 구축기 — git을 CMS로 쓰기 (GitHub Contents API 발행 플로우)
2. AI 퇴고 diff 엔진 만들기 — 한국어 텍스트 diff와 `Intl.Segmenter`
3. contenteditable과 한글 IME 분투기 (Phase 4 이후)
