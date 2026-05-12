# 힐리힐리 설계서 v4

> 실제 구현 상태 기준으로 최신화 (2026-04-16)

---

## 1. 제품 방향 요약

현재 힐리힐리의 1순위는 **전국 지도 플랫폼 완성**이 아니다.
현재 가장 중요한 것은:

> **함께 걷는 경험을 운영하는 기본 흐름**

1. 산/코스/지도를 발견한다
2. 마음에 드는 트레일을 저장하거나 구매한다
3. 사람들과 함께 갈 모임을 만든다
4. 참가자를 모집하고 운영한다
5. 산행 후 기록과 후기를 남긴다

---

## 2. IA 및 바텀탭 구조

### 2.1 바텀탭 구조

| 탭         | 코드상 이름  | 역할 한 줄 정의                  |
| ---------- | ------------ | -------------------------------- |
| **트레일** | TrailTab     | 전체 지도 / 내 지도 탐색 및 관리 |
| **모험**   | AdventureTab | 모임 생성·참가·승인·후기         |
| **프로필** | ProfileTab   | 내 기록·내 활동·자산 요약        |

> 설계서 v3에서 "커뮤니티"로 표기했던 탭은 실제 코드에서 **모험(Adventure)** 탭으로 구현됨.

---

### 2.2 트레일 탭

#### 역할

지도와 코스에 관련된 행동을 모아두는 탭. 탐색의 시작점 역할도 겸한다.

#### 구조

- 전체 지도 / 내 지도 세그먼트
- 상단 검색 (산 이름, 코스, 지역, 지도명)
- 트레일 상세 → 지도 보기, 코스 요약, 후기, 이 지도로 모임 만들기
- 체크포인트 관리 (TrailCheckpointsScreen)
- GPX 업로드 (TrailGpxUploadScreen)
- 트레일 지도 (TrailMapScreen)

#### 구현 화면

| 화면        | 파일                   | 상태 |
| ----------- | ---------------------- | ---- |
| 트레일 목록 | TrailScreen            | ✅   |
| 트레일 상세 | TrailDetailScreen      | ✅   |
| 트레일 지도 | TrailMapScreen         | ✅   |
| 체크포인트  | TrailCheckpointsScreen | ✅   |
| GPX 업로드  | TrailGpxUploadScreen   | ✅   |

---

### 2.3 모험 탭

#### 역할

사람과 세션이 중심이 되는 탭. 같이 걸을 사람을 만나고, 모임을 만들고, 참가하고, 경험을 남기는 곳.

#### 모험 탭 서브 필터

- **전체 모임**: 모집 중인 오픈 세션 (`status = open`)
- **내가 만든**: 내가 host인 세션
- **내가 참여한**: 내가 pending/approved 참가자인 세션

#### 구현 화면

| 화면             | 파일                      | 상태 |
| ---------------- | ------------------------- | ---- |
| 모험 목록        | AdventureScreen           | ✅   |
| 모험 만들기      | CreateSessionScreen       | ✅   |
| 모험 상세        | SessionDetailScreen       | ✅   |
| 참가자 관리      | ParticipantManageScreen   | ✅   |
| 모험방 상세      | AdventureRoomDetailScreen | ✅   |
| 그룹 초대 수신함 | GroupInviteInboxScreen    | ✅   |
| 그룹 초대 수락   | GroupInviteAcceptScreen   | ✅   |

#### 모험 상세 주요 기능

- 참가 신청 / 취소
- 호스트: 승인/거절, 참가자 강제 퇴출, 공지 작성, 모험 수정/삭제/취소/완료
- 유저 검색 초대 탭 + 링크 공유 탭
- 후기 작성 (반별점 0.5 단위 슬라이더)
- 공지사항 목록

---

### 2.4 프로필 탭

#### 역할

사용자의 개인 공간. 내가 쌓아온 경험과 활동 요약.

#### 구현 화면

| 화면             | 파일                 | 상태 |
| ---------------- | -------------------- | ---- |
| 프로필 메인      | ProfileScreen        | ✅   |
| 프로필 편집      | EditProfileScreen    | ✅   |
| 개인정보         | PersonalInfoScreen   | ✅   |
| 설정             | SettingsScreen       | ✅   |
| 이메일 변경      | ChangeEmailScreen    | ✅   |
| 전화번호 변경    | ChangePhoneScreen    | ✅   |
| 생일 변경        | ChangeBirthdayScreen | ✅   |
| 개인정보처리방침 | PrivacyPolicyScreen  | ✅   |
| 약관 상세        | TermsDetailScreen    | ✅   |
| 회원탈퇴         | WithdrawalScreen     | ✅   |

---

## 3. 모임 만들기 진입점

### 주 진입점

- **모험 탭 → 모임 만들기**

### 보조 진입점

- **트레일 상세 → 이 지도로 모임 만들기**
  - `CreateSessionScreen`에 `mountainName`, `routeName`, `routeSummary` 자동 주입

---

## 4. 인증

### 소셜 로그인

| 제공자   | 상태                                        |
| -------- | ------------------------------------------- |
| 카카오   | ✅                                          |
| 애플     | ✅                                          |
| 네이버   | ✅                                          |
| 디스코드 | ✅                                          |
| 이메일   | ✅                                          |
| 구글     | ❌ 주석 처리됨 (앱스토어 출시 후 연결 예정) |

### 기타

- 전화번호 인증: Edge Function `tester-auth`로 magic link 발급
- 회원탈퇴: Edge Function으로 auth user 삭제
- 토큰: `expo-secure-store` 저장

---

## 5. 결제

Toss Payments 연동.

| 화면      | 파일                | 상태 |
| --------- | ------------------- | ---- |
| 결제      | TossPaymentScreen   | ✅   |
| 주문 완료 | OrderCompleteScreen | ✅   |
| 주문 내역 | OrderHistoryScreen  | ✅   |

---

## 6. 기술 방향

- **Backend**: Supabase Client 직접 호출 (기존 REST API 제거)
- **저장소**: Supabase Postgres
- **인증**: Supabase Auth
- **권한**: Row Level Security (RLS)
- **파일**: Supabase Storage

### Repository 계층

| 파일                | 주요 함수                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| sessionRepo.ts      | create, update, listByHost, listByTrail, getById, updateStatus, cancel                                               |
| participantRepo.ts  | applyToSession, decideParticipant, cancelByUser, inviteUser, respondToInvite, listInvitedWithSessions, countApproved |
| reviewRepo.ts       | listBySession, createReview, listByAuthor                                                                            |
| noticeRepo.ts       | listBySession, createNotice, updateNotice, deleteNotice                                                              |
| notificationRepo.ts | listByUser, markAsRead, markAllAsRead, deleteOne, countUnread                                                        |
| profileRepo.ts      | getById, upsertOnboarding, updateEmail, updateBirthday, updateNickname, uploadAvatar, savePushToken                  |
| trailRepo.ts        | 트레일 CRUD, 체크포인트, GPX                                                                                         |

---

## 7. 도메인 모델

### 테이블 정의

#### `profiles`

- `id uuid pk` (`auth.users.id` 참조)
- `nickname text not null`
- `avatar_url text null`
- `created_at timestamptz default now()`

#### `hiking_sessions`

- `id uuid pk default gen_random_uuid()`
- `host_id uuid not null`
- `title text not null`
- `description text null`
- `mountain_name text not null`
- `meeting_at timestamptz not null`
- `meeting_place text not null`
- `route_summary text null`
- `capacity int not null check (capacity > 0)`
- `status text not null default 'open'` — `open | closed | completed | cancelled`
- `supplies text[] default '{}'`
- `cautions text[] default '{}'`
- `trail_id uuid null`
- `created_at / updated_at timestamptz`

#### `hiking_session_participants`

- `id uuid pk`
- `session_id uuid not null`
- `user_id uuid not null`
- `status text not null default 'pending'` — `pending | approved | rejected | cancelled`
- `applied_at / decided_at / decided_by`
- unique `(session_id, user_id)`

#### `hiking_session_notices`

- `id uuid pk`
- `session_id uuid not null`
- `author_id uuid not null`
- `content text not null`
- `created_at timestamptz`

#### `hiking_session_reviews`

- `id uuid pk`
- `session_id uuid not null`
- `author_id uuid not null`
- `rating int not null check (rating between 1 and 5)`
- `content text not null`
- unique `(session_id, author_id)`

---

## 8. 권한 모델 (RLS)

#### `hiking_sessions`

- SELECT: 공개
- INSERT: 로그인 사용자만
- UPDATE/DELETE: `host_id == auth.uid()`

#### `hiking_session_participants`

- SELECT: 본인 신청 건 + 해당 세션 host
- INSERT: 본인만 (`auth.uid() == user_id`)
- UPDATE: host는 `pending → approved/rejected`, 신청자는 본인 건 `→ cancelled`

#### `hiking_session_notices`

- SELECT: 세션 조회 가능한 사용자
- INSERT/UPDATE/DELETE: host만

#### `hiking_session_reviews`

- SELECT: 공개
- INSERT: approved 참가자 + 세션 status `completed`
- UPDATE/DELETE: 작성자 본인만

---

## 9. 알림 시스템

### 구조

```
앱 → supabase.functions.invoke("send-notification")
   → notifications 테이블 INSERT (항상)
   → Expo Push 발송 (expo_push_token 있을 때만)
   → iOS: APNs / Android: FCM (Expo가 내부 처리)
```

### 알림 발생 시점

| 액션             | 수신자             | 타입                |
| ---------------- | ------------------ | ------------------- |
| 참가 신청        | 호스트             | `invite_received`   |
| 참가 승인        | 신청자             | `session_approved`  |
| 참가 거절        | 신청자             | `session_rejected`  |
| 참가자 강제 퇴출 | 퇴출된 참가자      | `session_rejected`  |
| 모험 정보 수정   | 승인된 참가자 전원 | `session_updated`   |
| 모험 취소        | 승인된 참가자 전원 | `session_cancelled` |
| 초대 발송        | 초대받은 유저      | `invite_received`   |
| 초대 수락/거절   | 호스트             | `invite_accepted`   |
| D-1 리마인더     | 승인된 참가자 전원 | `session_reminder`  |

### D-1 리마인더

- Edge Function: `session-reminder`
- 스케줄: pg_cron, 매일 UTC 00:00 (KST 09:00)
- 중복 발송 방지: 당일 동일 세션 이미 발송 시 skip

### 알림 화면

- 스크린: `NotificationsScreen`
- 진입: 트레일/모험 탭 우상단 AlarmIcon
- 기능: 읽음 처리, 모두 읽음, 개별 삭제, 알림 탭 시 해당 세션 상세 이동

---

## 10. GPS 추적

- `hooks/useGpsTracking.ts`
- 백그라운드 위치 업데이트
- 체크포인트 도착 이벤트 기반

---

## 11. 딥링크 (예정)

### 현재 상태

- `app.config.ts`에 URL scheme 설정됨 (`hillyheally://`, `https://hillyheally.com`)
- 앱 내 딥링크 인터셉터 미구현

### 구현 예정 (앱스토어 출시 후)

- 모험 상세 딥링크: `https://hillyheally.com/adventure/{sessionId}`
- 앱 설치 시 → 바로 SessionDetailScreen 진입
- 앱 미설치 시 → hillyheally.com 랜딩 → App Store / Play Store 이동
- 필요 인프라: `apple-app-site-association`, `assetlinks.json` 배포

---

## 12. 전체 구현 현황

| 영역                      | 상태     | 비고                        |
| ------------------------- | -------- | --------------------------- |
| 3탭 내비게이션            | ✅       | Trail / Adventure / Profile |
| 인증 (소셜 4종 + 이메일)  | ✅       | 구글만 미적용               |
| 트레일 화면 5종           | ✅       | GPX, 체크포인트 포함        |
| 모험 화면 7종             | ✅       | 그룹 초대, 참가자 관리 포함 |
| 프로필 화면 10종          | ✅       |                             |
| 결제 (Toss)               | ✅       |                             |
| Supabase Repository 8종   | ✅       |                             |
| 알림 시스템               | ✅       | 7개 타입, D-1 리마인더      |
| 구글 로그인               | ❌       | 앱스토어 출시 후 연결       |
| 딥링크                    | ❌       | 앱스토어 출시 후 구현       |
| 실시간 위치 트래킹 (공유) | 🔜 2순위 |                             |
| 배지/레벨/게임화          | 🔜 2순위 |                             |
