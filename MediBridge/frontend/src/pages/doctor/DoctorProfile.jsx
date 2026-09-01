import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { User, Award, MapPin, Stethoscope, Check, ShieldCheck } from "lucide-react";

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
      setSuccess("Doctor clinical profile updated successfully!");
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
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading clinical profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <div className="card">
        {/* Profile Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px", borderBottom: "1px solid var(--border)", paddingBottom: "20px", marginBottom: "24px" }}>
          <div className="doctor-avatar-lg" style={{ width: "72px", height: "72px", fontSize: "1.8rem" }}>
            {profile?.name ? profile.name[0].toUpperCase() : "D"}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Dr. {profile?.name}</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <span className="badge badge-confirmed" style={{ fontSize: "0.75rem" }}>
                {specialization || "General Physician"}
              </span>
              <span className="text-muted" style={{ fontSize: "0.82rem" }}>Rating: {profile?.rating || "5.0"} ★</span>
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

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Medical Specialization</label>
              <select
                className="form-control"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              >
                <option value="">Select Specialty</option>
                <option value="General Physician">General Physician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Orthopedist">Orthopedist</option>
                <option value="Ophthalmologist">Ophthalmologist</option>
                <option value="ENT Specialist">ENT Specialist</option>
                <option value="Psychiatrist">Psychiatrist</option>
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
          </div>

          <div className="form-group">
            <label className="form-label">Clinic Location / City</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Noida Sector 62, Delhi NCR"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professional Bio & Practice Focus</label>
            <textarea
              className="form-control"
              placeholder="Describe your qualifications, clinical interests, or consultation details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
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
                <Check size={16} /> Save Clinical Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
