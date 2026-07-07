// Vercel serverless function: proxies chat requests to Anthropic's API.
// Runs server-side, so it avoids the browser CORS restriction that a direct
// fetch() from client-side JS would hit, and keeps the request off the
// public network tab as a direct third-party call.
//
// Each user supplies their own Anthropic API key (stored in their account via
// Supabase, sent up with each request) — so ScholarFlow AI itself never pays
// for anyone's usage.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { apiKey, model, max_tokens, system, messages } = req.body || {};

  if (!apiKey) {
    res.status(400).json({ error: { message: 'Missing api_key' } });
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { message: 'Missing messages' } });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-5',
        max_tokens: max_tokens || 1500,
        system: system || undefined,
        messages,
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'Proxy request failed' } });
  }
}
