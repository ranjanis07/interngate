import { useEffect, useState } from "react";
import { api } from "../api";
import { toDirectDropboxUrl } from "../dropbox";
import { formatDateTime12Hour, REVIEW_TIME_SLOTS } from "../formatDate";
import StatusStepper from "../StatusStepper";
import DashboardFrame from "../DashboardFrame";
import ProfileSettings from "../ProfileSettings";

const FILTERS = [
  { key: "faculty_assigned", label: "Needs Schedule" },
  { key: "review_scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All Assigned" },
];

const TABS = [
  { key: "requests", label: "Assigned Reviews" },
  { key: "profile", label: "Profile" },
];

const POLL_MS = 8000;



export default function FacultyDashboard() {
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("faculty_assigned");
  
  // State for scheduling modal/form
  const [scheduleModalReq, setScheduleModalReq] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [reviewNotes, setReviewNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // State for evaluation modal/form
  const [evalModalReq, setEvalModalReq] = useState(null);
  const [marks, setMarks] = useState("");
  const [facultyRemarks, setFacultyRemarks] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  async function loadRequests() {
    try {
      const { requests } = await api.facultyRequests();
      setRequests(requests);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!scheduleModalReq || !scheduleDate || !scheduleTime) return;

    const fullDateTime = `${scheduleDate}T${scheduleTime}`;

    // Validate: time must be between 09:00 and 17:00
    const [hh, mm] = scheduleTime.split(":").map(Number);
    const totalMin = hh * 60 + (mm || 0);
    if (totalMin < 9 * 60 || totalMin > 17 * 60) {
      alert("Review time must be between 9:00 AM and 5:00 PM.");
      return;
    }

    // Validate: must be before or on admin deadline
    if (scheduleModalReq.reviewDeadline) {
      const deadlineMs = new Date(scheduleModalReq.reviewDeadline + "T23:59:59").getTime();
      const selectedMs = new Date(fullDateTime).getTime();
      if (selectedMs > deadlineMs) {
        alert(`Review must be scheduled on or before the admin's deadline: ${scheduleModalReq.reviewDeadline}.`);
        return;
      }
    }

    // Validate: must not be in the past
    if (new Date(fullDateTime) < new Date()) {
      alert("Review date and time cannot be in the past.");
      return;
    }

    setScheduling(true);
    try {
      await api.scheduleReview(scheduleModalReq._id, {
        reviewDateTime: fullDateTime,
        reviewNotes,
      });
      alert("Review scheduled successfully for " + formatDateTime12Hour(fullDateTime));
      setScheduleModalReq(null);
      setScheduleDate("");
      setScheduleTime("09:00");
      setReviewNotes("");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to schedule review: " + error.message);
    } finally {
      setScheduling(false);
    }
  }

  async function handleEvalSubmit(e) {
    e.preventDefault();
    if (!evalModalReq || marks === "") return;
    setEvaluating(true);
    try {
      await api.evaluateStudent(evalModalReq._id, {
        marks,
        facultyRemarks,
      });
      alert("Evaluation completed and marks updated successfully!");
      setEvalModalReq(null);
      setMarks("");
      setFacultyRemarks("");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to update evaluation: " + error.message);
    } finally {
      setEvaluating(false);
    }
  }

  const visible = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <DashboardFrame title="Faculty Dashboard" tabs={TABS} activeTab={tab} onTabChange={setTab}>
      {tab === "profile" && <ProfileSettings role="faculty" />}

      {tab === "requests" && (
        <>
          <div className="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? "active" : ""}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="card-grid">
            {visible.length === 0 && <p className="empty-state">No student reviews in this category.</p>}
            {visible.map((req) => (
              <div className="card" style={{ position: "relative", overflow: "hidden" }} key={req._id}>
                <h3>{req.studentName} ({req.rollNo})</h3>
                <p><strong>Department:</strong> {req.department} | <strong>Year:</strong> {req.year}</p>
                <p><strong>Contact:</strong> {req.contactNo}</p>
                <p><strong>Company:</strong> {req.companyName} ({req.domain})</p>
                <p><strong>Internship Dates:</strong> {req.startDate} to {req.endDate}</p>
                
                {req.reviewDeadline && (
                  <p style={{ color: "var(--amber)", fontWeight: "600" }}>
                    <strong>Admin Review Deadline:</strong> {req.reviewDeadline}
                  </p>
                )}

                {req.reviewDateTime && (
                  <p style={{ color: "var(--navy)", fontWeight: "600" }}>
                    📅 <strong>Scheduled Review:</strong> {formatDateTime12Hour(req.reviewDateTime)}
                  </p>
                )}

                {req.reviewNotes && <p><strong>Meeting / Notes:</strong> {req.reviewNotes}</p>}

                {req.marks !== null && req.marks !== undefined && (
                  <div style={{ background: "var(--success-bg)", padding: "8px 12px", borderRadius: "8px", margin: "8px 0" }}>
                    <p style={{ color: "var(--success)", margin: 0, fontWeight: "700" }}>
                      ★ Marks Allocated: {req.marks} / 100
                    </p>
                    {req.facultyRemarks && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Faculty Remarks:</strong> {req.facultyRemarks}</p>}
                  </div>
                )}

                <p style={{ marginTop: "6px" }}>
                  <strong>Status:</strong>{" "}
                  <span className={`status status-${req.status}`}>{req.status.replace(/_/g, " ")}</span>
                </p>

                <div className="divider" />
                <StatusStepper status={req.status} />

                <div className="button-row" style={{ marginTop: "12px" }}>
                  {req.offerLetterUrl && (
                    <a className="file-link" href={toDirectDropboxUrl(req.offerLetterUrl)} target="_blank" rel="noreferrer">
                      📄 Offer Letter
                    </a>
                  )}
                  {req.certificateUrl && (
                    <a className="file-link" href={toDirectDropboxUrl(req.certificateUrl)} target="_blank" rel="noreferrer">
                      🎓 Certificate
                    </a>
                  )}
                </div>

                <div className="button-row" style={{ marginTop: "12px" }}>
                  {req.status === "faculty_assigned" && (
                    <button
                      type="button"
                      className="btn-gold"
                      onClick={() => {
                        setScheduleModalReq(req);
                        if (req.reviewDateTime && req.reviewDateTime.includes("T")) {
                          const [d, t] = req.reviewDateTime.split("T");
                          setScheduleDate(d || "");
                          setScheduleTime(t ? t.substring(0, 5) : "09:00");
                        } else {
                          setScheduleDate("");
                          setScheduleTime("09:00");
                        }
                        setReviewNotes(req.reviewNotes || "");
                      }}
                    >
                      📅 Schedule Review Date & Time
                    </button>
                  )}

                  {req.status === "review_scheduled" && (
                    <>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          setScheduleModalReq(req);
                          if (req.reviewDateTime && req.reviewDateTime.includes("T")) {
                            const [d, t] = req.reviewDateTime.split("T");
                            setScheduleDate(d || "");
                            setScheduleTime(t ? t.substring(0, 5) : "09:00");
                          } else {
                            setScheduleDate("");
                            setScheduleTime("09:00");
                          }
                          setReviewNotes(req.reviewNotes || "");
                        }}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        className="btn-gold"
                        onClick={() => {
                          setEvalModalReq(req);
                          setMarks(req.marks || "");
                          setFacultyRemarks(req.facultyRemarks || "");
                        }}
                      >
                        📝 Update Marks & Evaluate
                      </button>
                    </>
                  )}

                  {req.status === "completed" && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setEvalModalReq(req);
                        setMarks(req.marks || "");
                        setFacultyRemarks(req.facultyRemarks || "");
                      }}
                    >
                      Edit Marks / Remarks
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Schedule Review Modal */}
          {scheduleModalReq && (
            <div className="modal-overlay" style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "12px", maxWidth: "480px", width: "90%" }}>
                <h3>Schedule Review for {scheduleModalReq.studentName}</h3>
                <p className="sub">Set the date, time, and instructions (or meeting link) for the student.</p>

                <form onSubmit={handleScheduleSubmit}>
                  {scheduleModalReq?.reviewDeadline && (
                    <p style={{ fontSize: "12px", color: "var(--amber)", margin: "0 0 10px", background: "var(--amber-bg)", padding: "6px 10px", borderRadius: "6px" }}>
                      ⚠️ Admin deadline: <strong>{scheduleModalReq.reviewDeadline}</strong>. Review must be scheduled on or before this date.
                    </p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                        Review Date *
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        max={scheduleModalReq?.reviewDeadline || ""}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                        Review Time (9 AM – 5 PM) *
                      </label>
                      <select
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "#fff" }}
                      >
                        {REVIEW_TIME_SLOTS.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Instructions / Venue / Meeting Link
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Lab 204 or Google Meet link..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "16px", fontFamily: "inherit" }}
                  />

                  <div className="button-row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn-outline" onClick={() => setScheduleModalReq(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-gold" disabled={scheduling}>
                      {scheduling ? "Saving..." : "Send Review Schedule"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Evaluate Marks Modal */}
          {evalModalReq && (
            <div className="modal-overlay" style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "12px", maxWidth: "480px", width: "90%" }}>
                <h3>Evaluate {evalModalReq.studentName}</h3>
                <p className="sub">Enter marks (out of 100) and evaluation remarks.</p>

                <form onSubmit={handleEvalSubmit}>
                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Marks (out of 100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 95"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "14px" }}
                  />

                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Faculty Feedback / Remarks
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Feedback on internship presentation, report, and domain performance..."
                    value={facultyRemarks}
                    onChange={(e) => setFacultyRemarks(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "16px", fontFamily: "inherit" }}
                  />

                  <div className="button-row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn-outline" onClick={() => setEvalModalReq(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-gold" disabled={evaluating}>
                      {evaluating ? "Saving..." : "Submit Marks & Complete"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardFrame>
  );
}
