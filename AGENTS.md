# board 저장소 작업 규칙

- 공개 저장소입니다. 실제 기록, 개인 데이터(위치, 일정, 팀, 구매 목록 등), 토큰·키를 넣지 않습니다. 예시는 지어낸 값만, 표지는 글자 없는 추상 그림만 씁니다(실제 작품 표지 금지).
- 디자인 규칙은 `docs/DESIGN.md`, 앱이 보낼 데이터 규격은 `docs/TILES.md`가 기준입니다. 규격을 바꾸면 `js/schema.js`, `docs/TILES.md`, `data/sample-tiles.json`(→ `scripts/make-sample.py`)을 함께 바꿉니다. 호환이 깨지면 `version`을 올립니다.
- 앱이 보낸 글자는 `textContent`로만 넣습니다. `innerHTML`에 앱 데이터를 넣지 않습니다.
- 규격에 맞지 않는 데이터는 그리지 않습니다(fail closed). 없는 API(예: 아직 없는 배치 동기화·제안 API)를 있는 것처럼 호출하거나 가짜 값으로 채우지 않습니다. Life Hub에 연결된 상태에서는 예시 데이터를 섞지 않습니다.
- 이미지·링크 허용 출처를 바꾸면 `js/config.js`와 `index.html`의 CSP를 같이 바꿉니다.
- 다른 저장소(life-hub, 앱들)는 명시적으로 맡은 작업이 아니면 고치지 않습니다. 앱 쪽 작업은 `docs/prompts/`의 프롬프트로 넘깁니다.
- 바꾼 뒤에는 `npm run check`를 돌리고, 화면을 바꿨으면 `npm run smoke`(Playwright 필요)도 돌립니다.
