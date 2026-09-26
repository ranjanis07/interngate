const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: String,
    department: String,
    year: String,
    contactNo: String,
    rollNo: String,
    companyName: String,
    companyAddress: String,
    companyLink: String,
    domain: String,
    mode: String,
    duration: String,
    startDate: String,
    endDate: String,
    status: { type: String, default: "pending" },
    adminRemarks: { type: String, default: "" },
    offerLetterUrl: { type: String, default: null },
    offerLetterName: { type: String, default: null },
    offerLetterUploadedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },

    // Certificate Submission fields
    certificateUrl: { type: String, default: null },
    certificateName: { type: String, default: null },
    certificateUploadedAt: { type: Date, default: null },
    certificateDeadline: { type: Date, default: null },

    // Faculty Assignment fields (by Admin)
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    facultyName: { type: String, default: null },
    reviewDeadline: { type: String, default: null },

    // Faculty Review & Marks Evaluation fields
    reviewDateTime: { type: String, default: null },
    reviewNotes: { type: String, default: "" },
    marks: { type: Number, default: null },
    facultyRemarks: { type: String, default: "" },
    evaluatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InternshipRequest", requestSchema);