const { groqChat } = require("./groqClient");

/**
 * Generate tailored interview questions for a candidate × job description pair.
 *
 * @param {Object} candidate  - Lean User document (skills, topDomains, education, experience, etc.)
 * @param {string} jobDescription
 * @param {string[]} matchedSkills  - From whyMatched
 * @param {string[]} missingSkills  - From whyMatched
 * @returns {Promise<{ questions: Array<{ category: string, question: string, rationale: string }> }>}
 */
async function generateInterviewQuestions(candidate, jobDescription, matchedSkills = [], missingSkills = []) {
  const name        = candidate.name || "the candidate";
  const topDomains  = (candidate.topDomains || []).slice(0, 3).map(d => d.domain).join(", ") || "general software";
  const skillsList  = (candidate.normalizedSkills || []).slice(0, 20).join(", ") || "not specified";
  const eduSummary  = _buildEduSummary(candidate);
  const expSummary  = _buildExpSummary(candidate);

  const systemPrompt = `You are a senior technical interviewer at a top tech company helping campus recruiters \
conduct structured, fair interviews. Your questions are specific, not generic. \
Always return valid JSON — no markdown fences, no extra text outside the JSON.`;

  const userPrompt = `
Generate 7 interview questions for this campus candidate applying to the role described below.

CANDIDATE PROFILE:
- Name: ${name}
- Top domains: ${topDomains}
- Skills (known): ${skillsList}
- Education: ${eduSummary}
- Experience: ${expSummary}
- Skills that MATCH the job: ${matchedSkills.join(", ") || "none identified"}
- Skills the candidate LACKS vs the job: ${missingSkills.join(", ") || "none identified"}

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

INSTRUCTIONS:
- 2 questions on matched strengths (go deep — avoid softball questions)
- 2 questions on skill gaps (probe adaptability, not just absence)
- 2 behavioral questions tied to actual experience listed
- 1 domain-fit question about their biggest domain vs this role's domain

Return ONLY this JSON structure:
{
  "questions": [
    {
      "category": "strength | gap | behavioral | domain-fit",
      "question": "The actual interview question",
      "rationale": "One sentence on why this question matters for this specific candidate"
    }
  ]
}`;

  const raw = await groqChat([
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ], { temperature: 0.5, maxTokens: 1200 });

  return _parseQuestions(raw);
}

function _buildEduSummary(candidate) {
  const edu = candidate.resumeData?.education;
  if (!edu || !edu.length) return "Not available from resume";
  const e = edu[0];
  const parts = [];
  if (e.degree) parts.push(e.degree);
  if (e.institution) parts.push(`at ${e.institution}`);
  if (e.graduationYear) parts.push(`(${e.graduationYear})`);
  if (e.cgpa) parts.push(`CGPA ${e.cgpa}`);
  return parts.join(" ") || "Not available";
}

function _buildExpSummary(candidate) {
  const exp = candidate.resumeData?.experience;
  if (!exp || !exp.length) return "No internship/work experience on record";
  return exp.slice(0, 2).map(e => {
    const parts = [];
    if (e.role) parts.push(e.role);
    if (e.company) parts.push(`at ${e.company}`);
    if (e.startDate) parts.push(`(${e.startDate}${e.endDate ? ` – ${e.endDate}` : ""})`);
    return parts.join(" ");
  }).join("; ");
}

function _parseQuestions(raw) {
  try {
    // Strip markdown fences if model ignored instructions
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed  = JSON.parse(cleaned);
    if (Array.isArray(parsed.questions)) return { questions: parsed.questions };
    throw new Error("Unexpected shape");
  } catch {
    // Best-effort: return raw as a single question so the endpoint never hard-fails
    return {
      questions: [{ category: "general", question: raw.slice(0, 500), rationale: "Auto-generated" }],
    };
  }
}

/**
 * Evaluate mock interview answers using Groq.
 * 
 * @param {Array<{question: string, category: string}>} questions 
 * @param {Array<string>} answers 
 * @returns {Promise<{ overallScore: number, dsaScore: number, communicationScore: number, feedback: string, history: Array<{question: string, answer: string, score: number, feedback: string}> }>}
 */
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

  return _parseEvaluation(raw);
}

function _parseEvaluation(raw) {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      overallScore: 0,
      dsaScore: 0,
      communicationScore: 0,
      feedback: "Failed to parse AI evaluation. " + raw.slice(0, 200),
      history: []
    };
  }
}

module.exports = { generateInterviewQuestions, evaluateInterview };
