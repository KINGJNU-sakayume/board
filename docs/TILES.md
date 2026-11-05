# 보드 타일 규격 v1 (앱 → 보드)

> 앱이 보드에 보낼 "보드 목록(manifest)"의 형식입니다. 검증 코드는 `js/schema.js`이고, 이 문서와 다르면 코드가 기준입니다.
> 모양 규칙은 [DESIGN.md](DESIGN.md)에 있습니다.

## 0. 지금 상태

- 보드는 이 규격을 **읽고 그립니다.** Life Hub에 연결하기 전에는 예시 데이터(`data/sample-tiles.json`), 연결하면 Hub가 보관한 앱 목록을 씁니다.
- 앱이 목록을 올리는 곳은 **Life Hub에 있습니다**(life-hub `docs/P7_BOARD.md` 5장, 2026-11-05 배포):
  `PUT <앱 경로>/v1/board`, 스코프 `<앱 id>:board`. 이 스코프는 앱을 연결할 때 함께 받으므로, 그 전에 연결한 앱은 **한 번 다시 연결**해야 합니다(업로드가 `403 insufficient_scope`).
  - 같은 내용은 `{ unchanged: true }`, 저장된 것보다 오래되거나 같은 `generated_at`은 `{ ignored: true }`로 무시됩니다.
  - 올리는 빈도: 타일에 영향을 주는 변화가 있을 때, 앱마다 **10분에 한 번 이하**, 마지막으로 올린 것과 내용(sha256, `generated_at` 빼고)이 다를 때만. 10분 안에 앱이 닫혀 못 보낸 변경은 다음에 앱을 열 때 바로 보낸다.
  - 앱을 열 때 마지막으로 올린 지 하루가 넘었으면 **내용이 같아도** 한 번 보낸다. 보드의 '오래됨'(14일)은 Hub가 받은 시각 기준이라, 같은 내용이라고 안 보내면 매일 쓰는 앱도 오래됨으로 보인다.
  - Hub는 앱마다 **최신 목록 하나**만 보관한다. 기록이 기기 안에만 있는 앱은 기록이 없는 기기(새 PC 등)가 빈 목록으로 다른 기기의 목록을 덮을 수 있으니, 기록이 하나도 없으면 올리지 않고, 올리는 기기를 정하는 규칙을 둔다. 예시(체험) 모드의 데이터는 올리지 않는다.
- 앱 작업 순서: (1) 자기 상태에서 manifest를 만드는 **순수 함수**(예: `buildBoardTiles(state, now)`)와 지어낸 값의 **예시 출력**, 테스트, README "보드 타일" 절 → (2) 그 함수를 위 업로드에 연결(10분에 한 번 이하, 내용이 바뀌었을 때만, `insufficient_scope`면 토큰을 지우지 않고 다시 연결 안내). 두 단계를 한 작업으로 맡깁니다(`docs/prompts/`).
- 예시 출력은 지어낸 값만 씁니다. 실제 기록·개인 데이터·토큰을 저장소에 넣지 않습니다.
- 타일의 글자는 앱을 다시 열 때까지 그대로 보드에 남습니다. "어제", "3일 전", "오늘의 미션"처럼 날이 바뀌면 틀려지는 말 대신 날짜(`11/5`)를 쓰거나 날짜를 함께 넣습니다.

## 1. 전체 모양

```json
{
  "version": 1,
  "app": "animan",
  "generated_at": "2026-11-04T13:00:00Z",
  "tiles": [ /* 타일 0~24개 */ ]
}
```

| 필드 | 규칙 |
|---|---|
| `version` | 정수 `1`. 다르면 이 앱 타일 전체를 거절 |
| `app` | Life Hub 목적지 id (`animan`, `letterbookxd`, `potcast`, `elosorter`, `achievement`, `sub`, `kyeokyeoi`, `food`, `diaryroulette`) |
| `generated_at` | ISO 8601 시각. 늦게 도착한 옛 목록을 버리는 데 쓰인다(Hub 쪽) |
| `tiles` | 0~24개. 하나가 틀리면 그 타일만 빠진다 |

목록 전체는 UTF-8로 **64 KiB 이하**여야 Life Hub가 받는다(이미지는 주소만이라 보통 수 KiB~수십 KiB).

## 2. 타일 공통 필드

```json
{
  "id": "now",
  "name": "AniMan · 정주행 중",
  "tone": "sleeve",
  "sizes": ["1x1", "2x1", "2x2", "4x2"],
  "size": "2x2",
  "default": true,
  "href": "https://kingjnu-sakayume.github.io/animan/",
  "accent": { "h": 330, "s": 0.6 },
  "detail": { "title": "AniMan · 최근 정주행 5개", "rows": [ /* 행 */ ] },
  "data": { /* 톤별 */ }
}
```

| 필드 | 필수 | 규칙 |
|---|---|---|
| `id` | ✓ | 앱 안에서 고유. 소문자·숫자·`-`, 32자 이내. **한 번 정하면 바꾸지 않는다**(사용자 배치가 이 id로 저장됨) |
| `name` | ✓ | '위젯 추가' 목록과 메뉴에 나오는 이름. 30자 이내. "앱 이름 · 타일 이름" 꼴 권장 |
| `tone` | ✓ | `sleeve` `hero` `strip` `plate` `map` `type` |
| `form` | type일 때 ✓ | `num` `list` `line` `cells`. 다른 톤에는 쓰지 않는다 |
| `sizes` | ✓ | `1x1` `2x1` `2x2` `4x1` `4x2` 중 하나 이상, 중복 없이 |
| `size` |  | 처음 크기. `sizes` 안에 있어야 함. 없으면 `sizes[0]` |
| `default` |  | `false`면 처음에는 숨겨 두고 '위젯 추가'에서 고르게 한다. 생략하면 `true` |
| `href` |  | 누르면 열 앱 주소. https이고 보드 허용 출처(`linkOrigins`) 안이어야 함. 아니면 **타일 거절** |
| `accent` |  | 포인트색 `{h: 0~360, s: 0~1}`. 표지가 있으면 보내기를 권장 |
| `detail` |  | 누르면 열리는 상세 창. `{title, rows: 행 1~12개}`. 있으면 `href`보다 먼저 쓰이고, 창 아래에 '앱 열기' 링크가 붙는다 |
| `data` | ✓ | 톤(형태)별 아래 표 |

## 3. 작은 조각

**표지 `cover`**: `{ "src": "...", "alt": "", "mono": "푸" }` — `src`와 `mono` 중 하나는 있어야 한다.
- `src`는 보드 허용 출처(`imageOrigins`)의 https **주소**. 보드를 연 브라우저가 그 주소에서 바로 불러오고, Hub는 이미지를 저장하지 않는다.
- **앱이 올리는 목록에는 `data:` 이미지를 넣지 않는다.** Life Hub가 `data:`가 들어간 목록을 거절한다(life-hub `docs/P7_BOARD.md` 5.2). 보드 코드가 `data:image/`를 읽을 수 있는 건 이 저장소의 예시 데이터용이다.
- 공개 주소가 없는 이미지(앱 브라우저 안에만 있는 사진 등)는 보드에 못 띄운다. 그럴 때는 `{ "mono": "푸" }`처럼 **`src` 없이** 보내면 글자 칸으로 나온다. 표지가 선택인 곳(strip 항목, 행 썸네일)은 `cover`를 아예 빼도 된다. **sleeve·hero는 `cover`가 필수**라 빼면 타일이 거절된다.
- 허용되지 않은 출처는 **타일은 살리고 표지만 글자 한 칸(mono)으로** 바꾼다. `mono`가 없으면 제목 첫 글자.
- 지금 허용 출처: `https://kingjnu-sakayume.github.io`, `https://image.aladin.co.kr`, `https://upload.wikimedia.org`. 다른 출처가 필요하면 board 저장소에 요청한다(`js/config.js`와 `index.html` CSP를 같이 바꿈).

**진행 `progress`**: `{ "value": 7, "max": 12, "text": "7 / 12화" }` — `0 ≤ value ≤ max`. `text`는 막대 옆에 쓰이고 화면 읽기 프로그램용 설명도 된다.

**행 `row`** (list, detail, sleeve·hero 목록에서 공통)

| 필드 | 설명 |
|---|---|
| `title` ✓ | 제목 |
| `value` | 오른쪽 보조 값(24자). 예: `3화`, `2번 들음` |
| `sub` | 상세 창에서 제목 아래 한 줄 |
| `rank` | 왼쪽 순번(0~999) |
| `time` | 왼쪽 시각 `HH:MM` |
| `trend` | `up` `down` `same` → ▲ ▼ – (`value`와 함께 `▲ 2`) |
| `cover` | 작은 썸네일 |
| `progress` | 상세 창에서 막대 |
| `now` | 지금 하는 중(강조 행 + '지금' 배지) |
| `muted` | 흐리게(끝난 것, 빈 상태 안내) |

**글자 규칙**: 선택 필드라도 빈 글자(`""`, 공백만)는 거절된다. 값이 없으면 필드를 뺀다. 글자 수는 JavaScript 문자열 길이(`.length`)로 센다. 최대 길이는 아래 표와 `js/schema.js`가 기준이고, 짧은 것들이 특히 잘 걸린다: `mono` 2, 지도 칸 이름 6, `unit` 8, `foot`의 `k`·`v` 10, `plate.name`·룰렛 후보 12, 큰 숫자 `value` 12, `pill` 20, 행 `value` 24, `name` 30.

## 4. 톤별 `data`

### sleeve — 표지 + 라벨 (지금 하는 한 가지)
| 필드 | |
|---|---|
| `label` ✓ | 맨 위 작은 글자(앱 이름) |
| `title` ✓ | 제목 |
| `cover` ✓ | 표지 (2:3 세로). 주소가 없으면 `{mono}`만 |
| `sub` | 보조 문장, `\n` 줄바꿈 가능, 160자 |
| `pill` | 상태 배지 20자. 예: `어제 이어 봄` |
| `progress` | 진행 |
| `list`, `listLabel` | 뒷면 목록(행 1~12). 있으면 2x2에서 앞면과 7초마다 번갈아, 4x2에서 나란히 |

### hero — 표지 전면 (그룹의 주인공)
`label` ✓, `title` ✓, `cover` ✓(정사각 권장, 주소가 없으면 `{mono}`만), `sub`, `progress`, `list`(행 1~4, 4칸 폭에서만 오른쪽 판), `listLabel`.

### strip — 최근 N개 표지
`label` ✓, `items` ✓ `[{title, cover?}]` 1~12개, `square`(true면 정사각, 앨범·음식).

### plate — 표지판 하나
`label` ✓, `name` ✓(12자, 역 이름 등), `roman`(로마자), `sub`, `roulette`(`{candidates: [이름 2~50개]}`, 4칸 폭에서만 보임. 결과는 '제안'이며 Hub 연결 전에는 보내기 버튼이 잠김).

### map — 격자 지도
`label` ✓, `summary` ✓(화면 읽기용 문장, 1칸 높이에서는 이 문장만 보임), `cols` ✓(2~12), `cells` ✓ `[{state, name?}]` 최대 200칸. `state`: `none`(빈칸) `off`(안 감) `on`(감) `last`(최근).

### type · num — 큰 숫자
`label` ✓, `value` ✓(숫자나 12자 글자, 4자를 넘으면 자동으로 작게), `unit`, `caption`(숫자 옆 작은 글), `sub`, `foot`(`[{k, v}]` 최대 6개, 2x2 아래나 4x1 오른쪽에 나옴).

### type · list — 목록
`label` ✓, `rows` ✓ 1~12개, `foot`(아래 한 줄). 1칸 높이에서는 앞의 2행만, 1x1에서는 첫 행만 크게.

### type · line — 한 줄
`label` ✓, `title` ✓(160자), `sub`, `pill`, `progress`.

### type · cells — 칸 채우기
`label` ✓, `total` ✓(1~60), `filled` ✓(0~total).

## 5. 예시

`data/sample-tiles.json`에 앱마다 예시가 있습니다. 전부 지어낸 값이고 표지는 글자 없는 추상 그림입니다.

## 6. 검사하기

board 저장소에서:
```bash
npm run check      # 예시 데이터와 규격 검사
```
앱 저장소에서는 자기 예시 출력(JSON)을 board의 `js/schema.js`의 `validateManifest`로 검사하는 테스트를 두면 좋습니다(테스트에서 board의 raw 주소를 받아 쓰지 말고 고정 버전을 복사).

- **두 번째 인자 `policy`를 꼭 넘깁니다**: `{ imageOrigins, linkOrigins }`, 값은 board `js/config.js`와 같게. 빼면 표지나 `href`가 있는 타일이 모두 오류로 빠집니다.
- `ok`만 보지 마세요. 타일 하나가 틀리면 그 타일만 빠지고 `ok`는 `true`입니다. **`errors`가 비었는지, 남은 타일 수가 입력과 같은지**를 확인합니다.
