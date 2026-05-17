const BASE = "";

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
    throw Object.assign(new Error(body.message || "Request failed"), { status: res.status });
  }

  return res.json();
}

export const profileApi = {
  get: (githubUsername) => apiFetch(`/users/${githubUsername}/profile`),
};

export const resumeApi = {
  download: async (githubUsername) => {
    const res = await fetch(`/resume/download/${githubUsername}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Resume not available");
    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") || "";
    const match = contentDisposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `${githubUsername}_resume.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const searchApi = {
  /**
   * @param {{ domains?:string[], skills?:string[], years?:number[], branches?:string[], activity?:string, limit?:number }} filters
   */
  search: ({ domains = [], skills = [], years = [], branches = [], activity = null, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (domains.length)  params.set("domains",  domains.join(","));
    if (skills.length)   params.set("skills",   skills.join(","));
    if (years.length)    params.set("year",      years.join(","));
    if (branches.length) params.set("branch",    branches.join(","));
    if (activity)        params.set("activity",  activity);
    params.set("limit", String(limit));
    return apiFetch(`/search/users?${params.toString()}`);
  },
};

export const authApi = {
  login: (email, password) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};
