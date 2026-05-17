const { groqChat } = require("./groqClient");
const InterviewSession = require("../models/InterviewSession");

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCandidateContext(candidate) {
  const edu = candidate.resumeData?.education?.[0];
  const eduStr = edu
    ? `${edu.degree || ""} at ${edu.institution || ""} (${edu.graduationYear || ""})`
    : "Not available";

  const exp = candidate.resumeData?.experience || [];
  const expStr = exp.length
    ? exp.slice(0, 2).map(e => `${e.role || ""} at ${e.company || ""}`).join("; ")
    : "No internship/work experience";

  const domains = (candidate.topDomains || []).slice(0, 3).map(d => d.domain).join(", ") || "general software";
  const skills  = (candidate.normalizedSkills || []).slice(0, 20).join(", ") || "not listed";

  return { eduStr, expStr, domains, skills };
}

function buildSystemPrompt(candidate, jd, matchedSkills, missingSkills, totalTurns) {
  const { eduStr, expStr, domains, skills } = buildCandidateContext(candidate);

  return `You are a senior technical interviewer conducting a structured campus placement interview.

CANDIDATE PROFILE:
- Name: ${candidate.name || "the candidate"}
- Top domains: ${domains}
- Skills: ${skills}
- Education: ${eduStr}
- Experience: ${expStr}
- Matches job requirements: ${matchedSkills.join(", ") || "none identified"}
- Skill gaps vs job: ${missingSkills.join(", ") || "none identified"}

JOB DESCRIPTION (excerpt):
${jd.slice(0, 1200)}

INTERVIEW PLAN — conduct exactly ${totalTurns} scored question slots:
- 3 technical questions (from matched skills or JD tech stack)
- 1–2 DSA questions (only if the role is backend/systems/algorithms heavy)
- 2 behavioral questions (tied to candidate experience or projects)
- 1 domain-fit question (their strongest domain vs this role)
- You may insert one follow-up within a slot if the answer scores < 6 (does NOT consume a new slot)

DSA QUESTIONS: ask the candidate to explain their approach or write pseudocode. Evaluate logic, not syntax.
DIFFICULTY ADAPTATION: if rolling avg score >= 8, increase next difficulty by 1; if <= 4, ease slightly.
TONE: Professional. Specific. Questions like "tell me about yourself" are banned.

RESPONSE FORMAT — always return ONLY valid JSON, no markdown fences, no extra text:

For every turn except the last answered one:
{
  "evaluation": { "score": 0-10, "feedback": "...", "correctness": 0-10, "clarity": 0-10, "optimization": 0-10, "edge_cases": 0-10 } or null for first question,
  "next_question": { "question": "...", "category": "technical|dsa|behavioral|domain-fit|followup", "difficulty": 1-5, "is_followup": false },
  "interview_complete": false
}

When the final answer is received:
{
  "evaluation": { "score": 0-10, "feedback": "...", "correctness": 0-10, "clarity": 0-10, "optimization": 0-10, "edge_cases": 0-10 },
  "next_question": null,
  "interview_complete": true
}`;
}

function buildContextMessages(turns, windowSize = 3) {
  return turns.slice(-windowSize).flatMap(t => {
    const msgs = [];
    if (t.question) msgs.push({ role: "assistant", content: t.question });
    if (t.answer)   msgs.push({ role: "user",      content: `[Answer]: ${t.answer}` });
    return msgs;
  });
}

function parseGroqJson(raw) {
  const clean = raw.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse Groq JSON response");
  }
}

function updateAvgScore(session, newScore) {
  const answered = session.turns.filter(t => t.evaluation?.score != null).length;
  if (answered === 0) return newScore;
  return Math.round(((session.avgScore * answered + newScore) / (answered + 1)) * 10) / 10;
}

// ── Start Interview ───────────────────────────────────────────────────────────

async function startInterview(initiatorId, candidate, jd, matchedSkills = [], missingSkills = [], totalTurns = 8) {
  const systemPrompt = buildSystemPrompt(candidate, jd, matchedSkills, missingSkills, totalTurns);

  const raw = await groqChat([
    { role: "system", content: systemPrompt },
    { role: "user",   content: "Begin the interview. Generate the first question only. Set evaluation to null." },
  ], { model: GROQ_MODEL, temperature: 0.5, maxTokens: 600 });

  const parsed = parseGroqJson(raw);
  if (!parsed.next_question?.question) throw new Error("Groq did not return an opening question");

  const firstTurn = {
    questionNumber: 1,
    category:       parsed.next_question.category || "technical",
    difficulty:     parsed.next_question.difficulty || 3,
    question:       parsed.next_question.question,
    answer:         null,
    isFollowup:     false,
    evaluation:     null,
  };

  const session = await InterviewSession.create({
    initiatorId,
    candidateId:      candidate._id,
    jobDescription:   jd,
    matchedSkills,
    missingSkills,
    turns:            [firstTurn],
    currentTurnIndex: 0,
    totalTurns,
    avgScore:         0,
    status:           "active",
  });

  return {
    sessionId:      session._id,
    questionNumber: 1,
    totalQuestions: totalTurns,
    question:       firstTurn.question,
    category:       firstTurn.category,
    difficulty:     firstTurn.difficulty,
    isFollowup:     false,
  };
}

// ── Submit Answer ─────────────────────────────────────────────────────────────

async function submitAnswer(sessionId, initiatorId, answer) {
  const session = await InterviewSession.findById(sessionId);
  if (!session)                     throw Object.assign(new Error("Session not found"), { status: 404 });
  if (session.status !== "active")  throw Object.assign(new Error("Interview already completed"), { status: 400 });
  if (session.initiatorId.toString() !== initiatorId.toString()) {
    throw Object.assign(new Error("Unauthorized"), { status: 403 });
  }

  const currentTurn = session.turns[session.currentTurnIndex];
  if (!currentTurn) throw new Error("Invalid session state");

  currentTurn.answer = answer.trim();
  const isLastQuestion = session.currentTurnIndex + 1 >= session.totalTurns;

  // Rebuild system prompt with a minimal candidate object (full profile not stored in session)
  const systemPrompt = buildSystemPrompt(
    { name: "", normalizedSkills: [], topDomains: [], resumeData: null },
    session.jobDescription,
    session.matchedSkills,
    session.missingSkills,
    session.totalTurns,
  );

  const contextMessages = buildContextMessages(session.turns.slice(0, session.currentTurnIndex), 3);
  contextMessages.push({ role: "assistant", content: currentTurn.question });
  contextMessages.push({
    role: "user",
    content: isLastQuestion
      ? `[Final answer]: ${answer}\n\nThis was question ${session.totalTurns} of ${session.totalTurns}. Evaluate and set interview_complete to true, next_question to null.`
      : `[Answer]: ${answer}\n\nCurrent rolling avg score: ${session.avgScore}. Questions remaining after this: ${session.totalTurns - session.currentTurnIndex - 1}.${answer.trim().length < 20 ? " Very short answer — consider a targeted follow-up." : ""}`,
  });

  const raw = await groqChat(
    [{ role: "system", content: systemPrompt }, ...contextMessages],
    { model: GROQ_MODEL, temperature: 0.4, maxTokens: 900 },
  );

  const parsed = parseGroqJson(raw);

  if (parsed.evaluation) {
    currentTurn.evaluation = {
      score:        parsed.evaluation.score        ?? 5,
      feedback:     parsed.evaluation.feedback     ?? "",
      correctness:  parsed.evaluation.correctness  ?? parsed.evaluation.score ?? 5,
      clarity:      parsed.evaluation.clarity      ?? parsed.evaluation.score ?? 5,
      optimization: parsed.evaluation.optimization ?? 0,
      edgeCases:    parsed.evaluation.edge_cases   ?? parsed.evaluation.edgeCases ?? 0,
    };
    session.avgScore = updateAvgScore(session, currentTurn.evaluation.score);
  }

  if (parsed.interview_complete || isLastQuestion) {
    session.status = "completed";
    session.markModified("turns");
    await session.save();

    const report = await generateFinalReport(session);
    session.finalReport = report;
    session.markModified("finalReport");
    await session.save();

    return {
      turnComplete:  true,
      evaluation:    currentTurn.evaluation,
      interviewDone: true,
      finalReport:   report,
    };
  }

  if (!parsed.next_question?.question) throw new Error("Groq did not return a next question");

  const nextTurn = {
    questionNumber: session.turns.length + 1,
    category:       parsed.next_question.category   || "technical",
    difficulty:     parsed.next_question.difficulty || 3,
    question:       parsed.next_question.question,
    answer:         null,
    isFollowup:     parsed.next_question.is_followup || false,
    evaluation:     null,
  };

  session.turns.push(nextTurn);
  session.currentTurnIndex += 1;
  session.markModified("turns");
  await session.save();

  return {
    turnComplete:   true,
    evaluation:     currentTurn.evaluation,
    interviewDone:  false,
    questionNumber: nextTurn.questionNumber,
    totalQuestions: session.totalTurns,
    question:       nextTurn.question,
    category:       nextTurn.category,
    difficulty:     nextTurn.difficulty,
    isFollowup:     nextTurn.isFollowup,
    questionsLeft:  session.totalTurns - session.currentTurnIndex,
  };
}

// ── Final Report ──────────────────────────────────────────────────────────────

async function generateFinalReport(session) {
  const completedTurns = session.turns.filter(t => t.evaluation?.score != null);

  const turnSummary = completedTurns.map(t =>
    `Q${t.questionNumber} [${t.category}] difficulty=${t.difficulty}: "${t.question}"\n` +
    `  Answer: ${(t.answer || "").slice(0, 250)}\n` +
    `  Score: ${t.evaluation.score}/10 — ${t.evaluation.feedback}`,
  ).join("\n\n");

  const byCategory = {};
  for (const t of completedTurns) {
    const cat = t.category === "followup" ? "technical" : t.category;
    (byCategory[cat] = byCategory[cat] || []).push(t.evaluation.score);
  }
  const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10 : null;

  const raw = await groqChat([
    { role: "system", content: "You are a senior technical interviewer writing a structured post-interview assessment. Return ONLY valid JSON, no markdown." },
    {
      role: "user",
      content: `Generate a final assessment report for this campus interview.

TRANSCRIPT SUMMARY:
${turnSummary}

CATEGORY AVERAGES:
${Object.entries(byCategory).map(([c, s]) => `  ${c}: ${avg(s)}/10`).join("\n")}
Overall avg: ${session.avgScore}/10

Return this exact JSON:
{
  "overallScore": 0-100,
  "grade": "A|B|C|D|F",
  "strengths": ["3 specific strengths observed in the interview"],
  "weaknesses": ["2-3 specific areas to improve with examples from interview"],
  "recommendation": "One paragraph hiring recommendation for this role",
  "categoryScores": { "technical": 0-100, "dsa": 0-100, "behavioral": 0-100, "domainFit": 0-100 }
}`,
    },
  ], { model: GROQ_MODEL, temperature: 0.3, maxTokens: 900 });

  try {
    const report = parseGroqJson(raw);
    if (!report.overallScore || report.overallScore > 100) {
      report.overallScore = Math.round(session.avgScore * 10);
    }
    report.categoryScores = report.categoryScores || {};
    for (const [cat, scores] of Object.entries(byCategory)) {
      const key = cat === "domain-fit" ? "domainFit" : cat;
      if (!report.categoryScores[key]) report.categoryScores[key] = Math.round((avg(scores) ?? 5) * 10);
    }
    return report;
  } catch {
    return {
      overallScore:   Math.round(session.avgScore * 10),
      grade:          session.avgScore >= 8 ? "A" : session.avgScore >= 6 ? "B" : session.avgScore >= 4 ? "C" : "D",
      strengths:      ["Completed the full interview"],
      weaknesses:     ["Detailed report unavailable — review transcript"],
      recommendation: "Manual review recommended.",
      categoryScores: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k === "domain-fit" ? "domainFit" : k, Math.round((avg(v) ?? 5) * 10)]),
      ),
    };
  }
}

// ── Abandon / Get / List ──────────────────────────────────────────────────────

async function abandonSession(sessionId, initiatorId) {
  const session = await InterviewSession.findById(sessionId);
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });
  if (session.initiatorId.toString() !== initiatorId.toString()) throw Object.assign(new Error("Unauthorized"), { status: 403 });
  if (session.status === "completed") throw Object.assign(new Error("Session already completed"), { status: 400 });
  session.status = "abandoned";
  await session.save();
  return { abandoned: true };
}

async function getSession(sessionId, userId) {
  const session = await InterviewSession.findById(sessionId)
    .populate("candidateId", "name githubUsername")
    .lean();
  if (!session) throw Object.assign(new Error("Session not found"), { status: 404 });
  const isParty = session.initiatorId.toString() === userId.toString()
    || session.candidateId._id.toString() === userId.toString();
  if (!isParty) throw Object.assign(new Error("Unauthorized"), { status: 403 });
  return session;
}

async function listSessions(userId) {
  return InterviewSession.find(
    { $or: [{ initiatorId: userId }, { candidateId: userId }] },
    { jobDescription: { $substr: ["$jobDescription", 0, 120] }, status: 1, avgScore: 1, totalTurns: 1, currentTurnIndex: 1, finalReport: 1, candidateId: 1, createdAt: 1 },
  )
    .populate("candidateId", "name githubUsername")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}

// ── Evaluate (legacy batch mode) ─────────────────────────────────────────────

async function evaluateInterview(questions, answers) {
  const systemPrompt = `You are a strict but fair senior technical interviewer evaluating a candidate's mock interview.
Always return valid JSON — no markdown fences, no extra text outside the JSON.`;

  const qnaList = questions.map((q, idx) => `
Q${idx + 1} (${q.category || "general"}): ${typeof q === "string" ? q : q.question}
Answer: ${answers[idx] || "No answer provided"}
`).join("\n");

  const userPrompt = `
Evaluate the following interview responses.

${qnaList}

Provide scores out of 100 for:
1. DSA/Technical correctness (dsaScore)
2. Communication and clarity (communicationScore)
3. Overall impression (overallScore)

Also provide specific feedback for each question and an overall feedback summary.

Return ONLY this JSON structure:
{
  "overallScore": 85,
  "dsaScore": 80,
  "communicationScore": 90,
  "feedback": "Overall feedback summary here.",
  "history": [
    {
      "question": "Question text",
      "answer": "Candidate's answer",
      "score": 85,
      "feedback": "Specific feedback for this answer"
    }
  ]
}`;

  const raw = await groqChat([
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ], { temperature: 0.2, maxTokens: 1500 });

  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      overallScore: 0,
      dsaScore: 0,
      communicationScore: 0,
      feedback: "Failed to parse AI evaluation. " + raw.slice(0, 200),
      history: [],
    };
  }
}

module.exports = { startInterview, submitAnswer, getSession, listSessions, abandonSession, evaluateInterview };
