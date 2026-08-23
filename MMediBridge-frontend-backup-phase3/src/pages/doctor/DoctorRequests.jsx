import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { ClipboardList, CheckCircle, Clock } from "lucide-react";

export const DoctorRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Reschedule state
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [suggestDate, setSuggestDate] = useState("");
  const [suggestTime, setSuggestTime] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await doctorApi.getAppointments();
      // Filter pending requests
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
    try {
      await doctorApi.acceptAppointment(appointmentId);
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
    try {
      await doctorApi.suggestReschedule(rescheduleAppointment.id, suggestDate, suggestTime);
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
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading patient requests...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card table-card">
        <div className="table-header">
          <h3>Pending Appointment Bookings</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Accept incoming requests or propose alternative times. (Note: No doctor reject route is available).
          </p>
        </div>
        <div className="table-container">
          {requests.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <ClipboardList size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>No pending appointment requests inbox.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Requested Date</th>
                  <th>Requested Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600 }}>Patient ID: {req.patient_id.substring(0, 8)}...</td>
                    <td>{req.date}</td>
                    <td>{req.time}</td>
                    <td>
                      <span className="badge badge-pending">Pending Decision</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={actionLoading}
                          className="btn btn-secondary"
                          style={{ padding: "8px 14px", width: "auto", fontSize: "0.8rem" }}
                        >
                          <CheckCircle size={14} /> Accept
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleAppointment(req);
                            setSuggestDate("");
                            setSuggestTime("");
                          }}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: "8px 14px", width: "auto", fontSize: "0.8rem" }}
                        >
                          <Clock size={14} /> Reschedule
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
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", position: "relative" }}>
            <button 
              onClick={() => setRescheduleAppointment(null)}
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

            <h3>Suggest Reschedule Slot</h3>
            <p className="text-muted" style={{ marginBottom: "20px" }}>
              Enter an alternative date and time to propose to the patient.
            </p>

            <form onSubmit={handleRescheduleSubmit}>
              <div className="form-group">
                <label className="form-label">Proposed New Date</label>
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
                <label className="form-label">Proposed New Time</label>
                <select
                  className="form-control"
                  required
                  value={suggestTime}
                  onChange={(e) => setSuggestTime(e.target.value)}
                >
                  <option value="">Select Time</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
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
                  {actionLoading ? <span className="spinner"></span> : "Send Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
