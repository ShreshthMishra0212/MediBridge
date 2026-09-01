import { useState, useEffect } from "react";
import { doctorApi, directApi } from "../../api/services";
import { MED_SALT_MAP } from "../../api/medSaltCatalog";
import {
  Calendar,
  Video,
  FileSpreadsheet,
  PlusCircle,
  Clock,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  FileText,
} from "lucide-react";

const DOSAGE_PRESETS = [
  "1-0-1 (Twice daily after food)",
  "1-0-0 (Once daily morning before food)",
  "0-0-1 (Once daily at bedtime)",
  "1-1-1 (Thrice daily after food)",
  "SOS (Only when required / as needed)",
];

const DURATION_PRESETS = [
  "3 Days",
  "5 Days",
  "7 Days",
  "10 Days",
  "14 Days",
  "1 Month",
];

export const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedMeetId, setCopiedMeetId] = useState("");

  // Prescription Form State
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "500mg", frequency: "1-0-1 (Twice daily after food)", duration: "5 Days", instructions: "Take with water after meals" },
  ]);
  const [advice, setAdvice] = useState("Stay hydrated, take prescribed medications on time, and rest.");
  const [followUpDate, setFollowUpDate] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSchedule = async () => {
    try {
      const response = await doctorApi.getAppointments();
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
      window.open(response.join_url, "_blank");
      fetchSchedule();
    } catch (err) {
      console.error(err);
      setError("Failed to create Google Meet room. Ensure Calendar API token is authorized on backend.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedMeetId(id);
    setTimeout(() => setCopiedMeetId(""), 2000);
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: "", dosage: "", frequency: "1-0-1 (Twice daily after food)", duration: "5 Days", instructions: "" },
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
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
      setSuccessMsg("Prescription generated & compiled as PDF/DOCX successfully!");
      setDiagnosis("");
      setMedicines([
        { name: "", dosage: "500mg", frequency: "1-0-1 (Twice daily after food)", duration: "5 Days", instructions: "Take with water after meals" },
      ]);
      setAdvice("Stay hydrated, take prescribed medications on time, and rest.");
      setFollowUpDate("");
      setTimeout(() => {
        setActiveAppointment(null);
        setSuccessMsg("");
      }, 1800);
    } catch (err) {
      console.error(err);
      setError("Failed to submit prescription document.");
    } finally {
      setActionLoading(false);
    }
  };

  const commonMedNames = Object.keys(MED_SALT_MAP);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading confirmed appointments schedule...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Confirmed Consultations & Telehealth Hub</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Launch Google Meet consultations, manage client sessions, and issue digital prescriptions
            </p>
          </div>
          <span className="badge badge-confirmed" style={{ fontSize: "0.8rem" }}>
            {appointments.length} Confirmed Today
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="card table-card">
        <div className="table-container">
          {appointments.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center" }} className="text-muted">
              <Calendar size={48} style={{ marginBottom: "14px", strokeWidth: 1.5 }} />
              <p>No confirmed appointments scheduled for today.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Date & Time</th>
                  <th>Google Meet Telehealth Room</th>
                  <th>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>Patient ID: {app.patient_id.substring(0, 8)}...</div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>Area: {app.area || "MediBridge Telehealth"}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{app.date}</div>
                      <small className="text-muted">{app.time}</small>
                    </td>

                    <td>
                      {app.join_url ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <a
                            href={app.join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: "7px 14px", fontSize: "0.8rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <Video size={14} /> Join Meeting
                          </a>
                          <button
                            onClick={() => handleCopyLink(app.join_url, app.id)}
                            className="btn btn-outline"
                            style={{ padding: "7px 10px", width: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            title="Copy Meeting Link"
                          >
                            {copiedMeetId === app.id ? <Check size={13} className="text-secondary" /> : <Copy size={13} />}
                            <span>{copiedMeetId === app.id ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateMeet(app.id)}
                          disabled={actionLoading}
                          className="btn btn-primary"
                          style={{ padding: "7px 14px", fontSize: "0.8rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <PlusCircle size={14} /> Generate Room
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
                        style={{ padding: "7px 14px", fontSize: "0.8rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
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

      {/* Prescription Studio Modal */}
      {activeAppointment && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "780px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative", backgroundColor: "#ffffff" }}>
            <button
              onClick={() => setActiveAppointment(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)" }}
            >
              &times;
            </button>

            <div style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "12px", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, color: "var(--primary)" }}>Prescription Studio</h3>
              <small className="text-muted">Prescribing for Patient ID: <strong>{activeAppointment.patient_id.substring(0, 10)}...</strong> ({activeAppointment.date} at {activeAppointment.time})</small>
            </div>

            <form onSubmit={handlePrescriptionSubmit}>
              {/* Diagnosis */}
              <div className="form-group">
                <label className="form-label">Clinical Diagnosis Findings</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Acute Viral Bronchitis, Essential Hypertension Grade 1"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              {/* Medicine Table Builder */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
                  <label className="form-label" style={{ margin: 0 }}>Medications List ({medicines.length})</label>
                  <button type="button" onClick={handleAddMedicineRow} className="btn btn-secondary" style={{ padding: "5px 12px", width: "auto", fontSize: "0.75rem" }}>
                    + Add Medication Row
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {medicines.map((med, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: "8px", alignItems: "center" }}>
                        <div>
                          <input
                            type="text"
                            list={`med-suggestions-${idx}`}
                            className="form-control"
                            placeholder="Medicine Name (e.g. Dolo 650, Augmentin)"
                            required
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, "name", e.target.value)}
                          />
                          <datalist id={`med-suggestions-${idx}`}>
                            {commonMedNames.map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>

                        <input
                          type="text"
                          className="form-control"
                          placeholder="Dosage (500mg)"
                          required
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                        />

                        <select
                          className="form-control"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                        >
                          {DOSAGE_PRESETS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicineRow(idx)}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "6px" }}
                            title="Remove Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "8px" }}>
                        <select
                          className="form-control"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                        >
                          {DURATION_PRESETS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        <input
                          type="text"
                          className="form-control"
                          placeholder="Special Instructions (e.g. Take with warm water, avoid dairy)"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, "instructions", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Advice */}
              <div className="form-group">
                <label className="form-label">Special Clinical Instructions / Dietary Advice</label>
                <textarea
                  className="form-control"
                  placeholder="Drink warm water, avoid strenuous physical activity..."
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  rows="2"
                />
              </div>

              {/* Follow-up Date */}
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
                  {actionLoading ? (
                    <>
                      <span className="spinner"></span> Generating PDF & DOCX...
                    </>
                  ) : (
                    "Save & Compile Prescription"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
