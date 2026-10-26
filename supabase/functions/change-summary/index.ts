// ATEC-SANDBOX · 변경사항 AI 요약 (Supabase Edge Function)
// - 로그인 + 등록 명단(org_members) 확인 후, 화면에서 보낸 '변경사항 텍스트'만 Claude에 전달해 보고 문구로 요약한다.
// - API 키는 Supabase Secrets(ANTHROPIC_API_KEY)에만 저장하고 화면 코드에는 두지 않는다.
// - 생년·나이 등 인사정보는 보내지 않는다(조직명·이름·조직 간 이동·인원 수만 포함).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `당신은 기업 인사팀의 조직개편 보고서 작성을 돕는 비서입니다.
입력은 두 조직안(기준안 → 비교안)을 비교한 변경사항 목록입니다. 이를 경영진 보고용 요약으로 정리하세요.

규칙
- 입력에 있는 사실만 쓰고, 이유·효과·평가를 추측해 덧붙이지 않는다.
- 숫자와 이름은 입력 그대로 쓴다.
- 보고서 문체(~함, ~임)로 짧게 쓴다.
- 아래 형식을 지킨다. 해당 내용이 없으면 그 항목은 생략한다.

형식
■ 핵심 요약
- 전체 변화를 1~2줄로

■ 조직 구조
- 신설·폐지·명칭·소속 변경을 묶어서 정리

■ 인원 변동
- 전체 인원 증감과 조직별 주요 증감
- 부서 이동·충원·제외 인원을 조직 단위로 묶어 정리

■ 확인 필요
- 조직장 공석, 채용예정, 미배치처럼 후속 조치가 필요한 항목`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, apikey, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u?.user?.email) return json({ error: "로그인이 필요합니다." }, 401);
    const { data: m } = await sb.from("org_members").select("role").eq("email", u.user.email).maybeSingle();
    if (!m) return json({ error: "이 계정에는 권한이 없습니다." }, 403);

    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) return json({ error: "요약할 변경사항이 없습니다." }, 400);
    if (text.length > 15000) return json({ error: "변경사항이 너무 많아 요약할 수 없습니다." }, 400);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "서버에 AI 키가 설정되지 않았습니다." }, 500);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "claude-haiku-5-5",
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: "user", content: text }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "AI 호출에 실패했습니다: " + (j?.error?.message ?? r.status) }, 502);
    const summary = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("").trim();
    return json({ summary });
  } catch (e) {
    return json({ error: "요약 중 오류가 발생했습니다: " + String(e) }, 500);
  }
});
