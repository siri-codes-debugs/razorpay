import { NextResponse } from 'next/server';
import { investigateException } from '@/lib/agent';
import { generateTransactions } from '@/lib/dataGenerator';
import { reconcileTransactions } from '@/lib/reconcile';

type LLMAnalysis = {
  diagnosis: string;
  confidence: number; // 0-1
  evidence: string[];
  recommended_action: string;
  audit_trail: string[];
};

async function callOpenRouter(promptMessages: any[]): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not configured');

  const res = await fetch('https://api.openrouter.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: promptMessages,
      temperature: 0.0,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  // OpenRouter returns choices[].message.content similar to OpenAI
  const msg = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message ?? null;
  if (!msg) throw new Error('No message from OpenRouter');
  return typeof msg === 'string' ? msg : JSON.stringify(msg);
}

function buildPrompt(tx: any, ex: any) {
  const system = `You are a forensic accounting assistant. Do NOT perform arithmetic or recompute numeric fields — all arithmetic and expected/actual values are provided and authoritative. Use only the provided evidence to produce a concise diagnostic in JSON. Be explicit about reasoning steps in the audit_trail. Return ONLY a single JSON object with keys: diagnosis (string), confidence (0-1), evidence (array of strings), recommended_action (string), audit_trail (array of strings).`;

  const user = `Transaction Evidence (do not modify):\n${JSON.stringify({ transaction: tx, exception: ex }, null, 2)}\n\nProduce the JSON described above.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { transaction_id } = body;
  const SEED = Number(process.env.RECONCILE_SEED ?? 12345);
  const COUNT = Number(process.env.RECONCILE_COUNT ?? 100);
  const txs = generateTransactions(SEED, COUNT);
  const summary = reconcileTransactions(txs);

  // if transaction_id provided -> single analysis
  if (transaction_id) {
    const ex = summary.exceptions.find((e) => e.transaction_id === transaction_id);
    if (!ex) return NextResponse.json({ error: 'exception_not_found' }, { status: 404 });

    const tx = txs.find((t) => t.transaction_id === transaction_id)!;

    // Call LLM with evidence; on failure, fall back to deterministic agent but report error
    try {
      const messages = buildPrompt(tx, ex);
      const respText = await callOpenRouter(messages);
      // Parse JSON from LLM response
      let parsed: any;
      try {
        parsed = JSON.parse(respText);
      } catch (err) {
        // Attempt to extract first JSON block
        const m = respText.match(/\{[\s\S]*\}/m);
        if (m) parsed = JSON.parse(m[0]);
        else throw err;
      }

      const analysis: LLMAnalysis = {
        diagnosis: parsed.diagnosis ?? parsed.explanation ?? 'No diagnosis',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        evidence: parsed.evidence ?? [],
        recommended_action: parsed.recommended_action ?? parsed.recommendedAction ?? '',
        audit_trail: parsed.audit_trail ?? parsed.auditTrail ?? [],
      };

      return NextResponse.json({ analysis, llm_used: true });
    } catch (err: any) {
      // LLM failed — return fallback deterministic analysis and surface the error
      const fallback = investigateException(tx, ex);
      return NextResponse.json({ analysis: fallback, llm_used: false, error: String(err) }, { status: 502 });
    }
  }

  // If no transaction_id provided, run investigations for all exceptions (sequentially)
  const results: any[] = [];
  for (const ex of summary.exceptions) {
    const tx = txs.find((t) => t.transaction_id === ex.transaction_id)!;
    try {
      const messages = buildPrompt(tx, ex);
      const respText = await callOpenRouter(messages);
      let parsed: any;
      try { parsed = JSON.parse(respText); } catch (err) { const m = respText.match(/\{[\s\S]*\}/m); parsed = m ? JSON.parse(m[0]) : null; }
      const analysis = parsed ? {
        diagnosis: parsed.diagnosis ?? parsed.explanation ?? 'No diagnosis',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        evidence: parsed.evidence ?? [],
        recommended_action: parsed.recommended_action ?? parsed.recommendedAction ?? '',
        audit_trail: parsed.audit_trail ?? parsed.auditTrail ?? [],
      } : investigateException(tx, ex);
      results.push({ transaction_id: ex.transaction_id, analysis, llm_used: !!parsed });
    } catch (err: any) {
      const fallback = investigateException(tx, ex);
      results.push({ transaction_id: ex.transaction_id, analysis: fallback, llm_used: false, error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
