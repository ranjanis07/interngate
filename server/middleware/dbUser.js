const User = require("../models/User");

// Find the MongoDB user corresponding to the logged-in Auth0 user
async function requireDbUser(req, res, next) {
  try {
    if (!req.auth || !req.auth.payload || !req.auth.payload.sub) {
      return res.status(401).json({
        error: "Invalid Auth0 token",
      });
    }

    const auth0Id = req.auth.payload.sub;

    const user = await User.findOne({ auth0Id });

    if (!user) {
      return res.status(404).json({
        error: "Profile not found. Please sync your Auth0 account first.",
      });
    }

    req.dbUser = user;

    next();
  } catch (err) {
    console.error("DB USER ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
}

// Only users with role = admin can continue
function requireAdmin(req, res, next) {
  if (!req.dbUser) {
    return res.status(401).json({
      error: "User profile not loaded",
    });
  }

  if (req.dbUser.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }

  next();
}

// Only users with role = faculty (or admin) can continue
function requireFaculty(req, res, next) {
  if (!req.dbUser) {
    return res.status(401).json({
      error: "User profile not loaded",
    });
  }

  if (req.dbUser.role !== "faculty" && req.dbUser.role !== "admin") {
    return res.status(403).json({
      error: "Faculty access required",
    });
  }

  next();
}

module.exports = {
  requireDbUser,
  requireAdmin,
  requireFaculty,
};