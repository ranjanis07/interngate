import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { uploadOfferLetter, uploadCertificate, toDirectDropboxUrl } from "../dropbox";
import { formatDateTime12Hour } from "../formatDate";
import StatusStepper from "../StatusStepper";
import Seal from "../Seal";
import DashboardFrame from "../DashboardFrame";
import ProfileSettings from "../ProfileSettings";

const initialForm = {
  regNo: "",
  rollNo: "",
  companyName: "",
  companyAddress: "",
  companyLink: "",
  domain: "",
  mode: "offline",
  duration: "",
  startDate: "",
  endDate: "",
};

const domainOptions = [
  "Web Development",
  "Mobile App Development",
  "Data Science",
  "Machine Learning / AI",
  "Cloud Computing",
  "Cybersecurity",
  "DevOps",
  "UI/UX Design",
  "Embedded Systems",
  "Networking",
  "Other",
];

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "profile", label: "Profile" },
];

const POLL_MS = 8000;

// Today's date in YYYY-MM-DD (local time) for min constraints
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("requests");
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadingCertId, setUploadingCertId] = useState(null);

  async function loadRequests() {
    try {
      const { requests } = await api.myRequests();
      setRequests(requests);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        regNo: prev.regNo || user.regNo || "",
        rollNo: prev.rollNo || user.rollNo || "",
      }));
    }
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "endDate" && form.startDate && value <= form.startDate) {
      alert("End date must be after the start date.");
      return;
    }
    if (name === "startDate" && form.endDate && value >= form.endDate) {
      // Reset endDate if startDate goes past it
      setForm({ ...form, startDate: value, endDate: "" });
      return;
    }
    setForm({ ...form, [name]: value });
  }

  const profileIncomplete = user && (!user.department || !user.year || !user.phone || !user.regNo || !user.rollNo);

  async function submitRequest(e) {
    e.preventDefault();
    if (profileIncomplete) {
      alert("Please complete your Reg No, Roll No, Department, Year, and Contact Number in Profile settings first.");
      setTab("profile");
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest({
        ...form,
        regNo: form.regNo || user.regNo || "",
        rollNo: form.rollNo || user.rollNo || "",
        studentName: user.name,
        department: user.department,
        year: user.year,
        contactNo: user.phone,
        adminRemarks: "",
        offerLetterUrl: null,
        offerLetterName: null,
      });
      setForm({ ...initialForm, regNo: user.regNo || "", rollNo: user.rollNo || "" });
      await loadRequests();
      alert("Request submitted. Await admin approval before contacting the company.");
    } catch (error) {
      console.error(error);
      alert("Failed to submit request: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOfferLetterUpload(requestId, file) {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setUploadingId(requestId);
    try {
      const { url, name } = await uploadOfferLetter(file, user.id);
      await api.attachOfferLetter(requestId, { offerLetterUrl: url, offerLetterName: name });
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Offer letter upload failed: " + error.message);
    } finally {
      setUploadingId(null);
    }
  }

  async function handleCertificateUpload(requestId, file, endDate) {
    if (endDate && getTodayStr() < endDate) {
      alert(`You can only upload your internship certificate on or after the internship end date (${endDate}). Your internship is still in progress.`);
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setUploadingCertId(requestId);
    try {
      const { url, name } = await uploadCertificate(file, user.id);
      await api.attachCertificate(requestId, { certificateUrl: url, certificateName: name });
      await loadRequests();
      alert("Internship Certificate uploaded successfully!");
    } catch (error) {
      console.error(error);
      alert("Certificate upload failed: " + error.message);
    } finally {
      setUploadingCertId(null);
    }
  }

  async function handleDeleteRequest(requestId) {
    if (!window.confirm("Are you sure you want to delete this internship request?")) return;
    try {
      await api.deleteRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to delete request: " + error.message);
    }
  }

  return (
    <DashboardFrame title="Student dashboard" tabs={TABS} activeTab={tab} onTabChange={setTab}>
      {tab === "profile" && <ProfileSettings role="student" />}

      {tab === "requests" && (
        <>
          <section className="section">
            <h2>New internship request</h2>
            <p className="sub">Company details for this request — your personal details are pulled from your profile.</p>

            {user && (
              <div className="profile-summary">
                <div><span>Name</span><strong>{user.name || "—"}</strong></div>
                <div><span>Reg No</span><strong>{user.regNo || "—"}</strong></div>
                <div><span>Roll No</span><strong>{user.rollNo || "—"}</strong></div>
                <div><span>Department</span><strong>{user.department || "—"}</strong></div>
                <div><span>Year</span><strong>{user.year || "—"}</strong></div>
                <div><span>Contact No</span><strong>{user.phone || "—"}</strong></div>
              </div>
            )}
            <p className="autofill-note">
              Auto-filled from your profile.{" "}
              <button type="button" className="link-btn" onClick={() => setTab("profile")}>
                Edit in Profile settings
              </button>
            </p>

            <form onSubmit={submitRequest} className="request-form">
              <h3 className="form-section-title">Student details</h3>
              <div className="form-grid">
                <input placeholder="Register Number (Reg No)" name="regNo" value={form.regNo} onChange={handleChange} required />
                <input placeholder="Roll Number (Roll No)" name="rollNo" value={form.rollNo} onChange={handleChange} required />
              </div>

              <h3 className="form-section-title">Company details</h3>
              <div className="form-grid">
                <input name="companyName" placeholder="Company Name" value={form.companyName} onChange={handleChange} required />
                <input name="companyAddress" placeholder="Company Address" value={form.companyAddress} onChange={handleChange} required />
                <input type="url" name="companyLink" placeholder="Company Website or LinkedIn URL" value={form.companyLink} onChange={handleChange} required />
              </div>

              <h3 className="form-section-title">Internship details</h3>
              <div className="form-grid">
                <select name="domain" value={form.domain} onChange={handleChange} required>
                  <option value="" disabled>Select internship domain</option>
                  {domainOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select name="mode" value={form.mode} onChange={handleChange} required>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <input name="duration" placeholder="Duration (e.g. 8 weeks)" value={form.duration} onChange={handleChange} required />

                <div className="date-row">
                  <label>
                    Start date
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      min={getTodayStr()}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate ? form.startDate : getTodayStr()}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit request"}
              </button>
            </form>
          </section>

          <section className="section">
            <h2>My requests</h2>
            {requests.length === 0 && <p className="empty-state">No requests submitted yet.</p>}
            <div className="card-grid">
              {requests.map((req) => (
                <div className="card" style={{ position: "relative", overflow: "hidden" }} key={req._id}>
                  {req.status === "confirmed" && <Seal />}

                  <div className="card-header-row">
                    <h3>{req.companyName}</h3>
                    <button
                      type="button"
                      className="delete-icon-btn"
                      title="Delete request"
                      onClick={() => handleDeleteRequest(req._id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                  <p><strong>Year:</strong> {req.year}</p>
                  <p><strong>Domain:</strong> {req.domain}</p>
                  <p><strong>Mode:</strong> {req.mode}</p>
                  <p><strong>Duration:</strong> {req.duration}</p>
                  <p><strong>Dates:</strong> {req.startDate} to {req.endDate}</p>
                  <p>
                    <strong>Link:</strong>{" "}
                    <a href={req.companyLink} target="_blank" rel="noreferrer">{req.companyLink}</a>
                  </p>
                  {req.facultyName && (
                    <p style={{ color: "var(--navy)" }}>
                      <strong>Assigned Faculty:</strong> {req.facultyName}
                      {req.reviewDeadline && <span> (Target Review: {req.reviewDeadline})</span>}
                    </p>
                  )}

                  {req.reviewDateTime && (
                    <p style={{ color: "var(--amber)", fontWeight: "600" }}>
                      📅 <strong>Scheduled Review:</strong> {formatDateTime12Hour(req.reviewDateTime)}
                      {req.reviewNotes && <span style={{ display: "block", color: "var(--slate)", fontSize: "13px" }}>Notes: {req.reviewNotes}</span>}
                    </p>
                  )}

                  {/* Completed Internship Highlight with Score */}
                  {req.status === "completed" && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(39, 174, 96, 0.12), rgba(200, 168, 107, 0.12))",
                      border: "2px solid #27AE60",
                      borderRadius: "14px",
                      padding: "16px 18px",
                      margin: "14px 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      boxShadow: "0 4px 14px rgba(39, 174, 96, 0.12)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "46px",
                          height: "46px",
                          borderRadius: "50%",
                          background: "#27AE60",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          boxShadow: "0 2px 10px rgba(39, 174, 96, 0.35)",
                          flexShrink: 0
                        }}>
                          🏆
                        </div>
                        <div>
                          <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--navy)", display: "flex", alignItems: "center", gap: "8px" }}>
                            Internship Completed!
                            <span style={{ fontSize: "11px", background: "#27AE60", color: "#fff", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Verified
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--slate)" }}>
                            Evaluated by <strong>{req.facultyName || "Assigned Faculty"}</strong>
                            {req.evaluatedAt ? ` on ${new Date(req.evaluatedAt).toLocaleDateString()}` : ""}
                          </p>
                          {req.facultyRemarks && (
                            <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "var(--navy)", fontStyle: "italic", background: "rgba(255,255,255,0.7)", padding: "4px 8px", borderRadius: "6px" }}>
                              "{req.facultyRemarks}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{
                        textAlign: "center",
                        background: "#fff",
                        padding: "10px 18px",
                        borderRadius: "12px",
                        border: "1.5px solid rgba(39, 174, 96, 0.35)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        minWidth: "110px"
                      }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Final Score
                        </div>
                        <div style={{ fontSize: "26px", fontWeight: "900", color: "#27AE60", lineHeight: 1.1 }}>
                          {req.marks !== null && req.marks !== undefined ? req.marks : "--"}
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--slate)" }}>/100</span>
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: req.marks >= 75 ? "#27AE60" : req.marks >= 50 ? "#D97706" : "#E53E3E", marginTop: "2px" }}>
                          {req.marks >= 90 ? "Outstanding" : req.marks >= 75 ? "Excellent" : req.marks >= 60 ? "Good" : req.marks >= 50 ? "Satisfactory" : "Needs Improvement"}
                        </div>
                      </div>
                    </div>
                  )}

                  {req.status !== "completed" && req.marks !== null && req.marks !== undefined && (
                    <div style={{ background: "var(--success-bg)", padding: "10px 14px", borderRadius: "10px", margin: "10px 0" }}>
                      <p style={{ color: "var(--success)", margin: 0, fontWeight: "700", fontSize: "15px" }}>
                        ★ Evaluation Marks: {req.marks} / 100
                      </p>
                      {req.facultyRemarks && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Faculty Remarks:</strong> {req.facultyRemarks}</p>}
                    </div>
                  )}

                  {req.facultyName && (
                    <p style={{ margin: "8px 0 4px", fontSize: "13.5px" }}>
                      <strong>Assigned Faculty Evaluator:</strong> {req.facultyName}
                    </p>
                  )}

                  {req.reviewDateTime && (
                    <div style={{
                      background: "#EFF6FF",
                      border: "1.5px solid #BFDBFE",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      margin: "10px 0"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--navy)", fontWeight: "700", fontSize: "14px" }}>
                        <span>📅</span>
                        <span>Scheduled Review: {formatDateTime12Hour(req.reviewDateTime)}</span>
                      </div>
                      {req.reviewNotes && (
                        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--slate)" }}>
                          <strong>Venue / Meeting Info:</strong> {req.reviewNotes}
                        </p>
                      )}
                    </div>
                  )}

                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`status status-${req.status}`}>{req.status.replace(/_/g, " ")}</span>
                  </p>
                  {req.adminRemarks && <p><strong>Remarks:</strong> {req.adminRemarks}</p>}

                  <div className="divider" />
                  <StatusStepper status={req.status} />

                  {req.status === "offer_letter_required" && (
                    <div className="dropzone">
                      <p>Approved! Upload your signed offer letter (PDF) to continue.</p>
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={uploadingId === req._id}
                        onChange={(e) =>
                          e.target.files[0] && handleOfferLetterUpload(req._id, e.target.files[0])
                        }
                      />
                      {uploadingId === req._id && (
                        <div className="progress-track">
                          <div className="progress-fill indeterminate" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Certificate Upload section — ONLY unlocked on or after internship end date */}
                  {(req.status === "confirmed" || req.status === "certificate_submitted" || req.status === "faculty_assigned" || req.status === "review_scheduled" || req.status === "completed") && !req.certificateUrl && (
                    req.endDate && getTodayStr() < req.endDate ? (
                      <div className="dropzone" style={{ borderColor: "#CBD5E1", background: "#F8FAFC", padding: "16px 18px", borderRadius: "10px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#EDF2F7", padding: "6px 16px", borderRadius: "20px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "16px" }}>🔒</span>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy)" }}>Certificate Upload Locked</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--slate)", margin: "4px 0 0" }}>
                          Your internship is currently in progress. Certificate upload will automatically unlock on or after your internship end date: <strong style={{ color: "var(--navy)" }}>{req.endDate}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="dropzone" style={{ borderColor: "var(--navy)", background: "var(--blue-bg)" }}>
                        <p style={{ color: "var(--navy)", fontWeight: "600" }}>
                          🎓 Upload Internship Certificate (PDF)
                        </p>
                        {req.endDate && (
                          <p style={{ fontSize: "12px", color: "var(--slate)", margin: "2px 0 8px" }}>
                            Internship completed on {req.endDate}. Please upload your completion certificate.
                          </p>
                        )}
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={uploadingCertId === req._id}
                          onChange={(e) =>
                            e.target.files[0] && handleCertificateUpload(req._id, e.target.files[0], req.endDate)
                          }
                        />
                        {uploadingCertId === req._id && (
                          <div className="progress-track">
                            <div className="progress-fill indeterminate" />
                          </div>
                        )}
                      </div>
                    )
                  )}

                  <div className="button-row" style={{ marginTop: "12px" }}>
                    {req.offerLetterUrl && (
                      <a className="file-link" href={toDirectDropboxUrl(req.offerLetterUrl)} target="_blank" rel="noreferrer">
                        📄 View offer letter
                      </a>
                    )}
                    {req.certificateUrl && (
                      <a className="file-link" href={toDirectDropboxUrl(req.certificateUrl)} target="_blank" rel="noreferrer">
                        🎓 View certificate
                      </a>
                    )}
                  </div>

                  <button disabled={req.status === "pending" || req.status === "rejected"}>
                    {req.status === "completed"
                      ? "Evaluation completed"
                      : req.status === "review_scheduled"
                      ? "Review scheduled"
                      : req.status === "faculty_assigned"
                      ? "Awaiting review schedule"
                      : req.status === "certificate_submitted"
                      ? "Certificate submitted"
                      : req.status === "confirmed"
                      ? "Proceed for company"
                      : req.status === "rejected"
                      ? "Request rejected"
                      : "Awaiting next step"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </DashboardFrame>
  );
}