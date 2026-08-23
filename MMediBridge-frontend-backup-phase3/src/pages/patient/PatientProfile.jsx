import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";

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
      setSuccess("Profile updated successfully!");
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
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div className="card">
        <h2 style={{ marginBottom: "20px" }}>My Personal Profile</h2>
        <p className="text-muted" style={{ marginBottom: "30px" }}>
          Keep your demographics and contact details updated for your consultants.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleUpdate}>
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
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={profile?.email || ""}
              disabled
              style={{ backgroundColor: "var(--border)", cursor: "not-allowed" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Age</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 25"
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

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Home Address</label>
            <textarea
              className="form-control"
              placeholder="Enter your current address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows="3"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner"></span>
                <span>Saving Changes...</span>
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
