import { useEffect, useState } from "react";
import { api } from "../api";
import { toDirectDropboxUrl } from "../dropbox";
import { formatDateTime12Hour } from "../formatDate";
import StatusStepper from "../StatusStepper";
import Seal from "../Seal";
import DashboardFrame from "../DashboardFrame";
import ProfileSettings from "../ProfileSettings";

const FILTERS = [
  { key: "pending", label: "Needs review" },
  { key: "offer_letter_required", label: "Awaiting offer letter" },
  { key: "offer_letter_submitted", label: "Offer letter submitted" },
  { key: "confirmed", label: "Confirmed" },
  { key: "certificate_submitted", label: "Certificate submitted" },
  { key: "faculty_assigned", label: "Faculty assigned" },
  { key: "review_scheduled", label: "Review scheduled" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "profile", label: "Profile" },
];

const POLL_MS = 8000;

// Today's date in YYYY-MM-DD for min constraint
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [filter, setFilter] = useState("pending");

  // Assign faculty modal state
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [reviewDeadline, setReviewDeadline] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function loadRequests() {
    try {
      const { requests } = await api.allRequests();
      setRequests(requests);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadFaculty() {
    try {
      const { faculty } = await api.getFacultyList();
      setFacultyList(faculty || []);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadRequests();
    loadFaculty();
    const interval = setInterval(loadRequests, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(id, status, extra = {}) {
    try {
      await api.updateStatus(id, { status, ...extra });
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to update status: " + error.message);
    }
  }

  function approve(id) {
    updateStatus(id, "offer_letter_required", { adminRemarks: "" });
  }

  function reject(id) {
    const remarks = prompt("Reason for rejection (optional):") || "";
    updateStatus(id, "rejected", { adminRemarks: remarks });
  }

  function confirmOfferLetter(id) {
    updateStatus(id, "confirmed");
  }

  function requestReupload(id) {
    updateStatus(id, "offer_letter_required", { clearOfferLetter: true });
  }

  async function handleAssignFacultySubmit(e) {
    e.preventDefault();
    if (!assignModalReq || !selectedFacultyId || !reviewDeadline) return;

    const facultyObj = facultyList.find((f) => String(f.id) === String(selectedFacultyId));
    const facultyName = facultyObj ? facultyObj.name || facultyObj.email : "Faculty Member";

    setAssigning(true);
    try {
      await api.assignFaculty(assignModalReq._id, {
        facultyId: selectedFacultyId,
        facultyName,
        reviewDeadline,
      });
      alert(`Assigned review to ${facultyName} successfully!`);
      setAssignModalReq(null);
      setSelectedFacultyId("");
      setReviewDeadline("");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to assign faculty: " + error.message);
    } finally {
      setAssigning(false);
    }
  }

  const visible = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <DashboardFrame title="Admin dashboard" tabs={TABS} activeTab={tab} onTabChange={setTab}>
      {tab === "profile" && <ProfileSettings role="admin" />}

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
            {visible.length === 0 && <p className="empty-state">No requests in this category.</p>}
            {visible.map((req) => (
              <div className="card" style={{ position: "relative", overflow: "hidden" }} key={req._id}>
                {req.status === "confirmed" && <Seal />}

                <h3>{req.studentName} ({req.rollNo})</h3>
                <p><strong>Department:</strong> {req.department} | <strong>Year:</strong> {req.year}</p>
                <p><strong>Contact:</strong> {req.contactNo}</p>
                <p><strong>Domain:</strong> {req.domain}</p>
                <p><strong>Company:</strong> {req.companyName}, {req.companyAddress}</p>
                <p>
                  <strong>Link:</strong>{" "}
                  <a href={req.companyLink} target="_blank" rel="noreferrer">{req.companyLink}</a>
                </p>
                <p><strong>Mode:</strong> {req.mode} | <strong>Duration:</strong> {req.duration}</p>
                <p><strong>Dates:</strong> {req.startDate} to {req.endDate}</p>
                
                {req.facultyName && (
                  <p style={{ color: "var(--navy)", fontWeight: "600" }}>
                    <strong>Assigned Faculty:</strong> {req.facultyName}
                    {req.reviewDeadline && <span style={{ display: "block", fontSize: "12px", color: "var(--slate)" }}>Admin Target Deadline: {req.reviewDeadline}</span>}
                  </p>
                )}

                {req.reviewDateTime && (
                  <p style={{ color: "var(--amber)", fontWeight: "600" }}>
                    📅 <strong>Faculty Review Time:</strong> {formatDateTime12Hour(req.reviewDateTime)}
                  </p>
                )}

                {req.marks !== null && req.marks !== undefined && (
                  <div style={{ background: "var(--success-bg)", padding: "8px 12px", borderRadius: "8px", margin: "8px 0" }}>
                    <p style={{ color: "var(--success)", margin: 0, fontWeight: "700" }}>
                      ★ Allocated Marks: {req.marks} / 100
                    </p>
                    {req.facultyRemarks && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Faculty Remarks:</strong> {req.facultyRemarks}</p>}
                  </div>
                )}

                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status status-${req.status}`}>{req.status.replace(/_/g, " ")}</span>
                </p>
                {req.adminRemarks && <p><strong>Remarks:</strong> {req.adminRemarks}</p>}

                <div className="divider" />
                <StatusStepper status={req.status} />

                {req.status === "pending" && (
                  <div className="button-row">
                    <button className="btn-gold" onClick={() => approve(req._id)}>Approve</button>
                    <button className="btn-danger" onClick={() => reject(req._id)}>Reject</button>
                  </div>
                )}

                {req.status === "offer_letter_submitted" && (
                  <>
                    <div className="button-row">
                      <a className="file-link" href={req.offerLetterUrl} target="_blank" rel="noreferrer">
                        📄 Review offer letter
                      </a>
                    </div>
                    <div className="button-row">
                      <button className="btn-gold" onClick={() => confirmOfferLetter(req._id)}>
                        Confirm offer letter
                      </button>
                      <button className="btn-outline" onClick={() => requestReupload(req._id)}>
                        Request re-upload
                      </button>
                    </div>
                  </>
                )}

                <div className="button-row" style={{ marginTop: "10px" }}>
                  {req.offerLetterUrl && (
                    <a className="file-link" href={toDirectDropboxUrl(req.offerLetterUrl)} target="_blank" rel="noreferrer">
                      📄 Offer letter
                    </a>
                  )}
                  {req.certificateUrl && (
                    <a className="file-link" href={toDirectDropboxUrl(req.certificateUrl)} target="_blank" rel="noreferrer">
                      🎓 Certificate
                    </a>
                  )}
                </div>

                {(req.status === "confirmed" || req.status === "certificate_submitted" || req.status === "faculty_assigned" || req.status === "review_scheduled" || req.status === "completed") && (
                  <div className="button-row" style={{ marginTop: "12px" }}>
                    <button
                      type="button"
                      className={req.certificateUrl || req.facultyName ? "btn-gold" : "btn-outline"}
                      disabled={!req.certificateUrl && !req.facultyName}
                      onClick={() => {
                        setAssignModalReq(req);
                        setSelectedFacultyId(req.facultyId || "");
                        setReviewDeadline(req.reviewDeadline || "");
                      }}
                    >
                      {req.facultyName
                        ? "Re-assign Faculty Member"
                        : req.certificateUrl
                        ? "👨‍🏫 Assign Faculty for Review"
                        : "🔒 Awaiting Certificate Upload to Assign Faculty"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Assign Faculty Modal */}
          {assignModalReq && (
            <div className="modal-overlay" style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div className="modal-content" style={{ background: "#fff", padding: "24px", borderRadius: "12px", maxWidth: "480px", width: "90%" }}>
                <h3>Assign Faculty for {assignModalReq.studentName}</h3>
                <p className="sub">Select a faculty member and specify the deadline to complete the review.</p>

                <form onSubmit={handleAssignFacultySubmit}>
                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Select Faculty Member *
                  </label>
                  {facultyList.length === 0 ? (
                    <p style={{ color: "var(--danger)", fontSize: "13px" }}>
                      No faculty registered yet. Please have a faculty member register first.
                    </p>
                  ) : (
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "14px" }}
                    >
                      <option value="" disabled>Choose faculty member...</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name || f.email} ({f.department || "Faculty"})
                        </option>
                      ))}
                    </select>
                  )}

                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                    Target Review Completion Deadline *
                  </label>
                  <input
                    type="date"
                    value={reviewDeadline}
                    min={getTodayStr()}
                    onChange={(e) => setReviewDeadline(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "16px" }}
                  />

                  <div className="button-row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn-outline" onClick={() => setAssignModalReq(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-gold" disabled={assigning || facultyList.length === 0}>
                      {assigning ? "Assigning..." : "Assign & Notify Faculty"}
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