import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  Check,
  X,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";

export const DoctorRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Reschedule state
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [suggestDate, setSuggestDate] = useState("");
  const [suggestTime, setSuggestTime] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await doctorApi.getAppointments();
      const pending = (response.appointments || []).filter((app) => app.status === "Pending");
      setRequests(pending);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pending appointment requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (appointmentId) => {
    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await doctorApi.acceptAppointment(appointmentId);
      setActionSuccess("Appointment confirmed! You can now generate Google Meet rooms for this slot.");
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError("Failed to accept appointment request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!suggestDate || !suggestTime) return;

    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await doctorApi.suggestReschedule(rescheduleAppointment.id, suggestDate, suggestTime);
      setActionSuccess("Reschedule proposal sent to patient for confirmation!");
      setRescheduleAppointment(null);
      setSuggestDate("");
      setSuggestTime("");
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError("Failed to submit reschedule suggestion.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading pending patient requests...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Pending Patient Consultation Requests</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Review patient booking requests, accept slots to confirm consultations, or propose alternative times
            </p>
          </div>
          <span className="badge badge-pending" style={{ fontSize: "0.8rem" }}>
            {requests.length} Pending Decision
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

      <div className="card table-card">
        <div className="table-container">
          {requests.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center" }} className="text-muted">
              <ClipboardList size={48} style={{ marginBottom: "14px", strokeWidth: 1.5 }} />
              <p>No pending appointment requests in your inbox.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Requested Date</th>
                  <th>Requested Time Slot</th>
                  <th>Decision Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>Patient ID: {req.patient_id.substring(0, 8)}...</div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>Full ID: <code>{req.patient_id}</code></div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{req.date}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{req.time}</div>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={actionLoading}
                          className="btn btn-secondary"
                          style={{ padding: "7px 14px", width: "auto", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <CheckCircle size={14} /> Accept Slot
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleAppointment(req);
                            setSuggestDate("");
                            setSuggestTime("");
                          }}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: "7px 14px", width: "auto", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Clock size={14} /> Propose New Time
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reschedule Proposal Modal */}
      {rescheduleAppointment && (
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
          <div className="card" style={{ maxWidth: "480px", width: "100%", position: "relative" }}>
            <button
              onClick={() => setRescheduleAppointment(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>

            <h3>Propose New Consultation Time</h3>
            <p className="text-muted" style={{ marginBottom: "20px", fontSize: "0.88rem" }}>
              Currently requested slot was <strong>{rescheduleAppointment.date} at {rescheduleAppointment.time}</strong>. Propose a new date & time for the patient to confirm.
            </p>

            <form onSubmit={handleRescheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Proposed Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={suggestDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSuggestDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Time Slot</label>
                <select
                  className="form-control"
                  required
                  value={suggestTime}
                  onChange={(e) => setSuggestTime(e.target.value)}
                >
                  <option value="">-- Select Time Slot --</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRescheduleAppointment(null)}
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
                      <span className="spinner"></span> Sending...
                    </>
                  ) : (
                    "Send Reschedule Proposal"
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
