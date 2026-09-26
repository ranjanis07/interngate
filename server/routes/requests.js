const express = require("express");
const InternshipRequest = require("../models/InternshipRequest");
const { checkJwt } = require("../middleware/auth0");
const { requireDbUser, requireAdmin } = require("../middleware/dbUser");

const router = express.Router();

router.post("/", checkJwt, requireDbUser, async (req, res) => {
  try {
    const request = await InternshipRequest.create({
      ...req.body,
      studentId: req.dbUser._id,
      status: "pending",
    });
    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mine", checkJwt, requireDbUser, async (req, res) => {
  const requests = await InternshipRequest.find({ studentId: req.dbUser._id }).sort({
    createdAt: -1,
  });
  res.json({ requests });
});

router.get("/", checkJwt, requireDbUser, requireAdmin, async (req, res) => {
  const requests = await InternshipRequest.find().sort({ createdAt: -1 });
  res.json({ requests });
});

router.patch("/:id/status", checkJwt, requireDbUser, requireAdmin, async (req, res) => {
  const { status, adminRemarks, clearOfferLetter } = req.body;
  const update = { status };
  if (adminRemarks !== undefined) update.adminRemarks = adminRemarks;
  if (status === "confirmed") update.confirmedAt = new Date();
  if (clearOfferLetter) {
    update.offerLetterUrl = null;
    update.offerLetterName = null;
  }

  const request = await InternshipRequest.findByIdAndUpdate(req.params.id, update, {
    new: true,
  });
  if (!request) return res.status(404).json({ error: "Request not found" });
  res.json({ request });
});

router.patch("/:id/offer-letter", checkJwt, requireDbUser, async (req, res) => {
  const request = await InternshipRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (String(request.studentId) !== String(req.dbUser._id)) {
    return res.status(403).json({ error: "Not your request" });
  }

  request.offerLetterUrl = req.body.offerLetterUrl;
  request.offerLetterName = req.body.offerLetterName;
  request.offerLetterUploadedAt = new Date();
  request.status = "offer_letter_submitted";
  await request.save();

  res.json({ request });
});

// Student uploads Internship Certificate (only allowed on or after endDate)
router.patch("/:id/certificate", checkJwt, requireDbUser, async (req, res) => {
  try {
    const request = await InternshipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (String(request.studentId) !== String(req.dbUser._id)) {
      return res.status(403).json({ error: "Not your request" });
    }

    // Verify internship has ended before allowing certificate upload
    if (request.endDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const todayStr = `${y}-${m}-${d}`;

      if (todayStr < request.endDate) {
        return res.status(400).json({
          error: `Internship certificate can only be uploaded on or after the internship end date (${request.endDate}). Your internship is still in progress.`,
        });
      }
    }

    request.certificateUrl = req.body.certificateUrl;
    request.certificateName = req.body.certificateName;
    request.certificateUploadedAt = new Date();
    
    // Calculate 1-week deadline from endDate if available
    if (request.endDate) {
      const end = new Date(request.endDate);
      const deadline = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000);
      request.certificateDeadline = deadline;
    }

    request.status = "certificate_submitted";
    await request.save();

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get requests assigned to the logged-in Faculty
router.get("/faculty-assigned", checkJwt, requireDbUser, async (req, res) => {
  try {
    const requests = await InternshipRequest.find({ facultyId: req.dbUser._id }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin allocates Faculty member and sets review deadline
router.patch("/:id/assign-faculty", checkJwt, requireDbUser, requireAdmin, async (req, res) => {
  try {
    const { facultyId, facultyName, reviewDeadline } = req.body;
    const request = await InternshipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.facultyId = facultyId;
    request.facultyName = facultyName;
    request.reviewDeadline = reviewDeadline;
    request.status = "faculty_assigned";
    await request.save();

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty schedules review date and time for student
router.patch("/:id/schedule-review", checkJwt, requireDbUser, async (req, res) => {
  try {
    const { reviewDateTime, reviewNotes } = req.body;
    const request = await InternshipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Verify assigned faculty or admin
    if (String(request.facultyId) !== String(req.dbUser._id) && req.dbUser.role !== "admin") {
      return res.status(403).json({ error: "Not assigned to this student review" });
    }

    // Validate review time must be between 9:00 AM and 5:00 PM (09:00 to 17:00)
    if (reviewDateTime && reviewDateTime.includes("T")) {
      const timePart = reviewDateTime.split("T")[1];
      const [hh, mm] = timePart.split(":").map(Number);
      const totalMin = hh * 60 + (mm || 0);
      if (totalMin < 9 * 60 || totalMin > 17 * 60) {
        return res.status(400).json({
          error: "Review time must be scheduled between 9:00 AM and 5:00 PM.",
        });
      }
    }

    request.reviewDateTime = reviewDateTime;
    if (reviewNotes !== undefined) request.reviewNotes = reviewNotes;
    request.status = "review_scheduled";
    await request.save();

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty evaluates student and updates marks & remarks
router.patch("/:id/evaluate", checkJwt, requireDbUser, async (req, res) => {
  try {
    const { marks, facultyRemarks } = req.body;
    const request = await InternshipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (String(request.facultyId) !== String(req.dbUser._id) && req.dbUser.role !== "admin") {
      return res.status(403).json({ error: "Not assigned to this student evaluation" });
    }

    request.marks = Number(marks);
    request.facultyRemarks = facultyRemarks || "";
    request.evaluatedAt = new Date();
    request.status = "completed";
    await request.save();

    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", checkJwt, requireDbUser, async (req, res) => {
  try {
    const request = await InternshipRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (String(request.studentId) !== String(req.dbUser._id) && req.dbUser.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this request" });
    }

    await InternshipRequest.findByIdAndDelete(req.params.id);
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;