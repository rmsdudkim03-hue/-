# BUCKET LIST — 전시 방명록

전시장 QR을 찍어 휴대폰으로 들어와서, 로그인 없이 **색(6가지) + 모양(네모·세모·동그라미)을 고르고 버킷리스트 한 줄 + 이름(선택)** 을 남기는 방명록.

- 관람객 화면 `/` : 글 하나 = 격자 판(가로 8칸) 위의 도형 하나. 도형을 누르면 글이 보임. 30초마다 새 글이 붙음
- 쓰기: '나도 남기기' → 색·모양 고르기 → 한 줄(80자) + 이름(12자, 선택)
- 관리 화면 `/admin.html` : `ADMIN_CODE` 입력 → 글 지우기, 엑셀(CSV)·JSON으로 전체 내려받기
- 나쁜 말 거르기: `api/_badwords.js` 단어 목록 + OpenAI 검사(moderation, 무료. `OPENAI_API_KEY`가 있을 때만)
- 같은 기기는 10초에 한 번만 쓸 수 있음 (도배 막기)

## Vercel에 올리기
1. Vercel → Add New → Project → 이 저장소 선택 → Deploy (설정은 그대로)
2. Vercel → 프로젝트 → Storage → Create → **Blob** (접근: **Public**) → 이 프로젝트에 연결
3. Settings → Environment Variables
   | 이름 | 필수 | 설명 |
   |---|---|---|
   | `ADMIN_CODE` | 필수 | 관리 화면 비밀번호 (없으면 관리 화면을 못 씀) |
   | `OPENAI_API_KEY` | 선택 | 있으면 단어 목록에 없는 나쁜 말도 AI가 한 번 더 거름 (무료 기능) |
4. Deployments → 맨 위 배포 → Redeploy (환경 변수는 다시 배포해야 적용됨)
5. 배포 주소를 QR로 만들어 전시장에 붙이기

`main`에 푸시하면 자동으로 다시 배포됨.

## 파일
| 파일 | 하는 일 |
|---|---|
| `index.html` `app.js` | 관람객 화면 |
| `admin.html` `admin.js` | 관리 화면 |
| `style.css` | 디자인 (색은 맨 위 `:root`에서 바꿈) |
| `api/bucket.js` | 서버: 글 읽기·쓰기·지우기 |
| `api/_badwords.js` | 나쁜 말 목록 (단어를 더하려면 `KO` / `EN`에) |
| `api/_lib.js` | 저장소(Vercel Blob) 도구 |

글은 저장소에 `bucket/글id.json` (`{ text, name, shape, color, at }`)으로 하나씩 저장됨.
도형 자리는 글 순서와 글id로 정해져서 누가 열어도 같은 모양 (글을 지우면 그 뒤 도형 자리가 바뀔 수 있음).

## 로컬 테스트
`BLOB_LOCAL_DIR=폴더`를 주면 저장소 대신 그 폴더에 저장 (`vercel dev` 등으로 실행).
