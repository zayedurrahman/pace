/*
  Optional Cloudflare Worker proxy for Pace's Ask AI view.

  Configure Worker environment variables in Cloudflare (never in index.html):
    APP_ORIGIN    Exact deployed app origin, for example https://example.com
    UPSTREAM_URL  OpenAI-compatible chat completions endpoint
    AI_API_KEY    Add as a Cloudflare secret
    AI_MODEL      A model supported by your provider

  Set window.PACE_AI_ENDPOINT to this Worker URL in your Pace deployment.
  This endpoint expects { question, context: { subject, topic } } and returns
  { text }. Add your provider's rate limits and usage controls before launch.
*/
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin === env.APP_ORIGIN ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (origin !== env.APP_ORIGIN) return new Response('Origin not allowed', { status: 403, headers: cors });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    let input;
    try { input = await request.json(); }
    catch { return Response.json({ error: 'Send valid JSON.' }, { status: 400, headers: cors }); }
    const question = typeof input.question === 'string' ? input.question.trim().slice(0, 4000) : '';
    const subject = typeof input.context?.subject === 'string' ? input.context.subject.slice(0, 80) : '';
    const topic = typeof input.context?.topic === 'string' ? input.context.topic.slice(0, 160) : '';
    if (!question) return Response.json({ error: 'A question is required.' }, { status: 400, headers: cors });
    if (!env.UPSTREAM_URL || !env.AI_API_KEY || !env.AI_MODEL) return Response.json({ error: 'AI proxy is not configured.' }, { status: 503, headers: cors });

    try {
      const upstream = await fetch(env.UPSTREAM_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages: [
            { role: 'system', content: `You tutor Bangladesh HSC students. Answer in 3–7 concise bullets. Study context: ${subject}${topic ? ` · ${topic}` : ''}.` },
            { role: 'user', content: question },
          ],
          max_tokens: 700,
        }),
      });
      if (upstream.status === 429) return Response.json({ error: 'Rate limit reached. Try again shortly.' }, { status: 429, headers: cors });
      if (!upstream.ok) return Response.json({ error: 'The AI provider is temporarily unavailable.' }, { status: 502, headers: cors });
      const data = await upstream.json();
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) return Response.json({ error: 'The AI provider returned no answer.' }, { status: 502, headers: cors });
      return Response.json({ text }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ error: 'Could not reach the AI provider.' }, { status: 502, headers: cors });
    }
  },
};
