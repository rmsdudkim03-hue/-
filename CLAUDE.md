# CLAUDE.md — BUCKET LIST 방명록

전시 방명록 대신 쓰는 '버킷리스트 방명록' 웹. 관람객이 전시장 QR로 휴대폰 접속 → 로그인 없이 버킷리스트 한 줄 + 이름(선택) → 모두에게 최신순으로 보임.

## 작업자와 소통
- 작업자는 디자이너(웹 개발 초보). 디자인은 피그마에서 하고, 코드는 Claude가 맡는다.
- 설명은 한국어 반말로 짧고 구조적으로. 전문 용어는 풀어서.
- 코드 주석도 한국어로, 디자이너가 읽을 수 있게.

## 디자인
- 휴대폰 세로 화면 전용 (넓은 화면에선 가운데 480px 한 줄). 지금 디자인은 임시 — 작업자가 피그마 디자인을 주면 맞춘다.
- 흰 배경, 폰트 Apple SD Gothic Neo → Noto Sans KR. 입력칸 글자는 16px 이상 (아이폰 확대 방지).

## 구조
- `index.html` `app.js` 관람객 화면: 글 남기기, 최신 30개 + '더 보기', 30초마다 새 글 확인, 내가 쓴 글은 localStorage에 기억해 노란 배경
- `admin.html` `admin.js` 관리 화면: `ADMIN_CODE`(헤더 x-admin-code)로 글 전체 보기·지우기·CSV(엑셀용 BOM)/JSON 내려받기
- `api/bucket.js` 서버 (GET 목록 · POST 쓰기 · POST { remove } 지우기 · GET ?admin=1 전체). 글자 수 80 / 이름 12, 같은 IP 10초 간격
- `api/_badwords.js` 나쁜 말: 단어 목록(숫자·기호 무시, 3글자 이상은 띄어 써도 걸림, 평범한 말 예외 목록) + OpenAI moderation(무료, 키 있을 때). '죽기 전에'가 많아서 자해·폭력 일반 항목은 안 막음
- `api/_lib.js` Vercel Blob 저장소 도구. 글은 `bucket/글id.json`, 글id 앞부분이 '거꾸로 시간'이라 이름순 = 최신순

## 배포
- `main`에 푸시하면 Vercel 자동 배포. 환경 변수: `ADMIN_CODE`(필수), `OPENAI_API_KEY`(선택), Blob 저장소(Public) 연결
- 로컬 테스트: `BLOB_LOCAL_DIR=폴더`
