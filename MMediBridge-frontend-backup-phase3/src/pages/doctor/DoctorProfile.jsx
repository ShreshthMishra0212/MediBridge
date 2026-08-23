import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";

export const DoctorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = async () => {
    try {
      const response = await doctorApi.getProfile();
      const d = response.doctor;
      setProfile(d);
      setSpecialization(d.specialization || "");
      setExperience(d.experience || "");
      setLocation(d.location || "");
      setDescription(d.description || "");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch doctor profile details.");
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
      const response = await doctorApi.updateProfile({
        specialization: specialization || null,
        experience: experience ? parseInt(experience, 10) : null,
        location: location || null,
        description: description || null,
      });
      setSuccess("Profile updated successfully!");
      setProfile(response.doctor);
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
        <h2 style={{ marginBottom: "20px" }}>Clinical Profile & Settings</h2>
        <p className="text-muted" style={{ marginBottom: "30px" }}>
          Update your medical specialty, location coordinates, and biographical tags.
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
            <label className="form-label">Medical Specialization</label>
            <select
              className="form-control"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            >
              <option value="">Select Specialty</option>
              <option value="Cardiologist">Cardiologist</option>
              <option value="Dermatologist">Dermatologist</option>
              <option value="Neurologist">Neurologist</option>
              <option value="Pediatrician">Pediatrician</option>
              <option value="General Physician">General Physician</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Years of Experience</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 10"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinic Location / City</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Noida, Ghaziabad"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professional Biography</label>
            <textarea
              className="form-control"
              placeholder="Describe your qualifications, interests, or practice details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner"></span>
                <span>Saving Profile...</span>
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
