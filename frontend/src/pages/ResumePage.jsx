import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { resumeApi, userApi } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  UploadSimple, FileText, CheckCircle, ArrowDown,
  Sparkle, ArrowRight, FileArrowDown,
} from "@phosphor-icons/react";

export default function ResumePage() {
  const { user } = useAuth();
  const fileRef  = useRef(null);

  const [profile,     setProfile]     = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadDone,  setUploadDone]  = useState(false);
  const [uploadErr,   setUploadErr]   = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    userApi.profile().then(setProfile).catch(() => {});
  }, []);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true); setUploadErr(""); setUploadDone(false);
    try {
      await resumeApi.upload(file);
      setUploadedFile(file.name);
      setUploadDone(true);
      // refresh profile to update resumeUploaded flag
      const p = await userApi.profile();
      setProfile(p);
    } catch (err) {
      setUploadErr(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!profile?.githubUsername) return;
    setDownloading(true);
    try {
      await resumeApi.download(profile.githubUsername);
    } catch {
      setUploadErr("No resume on file to download.");
    } finally {
      setDownloading(false);
    }
  }

  const hasResume = uploadDone || !!profile?.resumeUrl || !!profile?.resumeUploaded;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Your Resume</h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            Upload your resume once — AI analysis runs per job when you apply
          </p>
        </motion.div>

        {/* Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 mb-4"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleUpload(f);
            }}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all group
              ${uploading
                ? "border-zinc-700 bg-zinc-900/20"
                : "border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02]"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                <p className="text-sm text-zinc-400">Uploading…</p>
              </div>
            ) : uploadDone ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle size={36} weight="fill" className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{uploadedFile}</p>
                  <p className="text-xs text-emerald-400 mt-1">Uploaded successfully</p>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Click to replace</p>
              </div>
            ) : hasResume ? (
              <div className="flex flex-col items-center gap-3">
                <FileText size={36} weight="duotone" className="text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">Resume on file</p>
                  <p className="text-xs text-zinc-500 mt-1">Click to upload a new version</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/60 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                  <UploadSimple size={22} weight="bold" className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    Drop your resume here
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">PDF or DOCX · max 10 MB</p>
                </div>
              </div>
            )}
          </div>

          {uploadErr && (
            <p className="text-xs text-rose-400 mt-3 text-center">{uploadErr}</p>
          )}

          {/* Download */}
          {hasResume && profile?.githubUsername && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-800/60 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 text-sm text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-50"
            >
              <FileArrowDown size={15} weight="duotone" />
              {downloading ? "Downloading…" : "Download current resume"}
            </button>
          )}
        </motion.div>

        {/* AI Analysis callout */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0 mt-0.5">
              <Sparkle size={14} weight="bold" className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200">AI Analysis runs per job</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Go to a specific job or campus drive and click{" "}
                <span className="text-cyan-400 font-medium">Analyze Fit</span> to get AI-powered
                gap analysis, skill match score, and improvement suggestions tailored to that JD.
              </p>
              <Link
                to="/jobs"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                Browse jobs & drives <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Format tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="mt-6 rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-4"
        >
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">Resume tips for best AI analysis</p>
          <ul className="space-y-1.5">
            {[
              "Use clear section headers (Experience, Skills, Education, Projects)",
              "List technologies explicitly — e.g. React, Node.js, PostgreSQL",
              "Include GitHub links and project descriptions",
              "PDF format gives the most reliable text extraction",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-zinc-700 shrink-0 mt-1.5" />
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>

      </div>
    </div>
  );
}
