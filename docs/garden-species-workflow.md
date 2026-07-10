# 정원 종(식물/동물) 추가 워크플로

BO 에서 SVG 를 만들어 테스트하고, 스크립트로 앱(hilly_rn)에 이관한 뒤, OTA 배포 후 공개하는 절차.

## 핵심 개념: 이름 3형제는 반드시 일치

| 위치 | 예시 (여우) | 형식 |
|---|---|---|
| BO SVG 함수명 | `function Fox(...)` | **PascalCase** |
| DB `garden_species.svg_key` | `'Fox'` | 함수명과 동일 |
| 스크립트 인자 (새종이름) | `npm run port-svg -- Fox` | 함수명과 동일 |

DB 의 `key` 컬럼(예: `fox`)은 snake_case 별개 식별자 — svg_key 와 혼동 주의.

## 절차

### 1. BO 에서 SVG 제작
- 파일: `app/admin/(authed)/users/[id]/garden-svgs.tsx`
- `function 새종이름(w: number, g = 1)` 작성 (성장 모핑은 `g` 0~1 활용)
- 파일 하단 `PLANT_SVG` 맵에 등록
- 좌표계: 100×100, 지면 y≈86~87, 중심 x=50

### 2. DB 에 종 등록 (자동 미공개)
```sql
INSERT INTO garden_species (key, name, category, zone, max_stage, recipe, svg_key, scale_m, is_brand, sort_order, stage_names)
VALUES ('fox', '여우', 'animal', 'ground', 3,
  '[{"food":2,"sleep":1},{"food":3,"play":1},{"food":3,"play":1,"sleep":2}]',
  'Fox', 1.0, false, 40,
  '["아기 여우","어린 여우","여우","늠름한 여우"]');
```
- `is_published` 기본값 false → 앱엔 안 보이고 BO 도감에서만 보임 (미공개 배지)
- recipe/stage_names 는 기존 같은 카테고리 종 참고

### 3. BO 도감에서 확인
- `/admin/objects` — 성장 단계 스트립 클릭 → 큰 미리보기 (←/→ 로 단계 이동, 동물은 앞/옆 토글)

### 4. RN 이관 (스크립트)
```bash
npm run port-svg -- Fox --write      # RN plantSvgs.tsx 에 반영 (교체/삽입 + 맵 등록)
npm run port-svg -- --check          # 양쪽 동기화 상태 확인
npm run port-svg -- --list           # BO 종 목록 + RN 등록 여부
npm run port-svg -- Fox              # 반영 없이 변환 결과만 출력 (복붙용)
```
- RN 경로 기본값: `../hilly_rn` (형제 디렉토리). 다르면 `--rn <path>` 또는 `HILLY_RN` env
- 이관 후 hilly_rn 에서 `npx tsc --noEmit` + 앱 확인, hilly_rn 커밋

### 5. OTA 배포 (hilly_rn)
- EAS Update 푸시 → 본인 기기에서 새 종이 제대로 그려지는지 확인
- OTA 는 유저가 앱을 다음에 실행할 때 적용되므로 반나절~하루 버퍼 권장

### 6. 공개
- BO `/admin/objects` → 해당 종 카드 하단 **"앱에 공개하기"** 클릭
- 이 순간부터 앱 심기 목록·보상 후보에 노출 (RLS 게이트라 앱 코드 무관)
- 퍼즐 완성 보상 연결은 **공개 후에** (`/admin/puzzles/[id]` 편집 폼)

## 재심기 비용 (plant_cost — 브랜드 종만)

퍼즐로 해금한 브랜드 종을 **추가로 심을 때** 드는 씨앗값. 공식: `round(연결 퍼즐 max 조각 수 × 1.5)`, 미연결 브랜드 종 = 30.

- **자동 재계산 시점**: BO에서 퍼즐 보상 연결 변경 시, 퍼즐 격자(난이도) 변경 시
- **수동 오버라이드**: 도감 카드 "재심기 비용" 연필 아이콘 → 값 지정 (수동 badge 표시, 이후 자동 재계산 제외)
- **자동 복귀**: 수동 badge 옆 ↺ 버튼 → 공식값으로 재계산
- 동물은 현재 펫 모델(씨앗 차감 없음)이지만 향후 확장 대비 같은 공식으로 채움

## 주의사항
- 공개 전 종을 퍼즐 보상으로 연결하면 편집 폼에 빨간 "미공개" 배지 경고가 뜸 — 구버전 앱 유저에게 새싹(fallback)이 지급될 수 있으니 피할 것
- 앱에서는 super_admin 포함 **모든 계정이 공개 종만 봄** (일반 유저와 동일 — 테스트 정확성 우선). 미공개 종 미리보기는 BO 도감에서
- `--check` 에서 legacy 종(Deer/Bird/CloudPlant 등)의 "차이"는 RN 고유 기능(tint/flying) 때문 — 정상
