const express = require("express");
const User = require("../models/User");
const { checkJwt } = require("../middleware/auth0");

const router = express.Router();

function toSafeUser(user) {
  return {
    id: user._id,
    auth0Id: user.auth0Id,
    name: user.name,
    department: user.department,
    year: user.year,
    email: user.email,
    phone: user.phone,
    regNo: user.regNo,
    rollNo: user.rollNo,
    profilePhotoUrl: user.profilePhotoUrl,
    role: user.role,
  };
}

// Sync Auth0 user with MongoDB
router.post("/sync", checkJwt, async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;

    const name =
      req.body.name ||
      req.auth.payload.name ||
      req.auth.payload.nickname ||
      "";

    const email =
      req.body.email ||
      req.auth.payload.email ||
      "";

    if (!email) {
      return res.status(400).json({
        error: "Email not available from Auth0",
      });
    }

    let user = await User.findOne({
      $or: [{ auth0Id }, { email: email.toLowerCase() }],
    });

    const requestedRole = req.body.role;
    const initialRole = ["student", "faculty", "admin"].includes(requestedRole) ? requestedRole : "student";

    if (!user) {
      user = await User.create({
        auth0Id,
        name,
        email: email.toLowerCase(),
        role: initialRole,
      });

      console.log("NEW USER CREATED:", email, "ROLE:", user.role);
    } else {
      // For EXISTING users: ALWAYS keep the role stored in MongoDB.
      // The "I am signing in as" dropdown on the login page only sets the
      // initial role for brand-new accounts — it must never change an
      // existing user's role. A student logging in with "Faculty" selected
      // must still go to the student dashboard.
      user.auth0Id = auth0Id;
      if (name) user.name = name;
      user.email = email.toLowerCase();
      // Role is intentionally NOT updated here.

      await user.save();

      console.log("EXISTING USER SYNCED:", email, "FINAL ROLE:", user.role);
    }

    console.log("USER ROLE:", user.role);

    res.json({
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error("AUTH SYNC ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// Get all faculty members (for Admin to assign)
const { requireDbUser, requireAdmin } = require("../middleware/dbUser");
router.get("/faculty", checkJwt, requireDbUser, async (req, res) => {
  try {
    const facultyList = await User.find({ role: "faculty" }).sort({ name: 1 });
    res.json({ faculty: facultyList.map(toSafeUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current MongoDB profile
router.get("/me", checkJwt, async (req, res) => {
  try {
    const user = await User.findOne({
      auth0Id: req.auth.payload.sub,
    });

    if (!user) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    res.json({
      user: toSafeUser(user),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Update current user's profile
router.put("/me", checkJwt, async (req, res) => {
  try {
    const { name, department, year, phone, regNo, rollNo, profilePhotoUrl } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (department !== undefined) updateFields.department = department;
    if (year !== undefined) updateFields.year = year;
    if (phone !== undefined) updateFields.phone = phone;
    if (regNo !== undefined) updateFields.regNo = regNo;
    if (rollNo !== undefined) updateFields.rollNo = rollNo;
    if (profilePhotoUrl !== undefined) updateFields.profilePhotoUrl = profilePhotoUrl;

    const user = await User.findOneAndUpdate(
      {
        auth0Id: req.auth.payload.sub,
      },
      updateFields,
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    res.json({
      user: toSafeUser(user),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;