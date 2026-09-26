import { useState } from "react";
import { api } from "./api";
import { useAuth } from "./context/AuthContext";
import { uploadProfilePhoto, toDirectDropboxUrl } from "./dropbox";

const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function ProfileSettings({ role: propRole }) {
  const { user, updateUser } = useAuth();
  const currentRole = user?.role || propRole || "student";

  const [form, setForm] = useState({
    name: user?.name || "",
    department: user?.department || "",
    year: user?.year || "",
    phone: user?.phone || "",
    regNo: user?.regNo || "",
    rollNo: user?.rollNo || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handlePhotoUpload(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPG, PNG, WebP).");
      return;
    }
    setUploadingPhoto(true);
    setAvatarError(false);
    try {
      const { url } = await uploadProfilePhoto(file, user.id);
      const { user: updated } = await api.updateProfile({ profilePhotoUrl: url });
      updateUser(updated);
      alert("Profile photo updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Photo upload failed: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
      };

      if (currentRole === "student") {
        payload.department = form.department;
        payload.year = form.year;
        payload.regNo = form.regNo;
        payload.rollNo = form.rollNo;
      } else if (currentRole === "faculty") {
        payload.department = form.department;
      }

      const { user: updated } = await api.updateProfile(payload);
      updateUser(updated);
      alert("Profile settings saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Could not update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="section">
        <p className="empty-state">No profile found for this account.</p>
      </div>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      {/* Left Avatar Card */}
      <div className="profile-avatar-card">
        <div className="avatar-circle">
          {user.profilePhotoUrl && !avatarError ? (
            <img
              src={toDirectDropboxUrl(user.profilePhotoUrl)}
              alt="Profile Avatar"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
          <label className="avatar-upload-btn" title="Upload new photo">
            📷
            <input
              type="file"
              accept="image/*"
              className="hidden-file-input"
              disabled={uploadingPhoto}
              onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
            />
          </label>
        </div>

        {uploadingPhoto && <p className="avatar-uploading">Uploading photo...</p>}

        <h3 className="avatar-name">{user.name || "User"}</h3>
        <p className="avatar-role" style={{ textTransform: "uppercase" }}>{currentRole}</p>

        <div className="avatar-meta">
          <div><strong>Email:</strong> {user.email}</div>
          {user.department && <div><strong>Dept:</strong> {user.department}</div>}
          {user.phone && <div><strong>Phone:</strong> {user.phone}</div>}
          {currentRole === "student" && user.rollNo && <div><strong>Roll No:</strong> {user.rollNo}</div>}
        </div>
      </div>

      {/* Right Editable Fields Card */}
      <div className="profile-fields-card">
        <h2>Profile Details ({currentRole.toUpperCase()})</h2>
        <p className="sub">
          {currentRole === "student"
            ? "Your Name, Reg No, Roll No, Department, Year, and Phone number are auto-filled onto every internship request."
            : currentRole === "faculty"
            ? "Your Name, Department, Email, and Phone number details for faculty evaluations."
            : "Your Admin account profile details."}
        </p>

        <form onSubmit={handleSave} className="fields-grid">
          {/* Name */}
          <div className="field-row">
            <div className="field-body">
              <label>Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
          </div>

          {/* Email (Disabled) */}
          <div className="field-row">
            <div className="field-body">
              <label>Email Address</label>
              <input value={user.email || ""} disabled />
            </div>
          </div>

          {/* Student-only Fields: Reg No & Roll No */}
          {currentRole === "student" && (
            <>
              <div className="field-row">
                <div className="field-body">
                  <label>Register Number (Reg No) *</label>
                  <input
                    name="regNo"
                    placeholder="e.g. 917721104001"
                    value={form.regNo}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-body">
                  <label>Roll Number (Roll No) *</label>
                  <input
                    name="rollNo"
                    placeholder="e.g. 21IT045"
                    value={form.rollNo}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Department (Student & Faculty) */}
          {(currentRole === "student" || currentRole === "faculty") && (
            <div className="field-row">
              <div className="field-body">
                <label>Department *</label>
                <input
                  name="department"
                  placeholder="e.g. Information Technology"
                  value={form.department}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {/* Student-only Field: Year */}
          {currentRole === "student" && (
            <div className="field-row">
              <div className="field-body">
                <label>Year *</label>
                <select name="year" value={form.year} onChange={handleChange} required>
                  <option value="" disabled>Select Year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Phone Number (All Roles) */}
          <div className="field-row">
            <div className="field-body">
              <label>Contact Phone Number *</label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Admin-only Password Info */}
          {currentRole === "admin" && (
            <div className="field-row">
              <div className="field-body">
                <label>Password Security</label>
                <input value="•••••••• (Protected via Auth0 Identity)" disabled />
              </div>
            </div>
          )}

          <button type="submit" className="save-btn btn-gold" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Profile Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}