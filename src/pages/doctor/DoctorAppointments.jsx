import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { Calendar, Video, FileSpreadsheet, PlusCircle } from "lucide-react";

export const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Prescription Form State
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSchedule = async () => {
    try {
      const response = await doctorApi.getAppointments();
      // Filter confirmed slots
      const confirmed = (response.appointments || []).filter((app) => app.status === "Confirmed");
      setAppointments(confirmed);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch confirmed consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleCreateMeet = async (appointmentId) => {
    setActionLoading(true);
    setError("");
    try {
      const response = await doctorApi.createGoogleMeet(appointmentId);
      // Open link in new window immediately
      window.open(response.join_url, "_blank");
      fetchSchedule();
    } catch (err) {
      console.error(err);
      setError("Failed to create Google Meet event. Verify Calendar OAuth credentials on backend.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await doctorApi.createPrescription(activeAppointment.id, {
        diagnosis,
        medicines,
        advice,
        follow_up_date: followUpDate || "Not specified",
      });
      setSuccessMsg("Prescription generated successfully!");
      // Reset prescription state
      setDiagnosis("");
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
      setAdvice("");
      setFollowUpDate("");
      setTimeout(() => setActiveAppointment(null), 1500);
    } catch (err) {
      console.error(err);
      setError("Failed to submit prescription document.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading confirmed schedule...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="card table-card">
        <div className="table-header">
          <h3>Today's Clinical Consultations</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Generate Google Meet URLs, launch telemedicine consultation sessions, and compile client prescriptions.
          </p>
        </div>
        <div className="table-container">
          {appointments.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <Calendar size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>No confirmed appointments scheduled for today.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Telehealth Room</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>Patient ID: {app.patient_id.substring(0, 8)}...</td>
                    <td>{app.date}</td>
                    <td>{app.time}</td>
                    <td>
                      {app.join_url ? (
                        <a
                          href={app.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}
                        >
                          <Video size={14} /> Join Meet Call
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreateMeet(app.id)}
                          disabled={actionLoading}
                          className="btn btn-primary"
                          style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}
                        >
                          <PlusCircle size={14} /> Create Room
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setActiveAppointment(app);
                          setSuccessMsg("");
                          setError("");
                        }}
                        className="btn btn-outline"
                        style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}
                      >
                        <FileSpreadsheet size={14} /> Write Prescription
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Prescription Form Modal */}
      {activeAppointment && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "700px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setActiveAppointment(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--text-muted)"
              }}
            >
              &times;
            </button>

            <h3>Prescription for Patient ID: {activeAppointment.patient_id.substring(0, 8)}...</h3>
            <p className="text-muted" style={{ marginBottom: "20px" }}>
              Submit diagnostic results and prescribe brand or generic medicine tables.
            </p>

            <form onSubmit={handlePrescriptionSubmit}>
              <div className="form-group">
                <label className="form-label">Diagnosis Findings</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Hypertension control, Viral pyrexia"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
                  <label className="form-label" style={{ margin: 0 }}>Medications List</label>
                  <button type="button" onClick={handleAddMedicineRow} className="btn btn-secondary" style={{ padding: "6px 12px", width: "auto", fontSize: "0.75rem" }}>
                    + Add Row
                  </button>
                </div>

                {medicines.map((med, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Med Name"
                      required
                      value={med.name}
                      onChange={(e) => handleMedicineChange(idx, "name", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Dosage"
                      required
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Freq"
                      required
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Dur"
                      required
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Special Instructions"
                      value={med.instructions}
                      onChange={(e) => handleMedicineChange(idx, "instructions", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Additional Instructions / Advice</label>
                <textarea
                  className="form-control"
                  placeholder="Drink water, review blood pressure readings..."
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Follow-up Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={followUpDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveAppointment(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <span className="spinner"></span> : "Save & Generate prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
