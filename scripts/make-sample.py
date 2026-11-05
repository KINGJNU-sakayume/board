#!/usr/bin/env python3
"""data/sample-tiles.json 을 만든다. 모든 값은 지어낸 예시이고, 표지는 글자 없는 추상 SVG 다(실제 작품 표지를 넣지 않는다)."""
import json, urllib.parse, pathlib

def cover(h, ar=(2, 3), shape=0):
    w, hh = 200, int(200 * ar[1] / ar[0])
    h2 = (h + 40) % 360
    shapes = [
        f"<circle cx='{w*.7:.0f}' cy='{hh*.3:.0f}' r='{w*.25:.0f}' fill='rgba(255,255,255,.28)'/>",
        f"<rect x='{w*.15:.0f}' y='{hh*.18:.0f}' width='{w*.7:.0f}' height='{w*.7:.0f}' rx='{w*.35:.0f}' fill='rgba(0,0,0,.18)'/>",
        f"<path d='M0 {hh*.75:.0f} Q{w*.5:.0f} {hh*.45:.0f} {w} {hh*.7:.0f} V{hh} H0Z' fill='rgba(255,255,255,.22)'/>",
    ]
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {hh}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
           f"<stop offset='0' stop-color='hsl({h},62%,58%)'/><stop offset='1' stop-color='hsl({h2},55%,28%)'/></linearGradient></defs>"
           f"<rect width='{w}' height='{hh}' fill='url(#g)'/>{shapes[shape % 3]}"
           f"<rect x='{w*.12:.0f}' y='{hh*.82:.0f}' width='{w*.5:.0f}' height='8' rx='4' fill='rgba(255,255,255,.65)'/></svg>")
    return {"src": "data:image/svg+xml," + urllib.parse.quote(svg, safe="/:=' ,()"), "alt": ""}

SQ = (1, 1)
APP = "https://kingjnu-sakayume.github.io/"
T = "2026-11-04T13:00:00Z"
def man(app, tiles): return {"version": 1, "app": app, "generated_at": T, "tiles": tiles}

manifests = [
  man("hub", [
    {"id": "memo", "name": "Claude 메모", "tone": "type", "form": "line", "sizes": ["2x1", "4x1"], "size": "2x1",
     "data": {"label": "Claude 메모 · 승인됨 · 11월 3일", "title": "시청은 늘고 독서는 잠시 쉬었어요."}},
    {"id": "inbox", "name": "받은 제안", "tone": "type", "form": "num", "sizes": ["1x1", "2x1"], "size": "1x1",
     "data": {"label": "받은 제안", "value": 3, "unit": "건"}},
  ]),
  man("diaryroulette", [
    {"id": "today", "name": "일기 룰렛 · 오늘의 미션", "tone": "type", "form": "line", "sizes": ["2x1", "4x1"], "size": "2x1", "default": False,
     "href": APP + "diaryroulette/", "data": {"label": "일기 룰렛 · 오늘의 미션", "title": "오늘 마신 음료 하나 기록하기", "sub": "아직 안 했어요"}},
  ]),
  man("animan", [
    {"id": "now", "name": "AniMan · 정주행 중", "tone": "sleeve", "sizes": ["1x1", "2x1", "2x2", "4x2"], "size": "2x2", "href": APP + "animan/",
     "data": {"label": "AniMan", "title": "푸른 항로", "sub": "시즌 2\n7화까지", "pill": "11/4 이어 봄", "cover": cover(330, shape=0),
              "progress": {"value": 7, "max": 12, "text": "7 / 12화"}, "listLabel": "최근 정주행",
              "list": [{"title": "푸른 항로", "value": "7화", "cover": cover(330, shape=0)}, {"title": "여름의 끝에서", "value": "3화", "cover": cover(30, shape=1)},
                       {"title": "밤하늘 도서관", "value": "2권", "cover": cover(220, shape=2)}]},
     "detail": {"title": "AniMan · 최근 정주행 5개", "rows": [
        {"title": "푸른 항로", "sub": "시즌 2 · 7 / 12화", "cover": cover(330, shape=0), "progress": {"value": 7, "max": 12}},
        {"title": "여름의 끝에서", "sub": "3 / 13화", "cover": cover(30, shape=1), "progress": {"value": 3, "max": 13}},
        {"title": "밤하늘 도서관", "sub": "만화 · 2 / 9권", "cover": cover(220, shape=2), "progress": {"value": 2, "max": 9}},
        {"title": "작은 등대", "sub": "11 / 12화 · 거의 다 봤어요", "progress": {"value": 11, "max": 12}},
        {"title": "겨울 편지", "sub": "1 / 24화", "progress": {"value": 1, "max": 24}}]}},
    {"id": "done", "name": "AniMan · 최근 완주", "tone": "strip", "sizes": ["2x1", "4x1"], "size": "4x1", "href": APP + "animan/",
     "data": {"label": "AniMan · 최근 완주", "items": [{"title": "작은 등대", "cover": cover(190, shape=1)}, {"title": "봄의 정거장", "cover": cover(100, shape=2)},
              {"title": "별빛 수선집", "cover": cover(260, shape=0)}, {"title": "바다 우체국"}, {"title": "달의 뒷면"}, {"title": "긴 여름"}]}},
    {"id": "next", "name": "AniMan · 이어 볼 차례", "tone": "type", "form": "list", "sizes": ["2x1", "2x2"], "size": "2x2", "default": False,
     "data": {"label": "AniMan · 이어 볼 차례", "rows": [{"rank": 1, "title": "여름의 끝에서", "value": "4화"}, {"rank": 2, "title": "밤하늘 도서관", "value": "3권"},
              {"rank": 3, "title": "겨울 편지", "value": "2화"}, {"rank": 4, "title": "작은 등대 외전", "value": "1화"}]}},
  ]),
  man("letterbookxd", [
    {"id": "reading", "name": "책장 · 읽는 중", "tone": "sleeve", "sizes": ["1x1", "2x1", "2x2"], "size": "2x2", "href": APP + "letterbookxd/",
     "data": {"label": "책장", "title": "해안선의 기억", "sub": "예시 출판사 · 3권\n214 / 312쪽", "pill": "읽는 중", "cover": cover(18, shape=2),
              "progress": {"value": 214, "max": 312, "text": "69% · 11/5 읽음"}}},
    {"id": "recent", "name": "책장 · 최근 읽은 책", "tone": "strip", "sizes": ["2x1", "4x1"], "size": "4x1", "default": False,
     "data": {"label": "책장 · 최근 읽은 책", "items": [{"title": "해안선의 기억", "cover": cover(18, shape=2)}, {"title": "밤의 숲"}, {"title": "길 위의 편지"}, {"title": "바람의 문장"}]}},
    {"id": "series", "name": "책장 · 시리즈 진행", "tone": "type", "form": "cells", "sizes": ["2x1", "4x1"], "size": "2x1",
     "data": {"label": "책장 · 해안선의 기억 · 3 / 7권", "total": 7, "filled": 3}},
  ]),
  man("potcast", [
    {"id": "now", "name": "potcast · 지금 듣는 앨범", "tone": "hero", "sizes": ["1x1", "2x1", "2x2", "4x1", "4x2"], "size": "4x2", "href": APP + "potcast/",
     "data": {"label": "potcast · 최근 들은 앨범", "title": "새벽의 항해", "sub": "예시 아티스트", "cover": cover(24, SQ, 2),
              "progress": {"value": 6, "max": 14, "text": "트랙 6 / 14"}, "listLabel": "디깅 중",
              "list": [{"title": "유리 정원", "value": "2번 들음"}, {"title": "낮은 파도", "value": "1번 들음"}]}},
    {"id": "recent", "name": "potcast · 최근 들은 앨범", "tone": "strip", "sizes": ["2x1", "4x1"], "size": "4x1", "default": False,
     "data": {"label": "potcast · 최근 들은 앨범", "square": True, "items": [{"title": "새벽의 항해", "cover": cover(24, SQ, 2)}, {"title": "유리 정원", "cover": cover(160, SQ, 0)},
              {"title": "낮은 파도", "cover": cover(200, SQ, 1)}, {"title": "긴 오후"}, {"title": "마지막 열차"}]}},
    {"id": "digging", "name": "potcast · 디깅 큐", "tone": "type", "form": "list", "sizes": ["2x1", "2x2"], "size": "2x2", "default": False,
     "data": {"label": "potcast · 디깅 큐", "rows": [{"title": "유리 정원", "value": "2번 들음", "cover": cover(160, SQ, 0)}, {"title": "낮은 파도", "value": "1번 들음", "cover": cover(200, SQ, 1)},
              {"title": "긴 오후", "value": "아직"}, {"title": "마지막 열차", "value": "아직"}]}},
  ]),
  man("elosorter", [
    {"id": "ranking", "name": "ELO Sorter · 현재 순위", "tone": "type", "form": "list", "sizes": ["1x1", "2x1", "2x2"], "size": "2x2", "href": APP + "elosorter/",
     "data": {"label": "ELO Sorter · 지금 정렬 중", "foot": "비교 214회 · 방금 비교함", "rows": [
        {"rank": 1, "title": "새벽의 항해", "trend": "up", "value": "2", "cover": cover(24, SQ, 2)}, {"rank": 2, "title": "유리 정원", "trend": "same"},
        {"rank": 3, "title": "낮은 파도", "trend": "down", "value": "1"}, {"rank": 4, "title": "긴 오후", "trend": "up", "value": "1"}]}},
    {"id": "last", "name": "ELO Sorter · 최근 승부", "tone": "type", "form": "line", "sizes": ["2x1", "4x1"], "size": "2x1", "default": False,
     "data": {"label": "ELO Sorter · 방금 비교", "title": "새벽의 항해 > 긴 오후", "sub": "1위 유지"}},
  ]),
  man("achievement", [
    {"id": "recent", "name": "업적 · 최근 취득", "tone": "type", "form": "line", "sizes": ["1x1", "2x1"], "size": "2x1", "href": APP + "achievement/",
     "data": {"label": "업적 · 최근 취득", "title": "7일 연속 기록", "sub": "11월 3일"}},
    {"id": "trophy", "name": "업적 · 트로피 칸", "tone": "type", "form": "cells", "sizes": ["2x1", "4x1"], "size": "2x1",
     "data": {"label": "업적 · 트로피 칸 · 5 / 8", "total": 8, "filled": 5}},
    {"id": "next", "name": "업적 · 다음 목표", "tone": "type", "form": "line", "sizes": ["1x1", "2x1"], "size": "2x1", "default": False,
     "data": {"label": "업적 · 다음 목표", "title": "9일 연속 기록", "progress": {"value": 7, "max": 9, "text": "9일 중 7일"}}},
    {"id": "activity", "name": "업적 · 마지막 운동", "tone": "type", "form": "line", "sizes": ["1x1", "2x1"], "size": "2x1", "default": False,
     "data": {"label": "운동 · 마지막 기록", "title": "러닝 5km", "sub": "11/2 · 31분"}},
  ]),
  man("sub", [
    {"id": "station", "name": "역 도장깨기", "tone": "plate", "sizes": ["1x1", "2x1", "4x2"], "size": "4x2", "href": APP + "sub/",
     "data": {"label": "역 도장깨기 · 최근 역 · 룰렛", "name": "서현", "roman": "Seohyeon", "sub": "11/2 · 87 / 150역",
              "roulette": {"candidates": ["수서", "광명", "동탄", "오송", "판교", "대전", "오리", "정자"]}}},
    {"id": "wish", "name": "역 도장깨기 · 가고 싶은 역", "tone": "plate", "sizes": ["1x1", "2x1"], "size": "1x1", "default": False,
     "data": {"label": "다음 후보", "name": "수서", "roman": "Suseo"}},
    {"id": "count", "name": "역 도장깨기 · 진행률", "tone": "type", "form": "num", "sizes": ["1x1", "2x1"], "size": "1x1", "default": False,
     "data": {"label": "역 도장깨기", "value": 87, "unit": "/ 150"}},
  ]),
  man("kyeokyeoi", [
    {"id": "regions", "name": "켜켜이 · 지역 방문", "tone": "map", "sizes": ["2x1", "2x2"], "size": "2x2", "href": APP + "kyeokyeoi/",
     "data": {"label": "켜켜이 · 지역 방문 · 최근 강원", "summary": "17개 시도 중 9곳 방문, 최근 강원", "cols": 5, "cells": [
        {"state": "none"}, {"state": "on", "name": "인천"}, {"state": "on", "name": "서울"}, {"state": "on", "name": "경기"}, {"state": "last", "name": "강원"},
        {"state": "none"}, {"state": "on", "name": "충남"}, {"state": "on", "name": "세종"}, {"state": "off", "name": "충북"}, {"state": "off", "name": "경북"},
        {"state": "off", "name": "전북"}, {"state": "on", "name": "대전"}, {"state": "none"}, {"state": "off", "name": "대구"}, {"state": "off", "name": "울산"},
        {"state": "off", "name": "전남"}, {"state": "off", "name": "광주"}, {"state": "none"}, {"state": "off", "name": "경남"}, {"state": "on", "name": "부산"},
        {"state": "none"}, {"state": "none"}, {"state": "off", "name": "제주"}, {"state": "none"}, {"state": "none"}]}},
    {"id": "memory", "name": "켜켜이 · 최근 추억", "tone": "type", "form": "line", "sizes": ["2x1", "4x1"], "size": "2x1", "default": False,
     "data": {"label": "켜켜이 · 최근 추억", "title": "바닷가 산책", "sub": "강릉 · 11월 1일"}},
  ]),
  man("food", [
    {"id": "recent", "name": "PALATE · 최근 먹은 것", "tone": "strip", "sizes": ["2x1", "4x1"], "size": "2x1", "href": APP + "food/",
     "data": {"label": "PALATE · 최근 먹은 것", "square": True, "items": [{"title": "국밥"}, {"title": "냉면"}, {"title": "비빔밥"}, {"title": "빵"}, {"title": "차"}]}},
    {"id": "wish", "name": "PALATE · 먹고 싶은 것", "tone": "type", "form": "list", "sizes": ["2x1", "2x2"], "size": "2x2", "default": False,
     "data": {"label": "PALATE · 먹고 싶은 것", "rows": [{"title": "평양냉면", "value": "3일째"}, {"title": "따뜻한 소바", "value": "1주째"}, {"title": "크루아상 샌드", "value": "2주째"}]}},
  ]),
]

out = pathlib.Path(__file__).resolve().parent.parent / "data" / "sample-tiles.json"
out.write_text(json.dumps({"note": "모든 값은 지어낸 예시입니다. scripts/make-sample.py 로 만듭니다.", "manifests": manifests}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(out, out.stat().st_size)
