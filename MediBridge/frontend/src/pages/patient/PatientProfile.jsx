import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import { User, Phone, MapPin, Calendar, Heart, ShieldCheck, Check } from "lucide-react";

export const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = async () => {
    try {
      const response = await patientApi.getProfile();
      const p = response.patient;
      setProfile(p);
      setAge(p.age || "");
      setGender(p.gender || "");
      setPhone(p.phone || "");
      setAddress(p.address || "");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await patientApi.updateProfile({
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
      });
      setSuccess("Personal profile updated successfully!");
      setProfile(response.patient);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading your patient profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <div className="card">
        {/* Profile Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px", borderBottom: "1px solid var(--border)", paddingBottom: "20px", marginBottom: "24px" }}>
          <div className="doctor-avatar-lg" style={{ width: "72px", height: "72px", fontSize: "1.8rem" }}>
            {profile?.name ? profile.name[0].toUpperCase() : "P"}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{profile?.name}</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <span className="badge badge-confirmed" style={{ fontSize: "0.75rem" }}>Verified Patient</span>
              <span className="text-muted" style={{ fontSize: "0.82rem" }}>ID: {profile?.id}</span>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleUpdate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={profile?.name || ""}
                disabled
                style={{ backgroundColor: "var(--border)", cursor: "not-allowed" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered Email</label>
              <input
                type="email"
                className="form-control"
                value={profile?.email || ""}
                disabled
                style={{ backgroundColor: "var(--border)", cursor: "not-allowed" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Age (Years)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 28"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address</label>
            <textarea
              className="form-control"
              placeholder="Enter your current address or city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows="3"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }} disabled={saving}>
            {saving ? (
              <>
                <span className="spinner"></span>
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Check size={16} /> Save Profile Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
