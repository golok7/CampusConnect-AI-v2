const BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
  return localStorage.getItem("cc_token") || "";
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    
    // Auto-logout if token is rejected (e.g. invalid, malformed, or expired)
    if (res.status === 401) {
      localStorage.removeItem("cc_token");
      // Force reload to let AuthContext sync state and redirect to login
      window.location.href = "/";
    }

    throw Object.assign(new Error(body.message || "Request failed"), { status: res.status });
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email, password) =>
    apiFetch("/auth/login",    { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name, email, password, role) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, role }) }),
};

// ── User ──────────────────────────────────────────────────────────────────────
export const userApi = {
  profile:           () => apiFetch("/user/profile"),
  update:            (data) => apiFetch("/user/update",    { method: "PUT",  body: JSON.stringify(data) }),
  updateInterests:   (interests) => apiFetch("/user/interests", { method: "PUT", body: JSON.stringify({ interests }) }),
  availableInterests:() => apiFetch("/user/interests/available"),
};

// ── Public Profile ────────────────────────────────────────────────────────────
export const profileApi = {
  get: (githubUsername) => apiFetch(`/users/${githubUsername}/profile`),
};

// ── GitHub ────────────────────────────────────────────────────────────────────
export const githubApi = {
  fetch:     (username) => apiFetch("/github/fetch",      { method: "POST", body: JSON.stringify({ username }) }),
  rateLimit: ()         => apiFetch("/github/rate-limit"),
};

// ── Resume ────────────────────────────────────────────────────────────────────
export const resumeApi = {
  upload: async (file) => {
    const form = new FormData();
    form.append("resume", file);
    const res = await fetch(`${BASE}/resume/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || "Upload failed"); }
    return res.json();
  },
  improve: (jobDescription) =>
    apiFetch("/resume/improve", { method: "POST", body: JSON.stringify({ jobDescription }) }),
  download: async (githubUsername) => {
    const res = await fetch(`${BASE}/resume/download/${githubUsername}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Resume not available");
    const blob = await res.blob();
    const cd   = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `${githubUsername}_resume.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  unified: (payload) =>
    apiFetch("/search", { method: "POST", body: JSON.stringify(payload) }),
  semantic: (query) =>
    apiFetch("/search/semantic", { method: "POST", body: JSON.stringify({ query }) }),
  users: (params = {}) => {
    const q = new URLSearchParams();
    if (params.domains?.length)  q.set("domains",  params.domains.join(","));
    if (params.skills?.length)   q.set("skills",   params.skills.join(","));
    if (params.years?.length)    q.set("year",      params.years.join(","));
    if (params.branches?.length) q.set("branch",    params.branches.join(","));
    if (params.activity)         q.set("activity",  params.activity);
    q.set("limit", String(params.limit || 50));
    return apiFetch(`/search/users?${q.toString()}`);
  },
  // alias used by ExplorePage
  search: (params = {}) => {
    const q = new URLSearchParams();
    if (params.domains?.length)  q.set("domains",  params.domains.join(","));
    if (params.skills?.length)   q.set("skills",   params.skills.join(","));
    if (params.years?.length)    q.set("year",      params.years.join(","));
    if (params.branches?.length) q.set("branch",    params.branches.join(","));
    if (params.activity)         q.set("activity",  params.activity);
    q.set("limit", String(params.limit || 50));
    return apiFetch(`/search/users?${q.toString()}`);
  },
};

// ── Recommendations ───────────────────────────────────────────────────────────
export const recommendApi = {
  users:        () => apiFetch("/recommend/users"),
  jobs:         () => apiFetch("/recommend/jobs"),
  internships:  () => apiFetch("/recommend/internships"),
  candidates:   (driveId) => apiFetch(`/recommend/candidates/${driveId}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:            ()     => apiFetch("/jobs"),
  recommendations: ()     => apiFetch("/jobs/recommendations"),
  get:             (id)   => apiFetch(`/jobs/${id}`),
  create:          (data) => apiFetch("/jobs",      { method: "POST",  body: JSON.stringify(data) }),
  update:          (id, data) => apiFetch(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Drives ────────────────────────────────────────────────────────────────────
export const drivesApi = {
  list:       ()       => apiFetch("/drives"),
  listActive: ()       => apiFetch("/drives/student/active"),
  get:        (id)     => apiFetch(`/drives/${id}`),
  apply:      (id)     => apiFetch(`/drives/${id}/apply`, { method: "POST" }),
  analyze:    (jd)     => apiFetch("/resume/improve", { method: "POST", body: JSON.stringify({ jobDescription: jd }) }),
  create:     (data)   => apiFetch("/drives",        { method: "POST",  body: JSON.stringify(data) }),
  update:     (id, d)  => apiFetch(`/drives/${id}`,  { method: "PATCH", body: JSON.stringify(d) }),
  close:      (id)     => apiFetch(`/drives/${id}/close`, { method: "PATCH" }),
};

// ── Pipeline ──────────────────────────────────────────────────────────────────
export const pipelineApi = {
  list:   (params = {}) => {
    const q = new URLSearchParams(params);
    return apiFetch(`/pipeline?${q.toString()}`);
  },
  add:    (data)    => apiFetch("/pipeline",      { method: "POST",   body: JSON.stringify(data) }),
  update: (id, d)   => apiFetch(`/pipeline/${id}`, { method: "PATCH",  body: JSON.stringify(d) }),
  remove: (id)      => apiFetch(`/pipeline/${id}`, { method: "DELETE" }),
};

// ── Interview ─────────────────────────────────────────────────────────────────
export const interviewApi = {
  start:    (data)      => apiFetch("/interview/session/start",              { method: "POST",  body: JSON.stringify(data) }),
  answer:   (sid, ans)  => apiFetch(`/interview/session/${sid}/answer`,      { method: "POST",  body: JSON.stringify({ answer: ans }) }),
  session:  (sid)       => apiFetch(`/interview/session/${sid}`),
  sessions: ()          => apiFetch("/interview/sessions"),
  abandon:  (sid)       => apiFetch(`/interview/session/${sid}/abandon`,     { method: "PATCH" }),
  evaluate: (data)      => apiFetch("/interview/evaluate",                   { method: "POST",  body: JSON.stringify(data) }),
  history:  ()          => apiFetch("/interview/history"),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  global:    ()   => apiFetch("/analytics/global"),
  recruiter: ()   => apiFetch("/analytics/recruiter"),
  student:   (id) => apiFetch(`/analytics/student/${id}`),
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: () => apiFetch("/leaderboard"),
};
