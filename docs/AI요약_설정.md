# 변경사항 AI 요약 설정 방법

조직도 화면 오른쪽 **변경사항 → [AI 요약]** 버튼이 동작하려면 Supabase에 서버 기능 1개와 AI 키 1개를 등록해야 합니다. (처음 1회)

## 1. Claude API 키 발급
1. https://console.anthropic.com 접속 → 회사 계정으로 가입
2. **Billing**에서 크레딧 충전 (최소 금액) → **Limits**에서 월 사용 한도 설정 권장
3. **API Keys → Create Key** → 이름 `atec-sandbox` → 키 복사 (한 번만 보임)

## 2. 서버 기능(Edge Function) 등록
1. Supabase 대시보드 → ATEC-ORG 프로젝트 → 왼쪽 **Edge Functions**
2. **Deploy a new function → Via Editor**
3. 함수 이름: `change-summary` (철자 그대로)
4. 편집기 내용을 지우고 `supabase/functions/change-summary/index.ts` 내용을 그대로 붙여넣기 → **Deploy**
5. 함수 설정에서 **Verify JWT(로그인 확인)**가 켜져 있는지 확인

## 3. AI 키 저장
1. **Edge Functions → Secrets** (또는 Project Settings → Edge Functions)
2. **Add new secret**: 이름 `ANTHROPIC_API_KEY`, 값에 1번에서 복사한 키 → Save

## 4. 확인
조직도에서 27년 안 선택 → 오른쪽 **변경사항** → 아래 **[AI 요약]** 클릭 → 몇 초 뒤 보고용 요약이 나오면 완료

## 보안
- AI 키는 Supabase 서버에만 저장되고 화면 코드·GitHub에는 없습니다.
- 로그인하고 등록 명단에 있는 계정만 요약을 요청할 수 있습니다.
- AI에는 변경사항 목록(조직명·이름·이동·인원 수)만 보내며 생년·나이·입사일은 보내지 않습니다.
