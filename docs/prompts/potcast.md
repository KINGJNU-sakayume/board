# potcast 저장소 프롬프트 — 보드 타일

아래 구분선 아래를 **potcast** 작업 세션에 그대로 붙여 넣으세요.

---

이 저장소(potcast, Life Hub 목적지 id `potcast`)에서 Life Board(https://github.com/KINGJNU-sakayume/board)에 보낼 **보드 타일**을 정하고, 그 데이터를 만드는 코드를 추가해 주세요. README도 함께 갱신합니다.

## 먼저 읽을 것
1. 보드 디자인 규칙: https://github.com/KINGJNU-sakayume/board/blob/main/docs/DESIGN.md (톤, 크기, 하지 않는 것)
2. 보낼 JSON 규격 v1: https://github.com/KINGJNU-sakayume/board/blob/main/docs/TILES.md (검증 코드는 board 저장소 `js/schema.js`)
3. 이 앱의 후보 타일: https://github.com/KINGJNU-sakayume/board/blob/main/docs/CANDIDATES.md 의 「potcast (`potcast`)」 절
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
6. README에 「보드 타일」 절을 추가합니다: 어떤 타일을 왜 보내는지, 크기, 기본 여부, 데이터 출처, 그리고 **아직 Hub로 보내지 않는다**는 점.

## 하지 말 것
- Life Hub로 보내는 코드. Hub 보드 API는 아직 없습니다. 없는 API를 호출하거나 있는 척하지 말고, 함수와 예시 출력까지만 만듭니다.
- 보드 화면 코드나 CSS를 이 저장소에 만들기. 모양은 보드가 정하고, 이 저장소는 데이터만 만듭니다.
- 새 색·테마색 정하기(포인트색은 표지에서), HTML 조각 보내기.
- board 저장소나 다른 저장소 고치기.

## 이 앱에서 특히 볼 것
- `now`(지금 듣는 앨범)는 미디어 그룹의 `hero`입니다. 그룹마다 hero는 하나라서, 이 앱의 다른 타일은 hero로 만들지 마세요.
- 앨범 표지가 어느 출처에서 오는지 확인해 주세요. 허용 출처 밖이면 표지 없이 보내고 board 쪽 허용 요청 목록에 적어 주세요.
- 트랙 진행(`트랙 6 / 14`)과 들은 횟수는 앱이 실제로 세는 값만 씁니다. 세지 않는 값을 추정해 넣지 마세요.

## 끝나면 알려 줄 것
- 고른 타일 표(id, 이름, 톤·형태, 크기, 기본, 데이터 출처)
- 예시 출력 JSON 경로와 규격 검사 결과
- 이 저장소의 기존 검사(테스트·빌드) 결과
- board 쪽에 요청할 것(허용 출처 추가, 규격에 없는 필드가 필요한 경우 등)
