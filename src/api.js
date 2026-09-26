const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

let tokenGetter = null;

export function setTokenGetter(fn) {
  tokenGetter = fn;
}

export async function getToken() {
  if (!tokenGetter) {
    throw new Error("Auth0 token getter is not initialized");
  }

  return tokenGetter();
}

async function request(
  path,
  {
    method = "GET",
    body,
    auth = true,
  } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (auth) {
    if (!tokenGetter) {
      throw new Error("Not authenticated yet");
    }

    const token = await tokenGetter();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

export const api = {
  sync: (payload) =>
    request("/auth/sync", {
      method: "POST",
      body: payload,
    }),

  me: () =>
    request("/auth/me"),

  updateProfile: (payload) =>
    request("/auth/me", {
      method: "PUT",
      body: payload,
    }),

  createRequest: (payload) =>
    request("/requests", {
      method: "POST",
      body: payload,
    }),

  myRequests: () =>
    request("/requests/mine"),

  allRequests: () =>
    request("/requests"),

  updateStatus: (id, payload) =>
    request(`/requests/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),

  attachOfferLetter: (id, payload) =>
    request(`/requests/${id}/offer-letter`, {
      method: "PATCH",
      body: payload,
    }),

  deleteRequest: (id) =>
    request(`/requests/${id}`, {
      method: "DELETE",
    }),

  getFacultyList: () =>
    request("/auth/faculty"),

  attachCertificate: (id, payload) =>
    request(`/requests/${id}/certificate`, {
      method: "PATCH",
      body: payload,
    }),

  facultyRequests: () =>
    request("/requests/faculty-assigned"),

  assignFaculty: (id, payload) =>
    request(`/requests/${id}/assign-faculty`, {
      method: "PATCH",
      body: payload,
    }),

  scheduleReview: (id, payload) =>
    request(`/requests/${id}/schedule-review`, {
      method: "PATCH",
      body: payload,
    }),

  evaluateStudent: (id, payload) =>
    request(`/requests/${id}/evaluate`, {
      method: "PATCH",
      body: payload,
    }),
};