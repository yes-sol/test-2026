# Paper Plane Motion Test

주문 대기 화면("Waiting for store to accept...") 상단 일러스트의 종이비행기 모션을 테스트하는 프로토타입입니다.
세 가지 버전이 나란히 재생되어 비교할 수 있습니다. 아래 주문 카드 UI는 정적 상태이고, 상단 일러스트 영역만 움직입니다.

| 버전 | 테스트 내용 |
| --- | --- |
| A | 메인 종이비행기만, 빠른 모션. 작게 나타나 커지면서 중앙에서 가장 빠르고(모션 블러), 빠져나가며 다시 작아짐 |
| B | A + 배경 parallax. 도시와 구름이 서로 다른 속도로 이동 |
| C | B + 주변 작은 종이비행기. 낮은 opacity로 깊이와 속도가 서로 다름 |

## 조작

- 폰 클릭: 해당 버전만 재생/정지
- 상단 버튼: 전체 재생, 전체 정지, 처음부터
- 재생 속도: 0.25× / 0.5× / 1×
- 모션 블러 켜기/끄기

## 로컬에서 보기

빌드 과정이나 외부 라이브러리가 없습니다. `index.html`을 브라우저로 바로 열거나 로컬 서버를 띄우면 됩니다.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 구조

```
index.html        진입점 (폰 UI 마크업)
css/style.css     스타일
js/main.js        캔버스 애니메이션 (비행기, parallax, 작은 비행기)
assets/map.svg    주문 카드의 지도 이미지
assets/favicon.svg
.nojekyll         GitHub Pages에서 Jekyll 처리 없이 그대로 서빙
```

## 모션 값 조정

`js/main.js` 위쪽에 값이 모여 있습니다.

- `VERSIONS`: 버전별 루프 길이(`dur`), 중앙 가속 정도(`k`), 블러 강도(`blur`), 켤 레이어
- `CLOUDS`, `DOTS`: 배경 요소의 속도(`sp`), 크기, opacity
- 도시 속도: `render()` 안의 `t * 5`(먼 층), `t * 12`(가까운 층)
- `SWARM`: 작은 비행기의 깊이(`z` = 크기), 속도(`sp`), opacity(`a`)
- `mainAt()`: 메인 비행기의 경로, 크기 곡선, 각도
