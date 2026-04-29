// ============================================================
// IRON CIRCLE — ai.js
// AI analysis module (calls Anthropic API)
// ============================================================

async function runAIAnalysis() {
  if (!sessions.length) { showToast('Log sessions first'); return; }

  const focus = document.getElementById('ai-focus').value;
  const output = document.getElementById('ai-output');

  output.innerHTML = `
    <div class="ai-panel">
      <div class="ai-thinking">
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
        <span>Analyzing ${sessions.length} session${sessions.length > 1 ? 's' : ''}…</span>
      </div>
    </div>
  `;

  const summary = buildDataSummary();
  const focusMap = {
    overall:   'Give a comprehensive progress review covering all aspects of training.',
    technique: 'Focus on technique consistency, best-to-average ratios, and what conditions correlate with technical breakthroughs.',
    recovery:  'Focus on CNS fatigue patterns, sleep quality impact on performance, and recovery optimization strategies.',
    arousal:   'Focus on pre-session arousal vs performance correlation, caffeine impact, and competition readiness.',
    lifting:   'Focus on lifting data and any correlation with throwing performance. Identify key strength movements.',
    injury:    'Focus on pain/discomfort patterns, warning signs, and management recommendations.',
    peaking:   'Analyze the data to recommend a peaking strategy and identify peak readiness indicators.',
  };

  const prompt = `You are an elite throws coach with deep expertise in shot put and discus biomechanics, periodization, CNS fatigue management, and athlete monitoring. Analyze the following training data for a Division I NCAA thrower (shot put and discus) and provide expert, specific, actionable feedback.

TRAINING DATA:
${summary}

FOCUS: ${focusMap[focus]}

Provide your analysis using this exact HTML structure (no markdown, use these tags only):
<h3>Section Title</h3>
<p>Your paragraph text here.</p>
<ul><li>Point one</li><li>Point two</li></ul>

Rules:
- Be specific with numbers from the data
- Reference specific patterns you notice
- Give concrete, actionable recommendations
- Be direct and coach-like, not generic
- Keep total response under 450 words
- Use 2–3 sections with h3 headers`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.map(c => c.text || '').join('') || 'No response received.';

    output.innerHTML = `
      <div class="ai-panel">
        <div class="ai-response">${text}</div>
      </div>
    `;
  } catch (e) {
    output.innerHTML = `
      <div class="ai-panel">
        <p style="color:var(--red)">Error: ${e.message || 'Could not connect. Try again.'}</p>
      </div>
    `;
  }
}

function buildDataSummary() {
  const lines = [];

  lines.push(`Total sessions logged: ${sessions.length}`);

  const allBests = sessions.map(s => s.bestThrow);
  lines.push(`All-time PR: ${Math.max(...allBests).toFixed(2)}m`);
  lines.push(`Recent 5 session bests: ${sessions.slice(0, 5).map(s => s.bestThrow.toFixed(2) + 'm').join(', ')}`);

  const totalThrows = sessions.reduce((a, s) => a + s.throws.length, 0);
  lines.push(`Total throws: ${totalThrows}, avg per session: ${(totalThrows / sessions.length).toFixed(1)}`);

  const avgSleep   = sessions.reduce((a, s) => a + s.sleepQuality, 0) / sessions.length;
  const avgFatigue = sessions.reduce((a, s) => a + s.cnsFatigue,   0) / sessions.length;
  const avgArousal = sessions.reduce((a, s) => a + s.arousalPre,   0) / sessions.length;
  lines.push(`Avg sleep quality: ${avgSleep.toFixed(1)}/10`);
  lines.push(`Avg CNS fatigue: ${avgFatigue.toFixed(1)}/10`);
  lines.push(`Avg pre-session arousal: ${avgArousal.toFixed(1)}/10`);

  // Sleep vs performance
  if (sessions.length >= 4) {
    const goodSleep = sessions.filter(s => s.sleepQuality >= 7);
    const poorSleep = sessions.filter(s => s.sleepQuality <= 5);
    if (goodSleep.length && poorSleep.length) {
      const goodAvg = goodSleep.reduce((a, s) => a + s.bestThrow, 0) / goodSleep.length;
      const poorAvg = poorSleep.reduce((a, s) => a + s.bestThrow, 0) / poorSleep.length;
      lines.push(`Best throw avg with good sleep (≥7): ${goodAvg.toFixed(2)}m vs poor sleep (≤5): ${poorAvg.toFixed(2)}m`);
    }
    // Arousal vs performance
    const highArousal = sessions.filter(s => s.arousalPre >= 8);
    const modArousal  = sessions.filter(s => s.arousalPre >= 5 && s.arousalPre <= 7);
    if (highArousal.length && modArousal.length) {
      const hiAvg  = highArousal.reduce((a, s) => a + s.bestThrow, 0) / highArousal.length;
      const modAvg = modArousal.reduce((a, s)  => a + s.bestThrow, 0) / modArousal.length;
      lines.push(`Avg best throw when pre-session arousal ≥8: ${hiAvg.toFixed(2)}m vs moderate (5–7): ${modAvg.toFixed(2)}m`);
    }
  }

  // Caffeine
  const caffSessions = sessions.filter(s => s.caffeine > 0);
  if (caffSessions.length) {
    const avgCaff = Math.round(caffSessions.reduce((a, s) => a + s.caffeine, 0) / caffSessions.length);
    lines.push(`Caffeine used in ${caffSessions.length} sessions, avg ${avgCaff}mg`);
  }

  // Pain
  const painSessions = sessions.filter(s => s.painLevel >= 3);
  if (painSessions.length) {
    const locations = [...new Set(painSessions.map(s => s.painLocation).filter(Boolean))];
    lines.push(`Pain reported (≥3/10) in ${painSessions.length} sessions. Locations: ${locations.join(', ') || 'unspecified'}`);
    const avgPain = painSessions.reduce((a, s) => a + s.painLevel, 0) / painSessions.length;
    lines.push(`Average pain level when present: ${avgPain.toFixed(1)}/10`);
  }

  // Session types
  const sessionTypes = {};
  sessions.forEach(s => { sessionTypes[s.sessionType] = (sessionTypes[s.sessionType] || 0) + 1; });
  lines.push(`Session types: ${Object.entries(sessionTypes).map(([k, v]) => k + ': ' + v).join(', ')}`);

  // Lifting
  const liftSessions = sessions.filter(s => s.lifts && s.lifts.length > 0);
  if (liftSessions.length) {
    const liftNames = {};
    liftSessions.forEach(s => s.lifts.forEach(l => {
      liftNames[l.exercise] = (liftNames[l.exercise] || 0) + 1;
    }));
    const topLifts = Object.entries(liftNames)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k} (${v}×)`)
      .join(', ');
    lines.push(`Most frequent lifts: ${topLifts}`);

    // Find heavy lift sessions and correlate with throw performance
    const heavyDays = liftSessions.filter(s =>
      s.lifts.some(l => l.exercise.toLowerCase().includes('clean') || l.exercise.toLowerCase().includes('squat'))
      && parseInt(s.lifts.find(l => l.weight)?.weight || '0') >= 200
    );
    if (heavyDays.length) {
      const heavyAvg = heavyDays.reduce((a, s) => a + s.bestThrow, 0) / heavyDays.length;
      lines.push(`Avg best throw on heavy lift days (≥200lb clean/squat): ${heavyAvg.toFixed(2)}m`);
    }
  }

  // Technique feel vs performance
  const goodTech = sessions.filter(s => s.techniqueFeel >= 4);
  const poorTech = sessions.filter(s => s.techniqueFeel && s.techniqueFeel <= 2);
  if (goodTech.length && poorTech.length) {
    const goodAvg = goodTech.reduce((a, s) => a + s.bestThrow, 0) / goodTech.length;
    const poorAvg = poorTech.reduce((a, s) => a + s.bestThrow, 0) / poorTech.length;
    lines.push(`Avg best throw when technique felt sharp/locked: ${goodAvg.toFixed(2)}m vs poor tech feel: ${poorAvg.toFixed(2)}m`);
  }

  // Recent notes
  sessions.slice(0, 5).forEach(s => {
    if (s.notes) lines.push(`Session note (${s.date}): "${s.notes.substring(0, 120)}"`);
  });

  return lines.join('\n');
}
