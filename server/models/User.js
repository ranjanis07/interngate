const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Auth0's stable user id (the "sub" claim), e.g. "google-oauth2|109...".
    // This is the identity key now — Auth0 owns authentication, MongoDB
    // just stores the app-specific profile fields Auth0 doesn't know about.
    auth0Id: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    department: { type: String, default: "" },
    year: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    regNo: { type: String, default: "" },
    rollNo: { type: String, default: "" },
    profilePhotoUrl: { type: String, default: null },
    role: { type: String, enum: ["student", "admin", "faculty"], default: "student" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);