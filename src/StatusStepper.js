import { Fragment } from "react";

const STAGES = [
  "pending",
  "offer_letter_required",
  "offer_letter_submitted",
  "confirmed",
  "certificate_submitted",
  "faculty_assigned",
  "review_scheduled",
  "completed",
];
const LABELS = [
  "Submitted",
  "Approved",
  "Offer letter",
  "Confirmed",
  "Certificate",
  "Faculty assigned",
  "Review scheduled",
  "Completed",
];

export default function StatusStepper({ status }) {
  if (status === "rejected") {
    return (
      <div className="stepper rejected">
        <div className="step current">
          <div className="step-dot">✕</div>
          <span className="step-label">Rejected</span>
        </div>
      </div>
    );
  }

  const idx = STAGES.indexOf(status);

  return (
    <div className="stepper">
      {STAGES.map((stage, i) => (
        <Fragment key={stage}>
          <div className={`step ${i < idx ? "done" : i === idx ? "current" : ""}`}>
            <div className="step-dot">{i < idx ? "✓" : i + 1}</div>
            <span className="step-label">{LABELS[i]}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`step-line ${i < idx ? "filled" : ""}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}