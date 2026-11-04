# 보드 타일 규격 v1 (앱 → 보드)

> 앱이 보드에 보낼 "보드 목록(manifest)"의 형식입니다. 검증 코드는 `js/schema.js`이고, 이 문서와 다르면 코드가 기준입니다.
> 모양 규칙은 [DESIGN.md](DESIGN.md)에 있습니다.

## 0. 지금 상태

- 보드는 이 규격을 **읽고 그릴 수** 있습니다(예시 데이터 `data/sample-tiles.json`).
- 앱이 목록을 **올릴 곳(Life Hub 보드 API)은 아직 없습니다.** 생기기 전까지 앱은
  1. 자기 상태에서 manifest를 만드는 **순수 함수**(예: `buildBoardTiles(state, now)`)를 만들고,
  2. 지어낸 값으로 된 **예시 출력 파일**(예: `board/sample.json`)과 테스트를 두고,
  3. README에 "보드 타일" 절을 씁니다.
  Hub로 보내는 코드는 Hub 쪽 API가 생긴 뒤에 붙입니다. 없는 API를 있는 것처럼 호출하지 않습니다.
- 예시 출력은 지어낸 값만 씁니다. 실제 기록·개인 데이터·토큰을 저장소에 넣지 않습니다.

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

**표지 `cover`**: `{ "src": "...", "alt": "", "mono": "푸" }`
- `src`는 `data:image/(png|jpeg|webp|gif|svg+xml)` 또는 보드 허용 출처(`imageOrigins`)의 https 주소.
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

## 4. 톤별 `data`

### sleeve — 표지 + 라벨 (지금 하는 한 가지)
| 필드 | |
|---|---|
| `label` ✓ | 맨 위 작은 글자(앱 이름) |
| `title` ✓ | 제목 |
| `cover` ✓ | 표지 (2:3 세로) |
| `sub` | 보조 문장, `\n` 줄바꿈 가능, 160자 |
| `pill` | 상태 배지 20자. 예: `어제 이어 봄` |
| `progress` | 진행 |
| `list`, `listLabel` | 뒷면 목록(행 1~12). 있으면 2x2에서 앞면과 7초마다 번갈아, 4x2에서 나란히 |

### hero — 표지 전면 (그룹의 주인공)
`label` ✓, `title` ✓, `cover` ✓(정사각 권장), `sub`, `progress`, `list`(행 1~4, 4칸 폭에서만 오른쪽 판), `listLabel`.

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
앱 저장소에서는 자기 예시 출력(JSON)을 board의 `js/schema.js`의 `validateManifest`로 검사하는 테스트를 두면 좋습니다(파일을 복사해 쓰거나, 테스트에서 board의 raw 주소를 받아 쓰지 말고 고정 버전을 복사).
