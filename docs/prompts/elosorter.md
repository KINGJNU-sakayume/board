# ELO Sorter 저장소 프롬프트 — 보드 타일

아래 구분선 아래를 **elosorter** 작업 세션에 그대로 붙여 넣으세요.

---

이 저장소(ELO Sorter, Life Hub 목적지 id `elosorter`)에서 Life Board(https://github.com/KINGJNU-sakayume/board)에 보낼 **보드 타일**을 정하고, 그 데이터를 만드는 코드를 추가해 주세요. README도 함께 갱신합니다.

## 먼저 읽을 것
1. 보드 디자인 규칙: https://github.com/KINGJNU-sakayume/board/blob/main/docs/DESIGN.md (톤, 크기, 하지 않는 것)
2. 보낼 JSON 규격 v1: https://github.com/KINGJNU-sakayume/board/blob/main/docs/TILES.md (검증 코드는 board 저장소 `js/schema.js`)
3. 이 앱의 후보 타일: https://github.com/KINGJNU-sakayume/board/blob/main/docs/CANDIDATES.md 의 「ELO Sorter (`elosorter`)」 절
4. 이 저장소의 AGENTS.md·CLAUDE.md·README, 그리고 실제 상태(저장 형식) 코드

## 진행 순서
1. 코드를 읽고, 후보 타일마다 **이 앱이 실제로 가진 데이터로 채울 수 있는지** 표로 정리해 주세요(타일 필드 → 앱 데이터 출처). 채울 수 없는 후보는 빼고, 앱 데이터로 만들 수 있는 좋은 타일이 더 있으면 후보에 더해 주세요. 원칙은 "이번 주 몇 개" 같은 거시 통계보다 **최근 흐름**(지금 하는 것, 최근에 끝낸 것, 다음 차례)입니다.
2. 그 표를 저에게 보여주고 **만들 타일, 처음부터 보일 타일(`default`), 허용 크기(`sizes`)와 처음 크기(`size`)** 를 제가 고르게 해 주세요. 제가 고르기 전에는 구현하지 마세요.
3. 고른 타일로:
   - 앱 상태에서 manifest(v1)를 만드는 **순수 함수**(예: `buildBoardTiles(state, now)`)를 추가합니다. 네트워크·저장소 접근 없이 입력만으로 결과가 정해지게 합니다.
   - 타일 `id`는 후보 표의 id를 쓰고, 한 번 정하면 바꾸지 않습니다(사용자 배치가 id로 저장됩니다).
   - 표지가 있으면 `accent {h, s}`를 함께 보냅니다. 표지 주소는 board 허용 출처 안이어야 합니다(현재 `https://kingjnu-sakayume.github.io`, `https://image.aladin.co.kr`, `https://upload.wikimedia.org`). 다른 출처가 필요하면 그 표지는 빼고(글자 칸) 저에게 알려 주세요.
   - 이미지는 **주소만** 넣습니다. `data:` 이미지(글자로 바꾼 이미지)는 넣지 않습니다(Hub가 거절함). 목록 전체는 64 KiB 이하.
   - `href`는 이 앱의 GitHub Pages 주소(`https://kingjnu-sakayume.github.io/...`)만 씁니다.
   - 데이터가 없을 때(처음 쓰는 사용자 등)의 결과도 정합니다: 타일을 빼거나 `muted` 행으로 빈 상태를 보여주기.
   - 글자 길이 제한(라벨 80자, 긴 문장 160자, 이름 30자 등)을 넘으면 함수 안에서 자릅니다.
4. 지어낸 값으로 된 예시 상태를 넣어 만든 **예시 출력 JSON**을 저장소에 둡니다(예: `board/sample.json`). 실제 기록·개인 데이터·토큰은 넣지 않습니다.
5. 테스트:
   - 예시 출력이 규격 v1을 통과하는지. board 저장소의 `js/schema.js`를 테스트용으로 복사해 `validateManifest`로 검사하고, 복사한 파일 맨 위에 출처 커밋과 날짜를 주석으로 남깁니다.
   - 빈 상태, `sizes`/`size`, id 고정, 길이 자르기.
6. **Life Hub에 올리기** (Hub 쪽 API는 배포돼 있습니다: life-hub `docs/P7_BOARD.md` 5장)
   - 요청: `PUT https://life-hub-api.213303.workers.dev/elosorter/v1/board`, 헤더 `Authorization: Bearer <이 앱의 기존 Life Hub 토큰>`, `Content-Type: application/json`, 본문은 위 함수가 만든 manifest(`generated_at`은 올리는 순간의 시각).
   - 권한: 스코프 `elosorter:board`. 이 앱이 이미 쓰는 Life Hub 연결(토큰 갱신·해제 코드)을 그대로 쓰고, 연결할 때 요청하는 scope 문자열에도 `elosorter:board`를 더합니다. **이 권한 전에 연결한 기기**는 업로드가 `403` + `WWW-Authenticate: ... error="insufficient_scope"`로 옵니다. 이때 **토큰을 지우지 말고**(수신함·동기화는 계속 돼야 함) "보드에 올리려면 Life Hub에 다시 연결" 안내만 띄웁니다. 다른 401/403은 기존 연결 코드의 규칙을 따릅니다.
   - 응답: `200`이면 저장(`{ unchanged: true }`는 같은 내용, `{ ignored: true }`는 더 새 목록이 이미 있음 — 둘 다 성공으로 칩니다). `400`·`413`은 이 앱 쪽 버그이니 같은 내용으로 다시 보내지 말고 개발자 콘솔에만 남깁니다. 네트워크 오류·`5xx`는 다음 기회에 다시.
   - 빈도: 타일에 영향을 주는 변화가 있을 때 **10분에 한 번 이하**로 모아서, 마지막으로 성공한 본문의 sha256(`generated_at` 빼고 계산)과 다를 때만. 앱을 열 때 마지막 성공이 하루보다 오래됐으면 한 번. Life Hub에 연결돼 있지 않으면 아무것도 하지 않습니다.
   - 마지막 성공 sha·시각은 localStorage에 둡니다(개인 데이터 아님). 업로드 실패가 앱의 다른 기능을 막지 않게 합니다.
   - 테스트: 가짜 fetch로 저장·unchanged·ignored·insufficient_scope(토큰 유지)·400(재시도 안 함)·디바운스·sha 같으면 안 보냄.
7. README에 「보드 타일」 절을 추가합니다: 어떤 타일을 왜 보내는지, 크기, 기본 여부, 데이터 출처, 언제 올리는지, 다시 연결이 필요한 경우.

## 하지 말 것
- Hub에 이 앱의 기록 자체를 올리기. 올리는 것은 보드용 목록(manifest)뿐입니다.
- 업로드 실패를 이유로 Life Hub 토큰을 지우기(위 insufficient_scope 규칙).
- 보드 화면 코드나 CSS를 이 저장소에 만들기. 모양은 보드가 정하고, 이 저장소는 데이터만 만듭니다.
- 새 색·테마색 정하기(포인트색은 표지에서), HTML 조각 보내기.
- board 저장소나 다른 저장소 고치기.

## 이 앱에서 특히 볼 것
- 이 앱은 Hub에 수신함 없이 sync만 하는 목적지입니다. 순위는 기기 안 세션 상태에서 계산하고, sync 코드와 섞지 마세요.
- 순위 변동(`trend`)은 직전 비교 전후 순위를 앱이 실제로 알 때만 넣습니다. 모르면 빼세요.
- 정렬 대상에 표지가 없을 수 있습니다. 없으면 썸네일 없이 보내면 됩니다.

## 끝나면 알려 줄 것
- 고른 타일 표(id, 이름, 톤·형태, 크기, 기본, 데이터 출처)
- 예시 출력 JSON 경로와 규격 검사 결과
- 업로드 연결 방식(언제 올리는지)과 테스트 결과, 배포 후 다시 연결이 필요한지
- 이 저장소의 기존 검사(테스트·빌드) 결과
- board 쪽에 요청할 것(허용 출처 추가, 규격에 없는 필드가 필요한 경우 등)
