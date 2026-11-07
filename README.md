# Life Board

[Life Hub](https://github.com/KINGJNU-sakayume/life-hub)에 연결된 앱들(AniMan, 책장, potcast, ELO Sorter, 역 도장깨기 …)의 **최근 흐름**을 윈도우 10 시작 화면처럼 살아 있는 타일로 모아 보는 정적 사이트입니다.

- **PC**: 화면 높이를 꽉 채우는 가로 스크롤. 세로 칸 수와 칸 크기를 화면 높이에 맞춰 계산합니다.
- **휴대폰**: 2열 세로 스크롤.
- **편집**: 타일을 길게 누르거나 `E` 키 → 끌어서 옮기기, 오른쪽 아래 핸들을 끌어 크기 바꾸기(끄는 동안 타일이 바로 바뀜), `−`로 빼기, `+`로 다시 넣기. 우클릭하면 크기·설정 메뉴.
- **디자인**: 화면은 무채색, 색은 표지에서만. → [docs/DESIGN.md](docs/DESIGN.md)

## 지금 상태

| 부분 | 상태 |
|---|---|
| 보드 화면, 편집, 크기 조절, 배치 저장(이 브라우저) | 됨 |
| 보드 자체 위젯: 날씨(Open-Meteo), 스포츠(TheSportsDB), 시간표·가격 추적·D-day(직접 입력) | 됨. 우클릭 → 위젯 설정, 또는 설정 전 타일을 눌러 설정. 값은 이 브라우저에만 저장 |
| Life Hub 연결 | 됨. 상태 줄의 「Life Hub에 연결」(GitHub Pages 주소에서만). 연결 전에는 **예시 데이터**(지어낸 값), 연결 후에는 앱들이 Hub에 올린 실제 타일 + 받은 제안 수. 14일 넘게 안 올라온 앱은 '오래됨' 표시. 해제는 `+` → 「Life Hub 연결 해제」 |
| 앱이 Hub에 타일 올리기 | Hub 쪽은 됨(life-hub P7 B1). 앱 쪽은 **역 도장깨기**(11/6), **potcast**·**AniMan**(11/7)이 올리는 중이고, PALATE·켜켜이·업적 라이브러리·책장·일기 룰렛·ELO Sorter는 아직 안 올림. 앱마다 할 일은 [docs/prompts/](docs/prompts/) |
| 배치의 기기 간 동기화 | 됨(life-hub P7 B3, 배포됨). Life Hub에 연결돼 있으면 편집이 끝나고 2초 뒤 올리고, 새로고침 때 다른 기기의 변경을 받음. 둘이 겹치면 방금 한 편집이 이김. B2 때 연결했다면 한 번 다시 연결(상태 줄에 「배치 동기화 권한 없음 · 다시 연결」) |
| Claude 메모 | 됨(life-hub P7 B4, 배포됨). Claude 대화에서 "보드에 메모 남겨 줘" → 카드에서 승인한 것만 보드 「Claude 메모」 타일에 나옴. 보드에는 승인 버튼이 없음. B4 전에 연결했다면 한 번 다시 연결(상태 줄 「메모 권한 없음 · 다시 연결」) |
| 룰렛 결과를 Hub에 제안으로 보내기 | 됨(life-hub P7 B5, 2026-11-05 배포). 역 도장깨기 타일(4×2)에서 돌리고 「제안 보내기」 → 역 도장깨기 수신함에 제안. 역 도장깨기가 지금 뽑을 수 있는 역만 받고, 앱에서 승인해야 목적지가 됨. 예시 데이터로는 보내지 않음. B5 전에 연결했다면 한 번 다시 연결 |

날씨·스포츠는 공개 문서대로 짰지만 이 저장소를 만든 환경에서는 실제 호출을 확인하지 못했습니다. 실패하면 타일에 "불러오지 못했어요"가 나옵니다. TheSportsDB 무료 키(`123`)는 **홈 경기만** 보여줍니다. 자기 키가 있으면 위젯 설정에 넣으면 됩니다(이 브라우저에만 저장).

## 실행

```bash
npm run dev        # http://localhost:8080 (ES 모듈이라 파일을 직접 열면 안 되고 서버가 필요)
npm run check      # 문법, 예시 데이터 규격, CSP 와 설정 출처 확인
npm run smoke      # Playwright 로 화면·편집·크기 조절 확인 (playwright 설치 필요)
```

## 배포 (GitHub Pages)

`main`에 올라가면 `.github/workflows/pages.yml`이 검사 후 배포합니다. 처음 한 번 저장소 Settings → Pages → Source를 **GitHub Actions**로 바꿔야 합니다.

## 구조

```
index.html            틀 + CSP(콘텐츠 보안 정책)
css/board.css         디자인 토큰, 격자, 톤별 모양, 크기별 배치(컨테이너 쿼리), 편집 모드
js/config.js          허용 출처, 그룹, 새로고침 주기
js/layout.js          화면 높이에 맞춘 칸 크기 계산
js/schema.js          앱 manifest 검증 (규격 v1, fail closed)
js/render.js          톤별 렌더러 (textContent 만)
js/widgets.js         보드 자체 위젯
js/edit.js            편집 모드 (길게 누르기, 옮기기, 핸들 크기 조절, 메뉴, 저장)
js/faces.js           sleeve 앞면/목록 전환
js/accent.js          표지에서 포인트색 뽑기
js/hub.js             Life Hub 연결(OAuth 2.1 + PKCE), 타일·제안 수 읽기, 룰렛 제안 보내기
js/layoutsync.js      보드 배치·메모 문서를 기기 간에 동기화 (Hub 동기화 API)
js/memos.js           승인된 Claude 메모를 받아 보드 문서에 저장하고 receipt 보내기
js/main.js            불러오기, 그리기, 새로고침
lifehub/index.html    Life Hub 연결 콜백 페이지
lifehub-client.json   보드의 Life Hub 클라이언트 정보(공개 클라이언트)
scripts/              check.mjs(검사), smoke.mjs(Playwright 확인), make-sample.py, make-prompts.py
data/sample-tiles.json  예시 앱 타일 (scripts/make-sample.py 로 생성)
docs/DESIGN.md        디자인 규칙 (통일 문서)
docs/TILES.md         앱 → 보드 데이터 규격 v1
docs/CANDIDATES.md    앱별 후보 타일
docs/prompts/         저장소별 작업 프롬프트 (scripts/make-prompts.py 로 생성)
```

## 앱이 타일을 보내려면

1. [docs/TILES.md](docs/TILES.md) 규격으로 manifest를 만드는 함수를 앱에 둡니다.
2. 고를 타일은 [docs/CANDIDATES.md](docs/CANDIDATES.md)에서.
3. 각 저장소용 작업 프롬프트는 [docs/prompts/](docs/prompts/)에 있습니다.
