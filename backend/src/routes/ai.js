/**
 * AI chat route — proxies the Cactus Pro Assistant to Claude.
 *
 * The API key lives server-side only (ANTHROPIC_API_KEY). The frontend sends a
 * compact portfolio context built from the store; we never expose the key to the
 * browser. If no key is configured the route reports { available:false } so the
 * client falls back to its built-in rule-based engine.
 *
 *   GET  /api/ai/status  → { available }
 *   POST /api/ai/chat    → { available, text }   body: { message, history?, context }
 */
const express = require('express');
const router = express.Router();

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

// Lazily construct the client so the server still boots without a key.
let _client = null;
function client() {
  if (!_client) {
    const Anthropic = require('@anthropic-ai/sdk');
    _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }
  return _client;
}

const SYSTEM = `You are the Cactus Pro Assistant, the AI helper inside Cactus Partners' internal venture-capital portal.

You answer questions about the firm's portfolio companies, fund metrics, and how to use the portal. A structured snapshot of the current portal data is provided below in <portfolio_data>. Answer using ONLY that data plus general knowledge of how VC portals work.

Rules:
- Be concise and direct. Use short paragraphs or bullet points. This renders in a small chat window.
- When a figure is in the data, quote it exactly (currency, units). Never invent numbers.
- If the data does not contain the answer, say so plainly and suggest where in the portal it might live (Portfolio, Finance, Admin).
- All monetary values are in Indian Rupees Crore (₹Cr) unless stated.
- You may use **bold** for emphasis; do not use headings or tables.`;

router.get('/status', (_req, res) => res.json({ available: hasKey() }));

router.post('/chat', async (req, res) => {
  if (!hasKey()) return res.json({ available: false });

  const { message, history, context } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  // Build the conversation: prior turns (bounded) + the new question.
  const msgs = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-8)) {
      if (!h || !h.text) continue;
      msgs.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text).slice(0, 4000) });
    }
  }
  // Ensure the conversation starts with a user turn.
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  msgs.push({ role: 'user', content: message.slice(0, 4000) });

  const system = `${SYSTEM}\n\n<portfolio_data>\n${String(context || '').slice(0, 40000)}\n</portfolio_data>`;

  try {
    const resp = await client().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: msgs,
      output_config: { effort: 'low' }, // fast, low-latency for a chat UI
    });
    const text = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    res.json({ available: true, text: text || "I couldn't generate a response. Please try rephrasing." });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
