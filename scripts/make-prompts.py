#!/usr/bin/env python3
"""docs/prompts/*.md 를 만든다. 앱별 프롬프트는 같은 틀에 앱마다 다른 부분만 끼운다."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / "docs" / "prompts"
B = "https://github.com/KINGJNU-sakayume/board/blob/main/docs/"

APPS = [
  ("animan", "animan", "AniMan", "AniMan (`animan`)", """## 이 앱에서 특히 볼 것
- 작품 목록(Hub에 공유하는 `series` 참조)에 강조색이 있으면 그 값을 `accent`로 보낼 수 있는지 확인해 주세요.
- 진행 기록은 Hub와 sync 문서로 오갑니다(`animan:sync`). 보드 타일 함수는 기기 안 상태만 입력으로 받게 하고 sync 코드와 섞지 마세요.
- `now` 타일의 뒷면 목록(`list`)과 상세(`detail`)는 같은 "최근 정주행" 데이터를 다른 개수로 씁니다(뒷면 3~5, 상세 5)."""),
  ("letterbookxd", "letterbookxd", "책장", "책장 (`letterbookxd`)", """## 이 앱에서 특히 볼 것
- 표지는 알라딘 이미지(image.aladin.co.kr)면 허용 출처 안입니다. 위키미디어도 허용입니다. 그 밖의 출처는 표지 없이(글자 칸) 보내고 저에게 알려 주세요.
- 판본(`editions`)의 권 정보로 `series`(칸 채우기) 타일을 만들 수 있는지 확인해 주세요.
- 독서 기록은 Hub와 sync 문서로 오갑니다(`letterbookxd:sync`). 보드 타일 함수는 sync 코드와 섞지 마세요."""),
  ("potcast", "potcast", "potcast", "potcast (`potcast`)", """## 이 앱에서 특히 볼 것
- `now`(지금 듣는 앨범)는 미디어 그룹의 `hero`입니다. 그룹마다 hero는 하나라서, 이 앱의 다른 타일은 hero로 만들지 마세요.
- 앨범 표지가 어느 출처에서 오는지 확인해 주세요. 허용 출처 밖이면 표지 없이 보내고 board 쪽 허용 요청 목록에 적어 주세요.
- 트랙 진행(`트랙 6 / 14`)과 들은 횟수는 앱이 실제로 세는 값만 씁니다. 세지 않는 값을 추정해 넣지 마세요."""),
  ("elosorter", "elosorter", "ELO Sorter", "ELO Sorter (`elosorter`)", """## 이 앱에서 특히 볼 것
- 이 앱은 Hub에 수신함 없이 sync만 하는 목적지입니다. 순위는 기기 안 세션 상태에서 계산하고, sync 코드와 섞지 마세요.
- 순위 변동(`trend`)은 직전 비교 전후 순위를 앱이 실제로 알 때만 넣습니다. 모르면 빼세요.
- 정렬 대상에 표지가 없을 수 있습니다. 없으면 썸네일 없이 보내면 됩니다."""),
  ("achievement", "업적 라이브러리 저장소", "업적 라이브러리", "업적 라이브러리 (`achievement`)", """## 이 앱에서 특히 볼 것
- 활동 기록(운동 등)과 업적이 한 앱에 있습니다. `activity` 타일은 활동 기록 중 가장 최근 하나만 보여줍니다.
- 트로피 칸(`trophy`)은 카테고리 하나를 고르는 규칙이 필요합니다(가장 최근 취득한 카테고리 등). 규칙을 표에 적어 주세요.
- 업적 정의 후보(Hub 제안)와 승인된 업적을 구분해, 보드에는 **승인되어 앱에 저장된 것만** 보냅니다."""),
  ("sub", "sub", "역 도장깨기", "역 도장깨기 (`sub`)", """## 이 앱에서 특히 볼 것
- `station` 타일의 룰렛 후보(`roulette.candidates`)는 앱이 Hub에 공유하는 '지금 뽑을 수 있는 역(pool)'과 같은 기준으로, 최대 50개입니다. 50개보다 많으면 어떻게 고를지(무작위, 노선 등) 정해 표에 적어 주세요.
- 룰렛 결과는 기록이 아니라 '제안'입니다. 보드는 Life Hub의 제안 API(P7 B5)가 생기기 전까지 제안 보내기를 잠가 둡니다. 이 저장소에서 보드의 룰렛을 위해 할 일은 후보 목록을 보내는 것뿐입니다.
- 역 이름은 12자 이내(`plate.name`)입니다. 넘는 역 이름이 있는지 확인해 주세요."""),
  ("kyeokyeoi", "kyeokyeoi", "켜켜이", "켜켜이 (`kyeokyeoi`)", """## 이 앱에서 특히 볼 것
- `regions`(map) 타일의 격자 배치(`cols`, 빈칸 `none`)는 앱이 정합니다. 앱의 지역 목록(Hub에 공유하는 `regions` 참조)으로 시도 격자를 만들 수 있는지 확인하고, 배치 표를 코드 상수로 두세요.
- 지역 단위가 시도보다 잘다면(시군구 등) 보드 격자 최대 200칸 안에서 어떻게 묶을지 제안해 주세요.
- 추억·방문의 제목과 장소는 짧게 자르는 규칙(라벨 80자, 제목 160자)을 지켜 주세요."""),
  ("food", "food", "PALATE", "PALATE (`food`)", """## 이 앱에서 특히 볼 것
- 식사 사진이 있다면 어디에 저장되는지(주소 출처) 확인해 주세요. 보드 허용 출처 밖이면 사진 없이(글자 칸) 보내고 board 쪽 요청 목록에 적어 주세요.
- 보드에는 **승인되어 앱에 저장된** 식사·위시만 보냅니다. Hub 수신함의 대기 후보는 보내지 않습니다."""),
  ("diaryroulette", "일기 룰렛 저장소", "일기 룰렛", "일기 룰렛 (`diaryroulette`)", """## 이 앱에서 특히 볼 것
- 오늘의 미션은 앱의 하루·쉬는 기간 규칙을 따른 결과만 보냅니다(보드가 미션을 새로 뽑지 않습니다).
- 날짜 경계(자정)를 넘을 때 타일이 어제 미션을 '오늘'로 보이지 않게, 함수가 `now`를 입력으로 받아 날짜를 판단하게 해 주세요."""),
]

TPL = """# {appname} 저장소 프롬프트 — 보드 타일

아래 구분선 아래를 **{repo}** 작업 세션에 그대로 붙여 넣으세요.

---

이 저장소({appname}, Life Hub 목적지 id `{app}`)에서 Life Board(https://github.com/KINGJNU-sakayume/board)에 보낼 **보드 타일**을 정하고, 그 데이터를 만드는 코드를 추가해 주세요. README도 함께 갱신합니다.

## 먼저 읽을 것
1. 보드 디자인 규칙: {B}DESIGN.md (톤, 크기, 하지 않는 것)
2. 보낼 JSON 규격 v1: {B}TILES.md (검증 코드는 board 저장소 `js/schema.js`)
3. 이 앱의 후보 타일: {B}CANDIDATES.md 의 「{section}」 절
4. 이 저장소의 AGENTS.md·CLAUDE.md·README, 그리고 실제 상태(저장 형식) 코드

## 진행 순서
1. 코드를 읽고, 후보 타일마다 **이 앱이 실제로 가진 데이터로 채울 수 있는지** 표로 정리해 주세요(타일 필드 → 앱 데이터 출처). 채울 수 없는 후보는 빼고, 앱 데이터로 만들 수 있는 좋은 타일이 더 있으면 후보에 더해 주세요. 원칙은 "이번 주 몇 개" 같은 거시 통계보다 **최근 흐름**(지금 하는 것, 최근에 끝낸 것, 다음 차례)입니다.
2. 그 표를 저에게 보여주고 **만들 타일, 처음부터 보일 타일(`default`), 허용 크기(`sizes`)와 처음 크기(`size`)** 를 제가 고르게 해 주세요. 제가 고르기 전에는 구현하지 마세요.
3. 고른 타일로:
   - 앱 상태에서 manifest(v1)를 만드는 **순수 함수**(예: `buildBoardTiles(state, now)`)를 추가합니다. 네트워크·저장소 접근 없이 입력만으로 결과가 정해지게 합니다.
   - 타일 `id`는 후보 표의 id를 쓰고, 한 번 정하면 바꾸지 않습니다(사용자 배치가 id로 저장됩니다).
   - 표지가 있으면 `accent {{h, s}}`를 함께 보냅니다. 표지 주소는 board 허용 출처 안이어야 합니다(현재 `https://kingjnu-sakayume.github.io`, `https://image.aladin.co.kr`, `https://upload.wikimedia.org`). 다른 출처가 필요하면 그 표지는 빼고(글자 칸) 저에게 알려 주세요.
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
- Life Hub로 올리는 코드. Hub의 업로드 API(`PUT <앱 경로>/v1/board`)는 있지만, 연결은 이 작업이 끝난 뒤 따로 맡깁니다. 이번에는 함수와 예시 출력까지만 만듭니다.
- 보드 화면 코드나 CSS를 이 저장소에 만들기. 모양은 보드가 정하고, 이 저장소는 데이터만 만듭니다.
- 새 색·테마색 정하기(포인트색은 표지에서), HTML 조각 보내기.
- board 저장소나 다른 저장소 고치기.

{extra}

## 끝나면 알려 줄 것
- 고른 타일 표(id, 이름, 톤·형태, 크기, 기본, 데이터 출처)
- 예시 출력 JSON 경로와 규격 검사 결과
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
for app, repo, name, section, extra in APPS:
    (ROOT / f"{app}.md").write_text(TPL.format(app=app, repo=repo, appname=name, section=section, extra=extra, B=B), encoding="utf-8")
(ROOT / "life-hub.md").write_text(LIFEHUB.format(B=B), encoding="utf-8")
idx = ["# 저장소별 프롬프트", "", "각 파일의 구분선 아래를 해당 저장소 작업 세션에 그대로 붙여 넣습니다. 앱 프롬프트는 같은 틀이고, 「이 앱에서 특히 볼 것」만 다릅니다.", "",
       "| 저장소 | 파일 | 하는 일 |", "|---|---|---|"]
for app, repo, name, section, extra in APPS:
    idx.append(f"| {repo} | [{app}.md]({app}.md) | {name} 보드 타일 고르기 + 만드는 함수 + README |")
idx.append("| life-hub | [life-hub.md](life-hub.md) | 보드 API 설계 문서(P7) 갱신 — **완료** |")
idx += ["", "프롬프트를 고치려면 `scripts/make-prompts.py`를 고치고 `python3 scripts/make-prompts.py`로 다시 만듭니다."]
(ROOT / "README.md").write_text("\n".join(idx) + "\n", encoding="utf-8")
print(sorted(p.name for p in ROOT.iterdir()))
