import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { interviewApi, userApi } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  Microphone, MicrophoneSlash, PaperPlaneTilt, Stop,
  CheckCircle, Trophy, ArrowLeft, Robot, SignOut,
} from "@phosphor-icons/react";

const CATEGORY_COLORS = {
  technical: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  dsa: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  behavioral: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  "domain-fit": "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  followup: "text-zinc-400 border-zinc-700 bg-zinc-800/40",
};

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS.followup;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${cls}`}>
      {category}
    </span>
  );
}

function ScoreBar({ label, score, max = 10 }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-28 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-500" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-8 text-right tabular-nums font-mono">{score}/{max}</span>
    </div>
  );
}

// ── Setup screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [jd, setJd]             = useState("");
  const [questions, setQ]       = useState(8);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const { user }                = useAuth();

  async function start() {
    if (!jd.trim() || jd.trim().length < 20) { setError("Job description must be at least 20 characters"); return; }
    setError(""); setLoading(true);
    try {
      await onStart({ jd: jd.trim(), totalQuestions: questions, candidateId: user?.id });
    } catch (err) {
      setError(err.message || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8 text-center">
        <Robot size={36} className="text-emerald-400 mx-auto mb-3" weight="duotone" />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">AI Mock Interview</h1>
        <p className="text-sm text-zinc-500 mt-1">Adaptive questions, DSA evaluation, and instant feedback</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-medium">Job Description</label>
          <textarea
            rows={5}
            value={jd}
            onChange={e => { setJd(e.target.value); setError(""); }}
            placeholder="Paste the job description here. The AI will tailor questions to the role and your GitHub profile..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-medium">Number of questions: <span className="text-emerald-400">{questions}</span></label>
          <input
            type="range" min={4} max={15} value={questions}
            onChange={e => setQ(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>4 (quick)</span><span>15 (thorough)</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={start}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Microphone size={16} weight="duotone" />
          {loading ? "Starting interview…" : "Begin Interview"}
        </button>
      </div>
    </div>
  );
}

// ── Report screen ─────────────────────────────────────────────────────────────
function ReportScreen({ report, onRestart }) {
  const grade = report?.grade || "B";
  const gradeColor = { A: "text-emerald-400", B: "text-sky-400", C: "text-amber-400", D: "text-rose-400", F: "text-rose-600" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="text-center mb-8">
        <Trophy size={36} className="text-amber-400 mx-auto mb-3" weight="duotone" />
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Interview Complete</h2>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className={`text-5xl font-bold tabular-nums ${gradeColor[grade] || "text-zinc-400"}`}>{grade}</span>
          <span className="text-3xl font-semibold text-zinc-300">{report?.overallScore ?? "—"}<span className="text-lg text-zinc-600">/100</span></span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Category scores */}
        <section>
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Category breakdown</h3>
          <div className="space-y-2.5">
            {Object.entries(report?.categoryScores || {}).map(([k, v]) => (
              <ScoreBar key={k} label={k.replace(/([A-Z])/g, " $1")} score={v} max={100} />
            ))}
          </div>
        </section>

        {/* Strengths */}
        {report?.strengths?.length > 0 && (
          <section>
            <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Strengths</h3>
            <ul className="space-y-1.5">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-400">
                  <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Weaknesses */}
        {report?.weaknesses?.length > 0 && (
          <section>
            <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Areas to improve</h3>
            <ul className="space-y-1.5">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-zinc-500 pl-4 border-l-2 border-zinc-800">{w}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Recommendation */}
        {report?.recommendation && (
          <section className="border border-zinc-800/60 rounded-xl px-4 py-3 bg-zinc-900/30">
            <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">Hiring Recommendation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{report.recommendation}</p>
          </section>
        )}

        <button
          onClick={onRestart}
          className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm py-2.5 rounded-xl transition-colors"
        >
          Start another interview
        </button>
      </div>
    </motion.div>
  );
}

// ── Main interview screen ─────────────────────────────────────────────────────
export default function MockInterviewPage() {
  const { user }  = useAuth();
  const [phase, setPhase]       = useState("setup"); // setup | interview | report
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);   // { question, category, difficulty, questionNumber, totalQuestions }
  const [evaluation, setEval]   = useState(null);
  const [report, setReport]     = useState(null);
  const [answer, setAnswer]     = useState("");
  const [submitting, setSubmit] = useState(false);
  const [ending, setEnding]     = useState(false);
  const [error, setError]       = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const textareaRef = useRef(null);

  const {
    transcript, listening, resetTranscript, browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Sync voice transcript into answer
  useEffect(() => {
    if (transcript) setAnswer(transcript);
  }, [transcript]);

  // Text-to-speech for question
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  }

  async function handleStart({ jd, totalQuestions, candidateId }) {
    const result = await interviewApi.start({
      candidateId: candidateId || user?.id,
      jobDescription: jd,
      totalQuestions,
    });
    setSessionId(result.sessionId);
    setQuestion(result);
    setPhase("interview");
    if (voiceMode) speak(result.question);
  } catch (err) {
    if (err.status === 401) {
      setError("Your session expired. Please log in again.");
    } else {
      setError(err.message || "Failed to start interview");
    }
  }

  async function handleSubmit() {
    if (!answer.trim()) return;
    setSubmit(true); setError("");
    try {
      const result = await interviewApi.answer(sessionId, answer.trim());
      setEval(result.evaluation);
      resetTranscript();
      setAnswer("");

      if (result.interviewDone) {
        setReport(result.finalReport);
        setPhase("report");
        window.speechSynthesis?.cancel();
      } else {
        setQuestion(result);
        if (voiceMode) speak(result.question);
      }
    } catch (err) {
      // Handle token expiry during interview - don't auto-redirect
      if (err.status === 401) {
        setError("Your session expired. Please log in again and restart the interview.");
      } else {
        setError(err.message || "Failed to submit answer");
      }
    } finally {
      setSubmit(false);
    }
  }

  async function handleEndInterview() {
    if (!sessionId) return;
    setEnding(true);
    try {
      await interviewApi.abandon(sessionId);
    } catch { /* ignore errors — session may already be done */ }
    window.speechSynthesis?.cancel();
    SpeechRecognition.stopListening();
    setPhase("setup");
    setReport(null);
    setEval(null);
    setQuestion(null);
    setSessionId(null);
    setAnswer("");
    setError("");
    setEnding(false);
  }

  function toggleMic() {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
    }
  }

  const progress = question ? Math.round(((question.questionNumber - 1) / question.totalQuestions) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {phase === "setup" && <SetupScreen onStart={handleStart} />}

      {phase === "interview" && question && (
        <div>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Question {question.questionNumber} of {question.totalQuestions}</span>
              <div className="flex items-center gap-2">
                <CategoryBadge category={question.category} />
                <button
                  onClick={handleEndInterview}
                  disabled={ending || submitting}
                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] transition-colors disabled:opacity-40"
                >
                  <SignOut size={10} weight="bold" />
                  {ending ? "Ending…" : "End Interview"}
                </button>
              </div>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Question */}
          <motion.div
            key={question.questionNumber}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/30"
          >
            <div className="flex items-start gap-3">
              <Robot size={18} className="text-emerald-400 mt-0.5 shrink-0" weight="duotone" />
              <p className="text-sm text-zinc-200 leading-relaxed">{question.question}</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {question.isFollowup && (
                <span className="text-[10px] text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5">follow-up</span>
              )}
              <span className="text-[10px] text-zinc-600">Difficulty {question.difficulty}/5</span>
            </div>
          </motion.div>

          {/* Previous evaluation */}
          <AnimatePresence>
            {evaluation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 rounded-xl border border-zinc-800/40 bg-zinc-900/20 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Previous answer scored</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    evaluation.score >= 7 ? "text-emerald-400" : evaluation.score >= 4 ? "text-amber-400" : "text-rose-400"
                  }`}>{evaluation.score}/10</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">{evaluation.feedback}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer input */}
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              rows={5}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={
                question.category === "dsa"
                  ? "Explain your approach, write pseudocode, or walk through a dry run…"
                  : "Type your answer here…"
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors resize-none"
            />

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex gap-2">
              {browserSupportsSpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    listening
                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                      : "border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {listening ? <MicrophoneSlash size={15} /> : <Microphone size={15} />}
                  {listening ? "Stop" : "Voice"}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !answer.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors active:scale-[0.98]"
              >
                <PaperPlaneTilt size={15} weight="fill" />
                {submitting ? "Evaluating…" : "Submit answer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "report" && (
        <ReportScreen report={report} onRestart={() => { setPhase("setup"); setReport(null); setEval(null); setQuestion(null); }} />
      )}
    </div>
  );
}
