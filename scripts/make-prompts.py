#!/usr/bin/env python3
"""docs/prompts/*.md 를 만든다. 앱별 프롬프트는 같은 틀에 앱마다 다른 부분만 끼운다.

앱마다 다른 값:
  app      Life Hub 목적지 id (= manifest 의 app, 스코프 앞부분)
  repo     GitHub 저장소 이름
  name     앱 이름
  section  docs/CANDIDATES.md 의 절 제목
  hubfile  그 저장소에서 Life Hub 요청 함수가 있는 파일 (401/403 이면 토큰을 지우는 곳)
  kind     'sync'  : 기록이 Hub 동기화로 기기 간에 맞춰지는 앱
           'device': 기록이 기기 안에만 있는 앱 (여러 기기가 서로 덮어쓸 수 있음)
  extra    「이 앱에서 특히 볼 것」
"""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / "docs" / "prompts"
B = "https://github.com/KINGJNU-sakayume/board/blob/main/docs/"

APPS = [
  dict(app="animan", repo="animan", name="AniMan", section="AniMan (`animan`)", hubfile="src/lifehub/remote.ts", kind="sync", extra="""\
- 작품마다 `accent_color`가 `#색 코드`로 있습니다. `accent {h, s}`(h 0~360, s 0~1)로 바꿔 보내고, 바꾸는 함수도 테스트해 주세요.
- 작품 표지(`cover_url`)는 지금 모두 허용 출처 밖(wallpapers.com, nflxso.net 등)이라 글자 칸이 됩니다. 권(volume) 표지는 대부분 알라딘이라 허용 안입니다. 1단계 표에 "작품 표지(글자 칸)"와 "지금 보는 권 표지(알라딘)"를 함께 적어 제가 고르게 해 주세요.
- 진행 기록은 Hub와 sync 문서로 오갑니다(`animan:sync`). 타일 함수는 sync 코드와 섞지 말고, 진행 기록 저장소(`src/lib/progress/store.ts`)의 상태를 입력으로 받게 하세요.
- `now` 타일의 뒷면 목록(`list`)과 상세(`detail`)는 같은 "최근 정주행" 데이터를 다른 개수로 씁니다(뒷면 3~5, 상세 5)."""),
  dict(app="letterbookxd", repo="letterbookxd", name="책장", section="책장 (`letterbookxd`)", hubfile="src/lifehub/remote.ts", kind="sync", extra="""\
- 표지는 알라딘(image.aladin.co.kr)·위키미디어면 허용 출처 안입니다. 몇몇 책은 다른 출처(namu.wiki, nl.go.kr 등)라 글자 칸이 됩니다. 몇 권인지 표에 적어 주세요.
- 알라딘 Open API는 2026-10-30에 종료됐습니다. 이미 저장된 image.aladin.co.kr 주소가 계속 열린다는 보장은 없으니, 표지가 안 열리면 글자 칸으로 넘어가는지(보드가 처리) 정도만 확인하고 표지 출처를 바꾸는 작업은 따로 합니다.
- 판본(`editions`)의 권 정보로 `series`(칸 채우기) 타일을 만들 수 있는지 확인해 주세요.
- 이 앱에는 밑줄·인용 기능이 없으니 후보의 `quote`는 빼 주세요.
- 독서 기록은 Hub와 sync 문서로 오갑니다(`letterbookxd:sync`). 보드 타일 함수는 sync 코드와 섞지 마세요."""),
  dict(app="potcast", repo="potcast", name="potcast", section="potcast (`potcast`)", hubfile="src/lifehub/remote.ts", kind="device", extra="""\
- 이 저장소 AGENTS.md는 요청 없이 화면을 바꾸지 말라고 합니다. 이 프롬프트가 그 명시적 요청입니다: 보드 업로드의 '다시 연결' 안내와 '이 기기에서 보드에 올리기' 설정은 화면에 더해도 됩니다. 재생 동작과 기존 번역·노트는 바꾸지 마세요.
- `now`(지금 듣는 앨범)는 미디어 그룹의 `hero`입니다. 그룹마다 hero는 하나라서, 이 앱의 다른 타일은 hero로 만들지 마세요.
- 앨범 표지는 Spotify(`https://i.scdn.co`)에서 오고, 이 출처는 board 허용 목록에 있습니다. 표지 주소가 없는 앨범만 `cover: {mono}`로 보냅니다.
- 트랙 진행(`트랙 6 / 14`)과 들은 횟수는 앱이 실제로 세는 값만 씁니다(청취 기록 `ListenEvent` 등). 세지 않는 값을 추정해 넣지 마세요."""),
  dict(app="elosorter", repo="elosorter", name="ELO Sorter", section="ELO Sorter (`elosorter`)", hubfile="src/services/lifehub/remote.ts", kind="sync", extra="""\
- 이 앱은 Hub에 수신함 없이 sync만 하는 목적지입니다. 지금 연결 scope는 `elosorter:sync` 하나입니다. 순위는 기기 안 세션 상태에서 계산하고, sync 코드와 섞지 마세요.
- 순위 변동(`trend`)은 직전 비교 전후 순위를 앱이 실제로 알 때만 넣습니다. 세션의 비교 기록(`Match`)으로 직전 순위를 다시 계산할 수 있는지 확인하고, 못 하면 빼세요.
- 곡 표지는 Spotify(`https://i.scdn.co`)이고 board 허용 목록에 있습니다. 행 썸네일(`cover`)로 보낼 수 있습니다."""),
  dict(app="achievement", repo="achievement", name="업적 라이브러리", section="업적 라이브러리 (`achievement`)", hubfile="src/lifehub/remote.js", kind="device", extra="""\
- 활동 기록(운동 등)과 업적이 한 앱에 있습니다. `activity` 타일은 활동 기록 중 가장 최근 하나만 보여줍니다.
- 트로피 칸(`trophy`)은 카테고리 하나를 고르는 규칙이 필요합니다(가장 최근 취득한 카테고리 등). 규칙을 표에 적어 주세요. 카테고리당 업적은 지금 최대 43개라 칸(최대 60) 안에 들어갑니다.
- 기록 사진은 기기 안에만 저장되니 보드에 쓸 수 없습니다.
- 업적 정의 후보(Hub 제안)와 승인된 업적을 구분해, 보드에는 **승인되어 앱에 저장된 것만** 보냅니다."""),
  dict(app="sub", repo="sub", name="역 도장깨기", section="역 도장깨기 (`sub`)", hubfile="core/lifehub.js", kind="device", extra="""\
- 이미 `core/board.js`가 '안내판' 화면 모듈입니다. 보드 타일 코드는 `core/boardTiles.js`처럼 다른 이름으로 두세요.
- 빌드 없는 정적 파일 앱이고 package.json이 없습니다. 타일 함수는 기존 `window.Core` 방식을 따르되 Node 테스트에서도 불러 쓸 수 있게 하고, 테스트는 `tests/smoke.mjs` 방식을 따르세요.
- `station` 타일의 룰렛 후보(`roulette.candidates`)는 앱이 Hub에 공유하는 '지금 뽑을 수 있는 역(pool)'과 같은 기준으로, 최대 50개입니다. 50개보다 많을 때 고르는 규칙은 **결정적**이어야 합니다(`Math.random` 금지, 날짜를 시드로 섞기나 노선 순서 등). 무작위면 만들 때마다 내용이 달라져 중복 전송 방지가 무력해집니다. 규칙을 표에 적어 주세요.
- pool이 바뀌면(역을 찍어서 등) 보드 목록도 다시 만들어 올리는 흐름에 넣으세요. 이미 찍은 역이 후보에 남아 있으면 보드의 제안이 Hub에서 `409`로 거절됩니다.
- 룰렛 결과는 기록이 아니라 '제안'입니다. 보드가 보낸 제안은 수신함에 **출처 `board`**(키 `board:<…>`)의 `station_draw`로 들어옵니다(life-hub P7 B5).
- **수신함이 출처 `board`를 받게 고쳐 주세요.** 지금 `core/lifehub.js`의 키 검사가 `claude|chatgpt|codex|manual`만 받습니다. `board`를 더하되 `board`는 `station_draw`만 받게 하고, Claude가 뽑은 것과 똑같이 승인 흐름을 타게 합니다. 화면에는 '보드 룰렛에서 뽑음' 정도로 출처를 보여 주세요.
- 역 이름은 12자 이내(`plate.name`, 룰렛 후보)입니다. 지금 역 이름은 모두 12자 이내지만, 넘으면 자르는 처리와 테스트를 두세요."""),
  dict(app="kyeokyeoi", repo="kyeokyeoi", name="켜켜이", section="켜켜이 (`kyeokyeoi`)", hubfile="src/integration/lifehub.ts", kind="device", extra="""\
- 앱의 지역(`public/regions.json`)은 시군구 251개라 보드 격자 최대 200칸을 넘습니다. `regions`(map) 타일은 시도(`prov`) 단위로 묶은 격자를 제안해 주세요. 격자 배치(`cols`, 빈칸 `none`)는 코드 상수로 둡니다.
- 칸 이름은 **6자 이내**입니다(세종특별자치시는 7자라 거절). 시도 줄임말(서울, 경기, 세종 …)을 상수로 두세요.
- 사진은 기기 안(IndexedDB)에만 있어 보드에 쓸 수 없습니다.
- 추억·방문의 제목과 장소는 짧게 자르는 규칙(라벨 80자, 제목 160자)을 지켜 주세요."""),
  dict(app="food", repo="food", name="PALATE", section="PALATE (`food`)", hubfile="src/lib/lifehub-remote.ts", kind="device", extra="""\
- 식사 사진은 브라우저 저장소 안의 `data:` 이미지라 보드에 띄울 수 없습니다. `recent` strip은 항목의 `cover`를 빼거나 `{mono}`로 글자 칸을 보냅니다.
- '예시 아카이브' 모드(지어낸 기록)일 때는 올리지 않습니다.
- 보드에는 **승인되어 앱에 저장된** 식사·위시만 보냅니다. Hub 수신함의 대기 후보는 보내지 않습니다."""),
  dict(app="diaryroulette", repo="diaryroulette", name="일기 룰렛", section="일기 룰렛 (`diaryroulette`)", hubfile="src/integration/lifehub.ts", kind="device", extra="""\
- 오늘의 미션은 앱의 하루·쉬는 기간 규칙을 따른 결과만 보냅니다(보드가 미션을 새로 뽑지 않습니다). 일기 내용은 보내지 않습니다.
- 앱을 열지 않은 날에는 어제 만든 타일이 그대로 보드에 남습니다. 함수가 `now`로 날짜를 판단하는 것만으로는 이걸 막지 못하니, 타일에 **뽑은 날짜**를 넣어(`11/5 미션` 등) 지난 미션이 '오늘'로 읽히지 않게 해 주세요.
- 연속 기록은 `src/lib/streak.ts`의 계산을 다시 쓰고, 언제 기준인지 날짜를 함께 보여 주세요."""),
]

MULTI = {
  "sync": """   - **여러 기기**: 이 앱의 기록은 Hub 동기화로 기기 간에 맞춰집니다. 동기화를 받아 합친 **뒤의** 상태로 목록을 만들어, 받기 전의 옛 상태를 올리지 않게 합니다.""",
  "device": """   - **여러 기기**: 이 앱의 기록은 기기 안에만 있고, Hub는 앱마다 최신 목록 하나만 보관합니다. 두 기기가 번갈아 올리면 서로 덮습니다. 설정에 **'이 기기에서 보드에 올리기'**(기기별, localStorage)를 두고 꺼져 있으면 올리지 않습니다. 기본값(켬/끔)은 2단계에서 저에게 물어 주세요.""",
}
CHOOSE_DEVICE = {"sync": "", "device": ", '이 기기에서 보드에 올리기'의 기본값"}

TPL = """# {name} 저장소 프롬프트 — 보드 타일

아래 구분선 아래를 **{repo}** 작업 세션에 그대로 붙여 넣으세요.

---

이 저장소({name}, Life Hub 목적지 id `{app}`)에서 Life Board(https://github.com/KINGJNU-sakayume/board)에 보낼 **보드 타일**을 정하고, 그 데이터를 만들어 Life Hub에 올리는 코드를 추가해 주세요. README도 함께 갱신합니다.

## 먼저 읽을 것
1. 보드 디자인 규칙: {B}DESIGN.md (톤, 크기, 하지 않는 것)
2. 보낼 JSON 규격 v1: {B}TILES.md (검증 코드는 board 저장소 `js/schema.js`, 허용 출처는 `js/config.js`)
3. 이 앱의 후보 타일: {B}CANDIDATES.md 의 「{section}」 절
4. 이 저장소의 README와 (있으면) AGENTS.md·CLAUDE.md, 실제 상태(저장 형식) 코드, Life Hub 연결 코드(`{hubfile}`)

## 진행 순서
1. 코드를 읽고, 후보 타일마다 **이 앱이 실제로 가진 데이터로 채울 수 있는지** 표로 정리해 주세요(타일 필드 → 앱 데이터 출처). 채울 수 없는 후보는 빼고, 앱 데이터로 만들 수 있는 좋은 타일이 더 있으면 후보에 더해 주세요. 원칙은 "이번 주 몇 개" 같은 거시 통계보다 **최근 흐름**(지금 하는 것, 최근에 끝낸 것, 다음 차례)입니다.
2. 그 표를 저에게 보여주고 **만들 타일, 처음부터 보일 타일(`default`), 허용 크기(`sizes`)와 처음 크기(`size`){choose_device}** 를 제가 고르게 해 주세요. 제가 고르기 전에는 구현하지 마세요.
3. 고른 타일로:
   - 앱 상태에서 manifest(v1)를 만드는 **순수 함수**(예: `buildBoardTiles(state, now)`)를 추가합니다. 네트워크·저장소 접근 없이 입력만으로 결과가 정해지게 하고, 무작위를 쓰지 않습니다(같은 입력이면 같은 출력이어야 중복 전송 방지가 동작합니다).
   - 타일 `id`는 후보 표의 id를 쓰고, 한 번 정하면 바꾸지 않습니다(사용자 배치가 id로 저장됩니다).
   - **표지**: 이미지는 **주소만** 넣습니다(`data:` 이미지는 Hub가 목록째 거절). 주소는 board 허용 출처 안이어야 합니다(현재 `https://kingjnu-sakayume.github.io`, `https://image.aladin.co.kr`, `https://upload.wikimedia.org`, `https://i.scdn.co`). 공개 주소가 없거나 허용 출처 밖이면 `src`를 빼고 `cover: {{mono: '첫 글자'}}`로 글자 칸을 보냅니다. **sleeve·hero는 `cover` 자체를 빼면 타일이 거절되니 빼지 않습니다.** strip 항목과 행 썸네일은 `cover`를 빼도 됩니다. 필요한 출처는 저에게 알려 주세요.
   - 표지가 있으면 `accent {{h, s}}`를 함께 보냅니다(새 색을 정하지 않습니다).
   - `href`는 이 앱의 GitHub Pages 주소(`https://kingjnu-sakayume.github.io/...`)만 씁니다. 목록 전체는 UTF-8로 64 KiB 이하.
   - **글자 길이**: board `js/schema.js`의 최대 길이를 기준으로 함수 안에서 자릅니다. 짧아서 잘 걸리는 것: `mono` 2, 지도 칸 이름 6, `unit` 8, `foot`의 `k`·`v` 10, `plate.name`·룰렛 후보 12, 큰 숫자 `value` 12, `pill` 20, 행 `value` 24, 타일 `name` 30, 라벨 80, 긴 문장 160. 글자 수는 JavaScript `.length`로 셉니다.
   - **빈 글자 금지**: 선택 필드라도 `""`나 공백만 있는 글자는 타일째 거절됩니다. 값이 없으면 필드를 뺍니다.
   - **날짜**: 타일 글자는 앱을 다시 열 때까지 보드에 그대로 남습니다. "어제", "3일 전", "오늘"처럼 날이 지나면 틀려지는 말 대신 날짜(`11/5`)를 쓰거나 날짜를 함께 넣습니다. 날짜는 입력 `now`로 판단합니다.
   - 데이터가 없을 때(처음 쓰는 사용자 등)의 결과도 정합니다: 타일을 빼거나 `muted` 행으로 빈 상태를 보여주기.
4. 지어낸 값으로 된 예시 상태를 넣어 만든 **예시 출력 JSON**을 저장소에 둡니다(예: `board/sample.json`). 실제 기록·개인 데이터·토큰은 넣지 않습니다.
5. 테스트:
   - 예시 출력이 규격 v1을 통과하는지. board 저장소의 `js/schema.js`를 테스트용으로 복사하고(맨 위에 출처 커밋과 날짜를 주석으로), `validateManifest(manifest, policy)`로 검사합니다. **`policy`(`{{ imageOrigins, linkOrigins }}`, 값은 board `js/config.js`와 같게)를 꼭 넘기고**, `ok`만 보지 말고 **`errors`가 비었는지와 남은 타일 수가 입력과 같은지**를 확인합니다. `policy`를 빼거나 타일이 틀려도 `ok`는 `true`로 나옵니다.
   - 빈 상태, `sizes`/`size`, id 고정, 길이 자르기, 빈 글자 빼기, 주소 없는 표지(`{{mono}}`), 같은 입력이면 같은 출력.
6. **Life Hub에 올리기** (Hub 쪽은 배포돼 있습니다: life-hub `docs/P7_BOARD.md` 5장)
   - 요청: `PUT https://life-hub-api.213303.workers.dev{path}/v1/board`, 헤더 `Authorization: Bearer <이 앱의 기존 Life Hub 토큰>`, `Content-Type: application/json`, 본문은 위 함수가 만든 manifest(`generated_at`은 올리는 순간의 시각).
   - 권한: 스코프 `{app}:board`. 연결할 때 요청하는 scope 문자열에 `{app}:board`를 더합니다. 지금까지의 연결은 모두 이 권한 전에 만들어져, 첫 업로드가 `403` + `WWW-Authenticate: ... error="insufficient_scope"`로 옵니다.
   - **요청 함수를 따로 두세요.** `{hubfile}`의 기존 요청 함수는 401/403이면 Life Hub 토큰을 지워 연결을 끊습니다. 그대로 쓰면 첫 업로드가 수신함·동기화 연결까지 끊습니다. 토큰 읽기·갱신 코드는 다시 쓰되, 보드 업로드용 요청 함수는 따로 두고 403에서 `insufficient_scope`를 **먼저** 확인합니다. 그렇다면 **토큰을 지우지 말고** "보드에 올리려면 Life Hub에 다시 연결" 안내만 띄웁니다. 401이 토큰 갱신 뒤에도 계속되거나 다른 403이면 기존 규칙(연결 해제)을 따릅니다.
   - 응답: `200`이면 성공입니다(`{{ unchanged: true }}`는 같은 내용, `{{ ignored: true }}`는 더 새 목록이 이미 있음 — 둘 다 성공). `400`·`413`은 이 앱 쪽 버그이니 같은 내용으로 다시 보내지 말고 개발자 콘솔에만 남깁니다(기기 시계가 5분 넘게 빠르면 `generated_at` 때문에 `400`이 날 수도 있습니다). 네트워크 오류·`5xx`는 다음 기회에 다시.
   - 빈도: 타일에 영향을 주는 변화가 생기면, 마지막 업로드에서 10분이 지났으면 바로, 아니면 10분이 차는 때 한 번 보냅니다(**10분에 한 번 이하**). 보낼 것이 남은 채 앱이 닫힐 수 있으니 '보낼 것 있음' 표시를 localStorage에 두고, 다음에 앱을 열 때 바로 보냅니다. 내용 비교는 마지막으로 성공한 본문의 sha256(`generated_at` 빼고 계산)으로 하고, 같으면 보내지 않습니다.
   - 하루 한 번: 앱을 열 때 마지막 성공이 하루보다 오래됐으면 **내용이 같아도** 한 번 보냅니다. 보드의 '오래됨'(14일)은 Hub가 받은 시각 기준이라, 안 보내면 매일 쓰는 앱도 오래됨으로 보입니다.
   - 올리지 않는 경우: Life Hub에 연결돼 있지 않을 때, 예시·체험 모드일 때, 이 앱의 기록이 하나도 없을 때(새 기기가 빈 목록으로 덮지 않게).
{multi}
   - 마지막 성공 sha·시각·'보낼 것 있음'은 localStorage에 둡니다(개인 데이터 아님). 업로드 실패가 앱의 다른 기능을 막지 않게 합니다.
   - 테스트: 가짜 fetch로 저장·unchanged·ignored·insufficient_scope(토큰 유지)·다른 403(기존 규칙)·400(재시도 안 함)·10분 제한·sha 같으면 안 보냄·하루 지나면 같아도 보냄·'보낼 것 있음'이 다음 실행에서 나감·기록 없음/예시 모드에서 안 보냄.
7. README에 「보드 타일」 절을 추가합니다: 어떤 타일을 왜 보내는지, 크기, 기본 여부, 데이터 출처, 언제 올리는지, 어느 기기에서 올리는지, 다시 연결이 필요한 경우.

## 하지 말 것
- Hub에 이 앱의 기록 자체를 올리기. 올리는 것은 보드용 목록(manifest)뿐입니다.
- 보드 업로드의 실패나 권한 부족을 이유로 Life Hub 토큰을 지우거나 연결을 끊기(위 insufficient_scope 규칙).
- 보드 화면 코드나 CSS를 이 저장소에 만들기. 모양은 보드가 정하고, 이 저장소는 데이터만 만듭니다.
- 새 색·테마색 정하기(포인트색은 표지에서), HTML 조각 보내기.
- board 저장소나 다른 저장소 고치기.

## 이 앱에서 특히 볼 것
{extra}

## 끝나면 알려 줄 것
- 고른 타일 표(id, 이름, 톤·형태, 크기, 기본, 데이터 출처)
- 예시 출력 JSON 경로와 규격 검사 결과(`errors` 개수, 타일 수)
- 업로드 연결 방식(언제, 어느 기기에서 올리는지)과 테스트 결과, 배포 후 다시 연결이 필요한지
- 이 저장소의 기존 검사(테스트·빌드) 결과
- board 쪽에 요청할 것(허용 출처 추가, 규격에 없는 필드가 필요한 경우 등)
"""

LIFEHUB = """# life-hub 저장소 프롬프트 — 보드 API 설계 (P7)

> **완료됨 (2026-11-05)**: 설계는 life-hub PR #43, B1 구현·배포는 PR #44. 기록용으로 남겨 둡니다.

아래 구분선 아래를 **life-hub** 작업 세션에 그대로 붙여 넣으세요.

---

Life Board(https://github.com/KINGJNU-sakayume/board)가 앱 타일을 실제 데이터로 보여주려면 Life Hub에 **보드 API**가 필요합니다. 이번 작업은 **설계 문서 갱신까지**이고, 구현은 제가 설계를 승인한 뒤 따로 지시합니다.

## 먼저 읽을 것
1. 이 저장소 AGENTS.md (원격 동기화 전에 신원·저장·폐기·재전송·충돌을 먼저 설계할 것, fail closed, 없는 API 흉내 금지)
2. 이 저장소 docs/P7_BOARD.md (예전 초안이라 아래 결정과 다른 곳이 있음), docs/P6_SYNC.md, src/destinations.js, sync 구현
3. board 저장소 {B}TILES.md (앱이 보낼 manifest 규격 v1), {B}DESIGN.md, {B}CANDIDATES.md

## 이미 정한 것
- 보드는 별도 저장소 `board`의 정적 사이트(GitHub Pages)입니다. Hub 화면이 아닙니다.
- 각 앱이 **보드용 목록(manifest v1)** 을 만들어 올리고, Hub는 앱마다 **최신 하나**를 보관하고, 보드는 읽기만 합니다.
- 늦게 도착한 옛 목록은 `generated_at`으로 버립니다.
- Hub가 직접 만드는 타일: **승인된 Claude 메모**(자유 글)와 **받은 제안 수**.
- 보드의 룰렛 결과(역 도장깨기)는 기록이 아니라 기존 제안 흐름(`propose_station_draw`와 같은 수신함)으로 들어가는 **제안**입니다.
- 보드 배치(어느 타일을 어디에 어떤 크기로)는 지금 브라우저 localStorage(`board.layout.v1`, 형식 `{{v:1, g:{{그룹: [[id, size], ...]}}, tray:[id...]}}`)에 있고, Hub에 저장해 기기 간에 맞추는 것이 목표입니다.
- 앱 권한은 sync처럼 **수신함과 함께 기본 부여**하는 방향(PR #42와 같은 원칙).
- 기록을 잘게 저장하는 청크 저장은 P8로 미룹니다.

## 설계 문서에서 정할 것 (docs/P7_BOARD.md 를 다시 씀)
1. 앱 → Hub 업로드: 경로(예: `PUT /<app>/v1/board`), 스코프 이름, 크기 제한, 검증 수준(Hub가 규격 v1을 어디까지 검사할지; 보드는 다시 검사함), 같은 내용 재전송, 옛 `generated_at` 처리, 삭제(앱 연결 해제 시).
2. 보드 → Hub 읽기: 보드는 OAuth 공개 클라이언트(CIMD, PKCE)로 `board:read`. 응답 모양(`{{manifests: [...]}}` — board의 `data/sample-tiles.json`과 같은 모양이면 보드 코드가 그대로 씀), 캐시·ETag, 5분 새로고침.
3. Hub 타일(`hub` 앱): 메모 승인 흐름(Claude가 제안 → 사용자가 승인한 것만), 받은 제안 수 계산.
4. 보드 → Hub 쓰기 두 가지: (a) 룰렛 제안(스코프, 재전송 방지), (b) 배치 문서 저장(sync와 같은 If-Match 방식 재사용 여부).
5. 보드 사이트 주소·리디렉트 URI 설정 변수, 폐기와 재연결.
6. 마이그레이션 번호, 테스트 목록, 단계 나누기(B1, B2 …).

## 하지 말 것
- 코드 구현, 마이그레이션 적용, 배포. 이번에는 문서만입니다.
- board 저장소나 앱 저장소 고치기.
- 실제 개인 데이터나 토큰을 문서 예시에 넣기.

## 끝나면 알려 줄 것
- 바뀐 P7_BOARD.md 요약과 결정이 필요한 질문 목록
- 기존 PR #40, #41(P6 상태 문서, P7 초안)을 어떻게 정리할지 제안(main과 충돌 여부 포함)
"""

ROOT.mkdir(parents=True, exist_ok=True)
PATHS = {"food": "/palate"}   # Life Hub 목적지 경로 (life-hub src/destinations.js 의 path)
for a in APPS:
    (ROOT / f"{a['app']}.md").write_text(TPL.format(
        B=B, path=PATHS.get(a["app"], "/" + a["app"]), multi=MULTI[a["kind"]], choose_device=CHOOSE_DEVICE[a["kind"]],
        **{k: a[k] for k in ("app", "repo", "name", "section", "hubfile", "extra")}), encoding="utf-8")
(ROOT / "life-hub.md").write_text(LIFEHUB.format(B=B), encoding="utf-8")
idx = ["# 저장소별 프롬프트", "",
       "각 파일의 구분선 아래를 해당 저장소 작업 세션에 그대로 붙여 넣습니다. 앱 프롬프트는 같은 틀이고, 「이 앱에서 특히 볼 것」과 여러 기기 규칙(기록이 동기화되는 앱 / 기기 안에만 있는 앱)만 다릅니다.", "",
       "| 저장소 | 파일 | 기록 | 하는 일 |", "|---|---|---|---|"]
for a in APPS:
    idx.append(f"| {a['repo']} | [{a['app']}.md]({a['app']}.md) | {'동기화' if a['kind'] == 'sync' else '기기 안'} | {a['name']} 보드 타일 고르기 + 만드는 함수 + Hub 업로드 + README |")
idx.append("| life-hub | [life-hub.md](life-hub.md) | — | 보드 API 설계 문서(P7) 갱신 — **완료** |")
idx += ["", "프롬프트를 고치려면 `scripts/make-prompts.py`를 고치고 `python3 scripts/make-prompts.py`로 다시 만듭니다."]
(ROOT / "README.md").write_text("\n".join(idx) + "\n", encoding="utf-8")
print(sorted(p.name for p in ROOT.iterdir()))
