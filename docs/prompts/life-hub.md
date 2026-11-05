# life-hub 저장소 프롬프트 — 보드 API 설계 (P7)

> **완료됨 (2026-11-05)**: 설계는 life-hub PR #43, B1 구현·배포는 PR #44. 기록용으로 남겨 둡니다.

아래 구분선 아래를 **life-hub** 작업 세션에 그대로 붙여 넣으세요.

---

Life Board(https://github.com/KINGJNU-sakayume/board)가 앱 타일을 실제 데이터로 보여주려면 Life Hub에 **보드 API**가 필요합니다. 이번 작업은 **설계 문서 갱신까지**이고, 구현은 제가 설계를 승인한 뒤 따로 지시합니다.

## 먼저 읽을 것
1. 이 저장소 AGENTS.md (원격 동기화 전에 신원·저장·폐기·재전송·충돌을 먼저 설계할 것, fail closed, 없는 API 흉내 금지)
2. 이 저장소 docs/P7_BOARD.md (예전 초안이라 아래 결정과 다른 곳이 있음), docs/P6_SYNC.md, src/destinations.js, sync 구현
3. board 저장소 https://github.com/KINGJNU-sakayume/board/blob/main/docs/TILES.md (앱이 보낼 manifest 규격 v1), https://github.com/KINGJNU-sakayume/board/blob/main/docs/DESIGN.md, https://github.com/KINGJNU-sakayume/board/blob/main/docs/CANDIDATES.md

## 이미 정한 것
- 보드는 별도 저장소 `board`의 정적 사이트(GitHub Pages)입니다. Hub 화면이 아닙니다.
- 각 앱이 **보드용 목록(manifest v1)** 을 만들어 올리고, Hub는 앱마다 **최신 하나**를 보관하고, 보드는 읽기만 합니다.
- 늦게 도착한 옛 목록은 `generated_at`으로 버립니다.
- Hub가 직접 만드는 타일: **승인된 Claude 메모**(자유 글)와 **받은 제안 수**.
- 보드의 룰렛 결과(역 도장깨기)는 기록이 아니라 기존 제안 흐름(`propose_station_draw`와 같은 수신함)으로 들어가는 **제안**입니다.
- 보드 배치(어느 타일을 어디에 어떤 크기로)는 지금 브라우저 localStorage(`board.layout.v1`, 형식 `{v:1, g:{그룹: [[id, size], ...]}, tray:[id...]}`)에 있고, Hub에 저장해 기기 간에 맞추는 것이 목표입니다.
- 앱 권한은 sync처럼 **수신함과 함께 기본 부여**하는 방향(PR #42와 같은 원칙).
- 기록을 잘게 저장하는 청크 저장은 P8로 미룹니다.

## 설계 문서에서 정할 것 (docs/P7_BOARD.md 를 다시 씀)
1. 앱 → Hub 업로드: 경로(예: `PUT /<app>/v1/board`), 스코프 이름, 크기 제한, 검증 수준(Hub가 규격 v1을 어디까지 검사할지; 보드는 다시 검사함), 같은 내용 재전송, 옛 `generated_at` 처리, 삭제(앱 연결 해제 시).
2. 보드 → Hub 읽기: 보드는 OAuth 공개 클라이언트(CIMD, PKCE)로 `board:read`. 응답 모양(`{manifests: [...]}` — board의 `data/sample-tiles.json`과 같은 모양이면 보드 코드가 그대로 씀), 캐시·ETag, 5분 새로고침.
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
