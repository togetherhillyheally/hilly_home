/**
 * BO에서 GPX → trails 업로드용 상수.
 * hilly_rn/constants/trailUpload.ts 와 값 동기화.
 */

export const TRAIL_GPX_STORAGE_BUCKET = "trail-gpx";

/**
 * BO 업로드 시 trails.created_by 로 기록할 관리자 profile id.
 * 현재 BO는 단일 관리자(전화 01083138230, 닉네임 "힐리힐리")만 접속하므로 고정.
 */
export const ADMIN_UPLOADER_PROFILE_ID =
  "726721ac-edbe-4d78-9489-543b2d64a5d3";
