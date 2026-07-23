# 리액트 게시판 (react-board)

React + Vite + Supabase로 만든 간단한 게시판입니다.
회원가입/로그인 후 글을 쓰고, 본인이 쓴 글만 수정·삭제할 수 있습니다.

## 주요 기능

- 게시글 목록 (15개씩 페이지네이션)
- 게시글 작성 / 상세 보기 / 수정 / 삭제
- 이메일 회원가입 · 로그인 (Supabase Auth)
- 닉네임 (가입 시 지정, 중복 불가, 변경 불가)
- 본인 글만 수정/삭제 가능 (작성자 확인)
- 제목·내용 빈 값 검증 및 글자수 제한(제목 30자, 내용 500자)
- 인증 에러 메시지 한글 안내

## 기술 스택

- **프론트엔드**: React 19, React Router 7, Vite
- **백엔드/DB**: Supabase (Database + Auth)
- **배포**: Vercel

## 폴더 구조

```
src/
├─ App.jsx            # 라우팅 + 헤더 + 게시글 목록 상태 관리
├─ main.jsx           # 진입점 (Router / AuthProvider 설정)
├─ AuthContext.jsx    # 로그인 사용자 정보 Context
├─ authErrors.js      # Supabase 인증 에러 → 한글 메시지 변환
├─ format.js          # 작성자·날짜 표시 형식 변환
├─ supabase.js        # Supabase 클라이언트 생성
├─ components/
│  └─ Modal.jsx       # 안내용 / 확인용 모달
└─ pages/
   ├─ PostList.jsx    # 목록 + 페이지네이션
   ├─ PostWrite.jsx   # 글쓰기
   ├─ PostDetail.jsx  # 상세 보기 + 삭제
   ├─ PostEdit.jsx    # 글 수정
   ├─ Login.jsx       # 로그인
   ├─ Signup.jsx      # 회원가입
   ├─ ComingSoon.jsx  # 아직 만들지 않은 메뉴 안내
   └─ NotFound.jsx    # 없는 주소 안내
```

## 로컬 실행 방법

1. 저장소 클론 후 의존성 설치

   ```bash
   npm install
   ```

2. `.env.example`을 복사해 `.env` 파일을 만들고 Supabase 값을 채웁니다.

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

## 스크립트

| 명령어            | 설명                     |
| ----------------- | ------------------------ |
| `npm run dev`     | 개발 서버 실행           |
| `npm run build`   | 프로덕션 빌드            |
| `npm run preview` | 빌드 결과 미리보기       |
| `npm run lint`    | ESLint 검사              |
