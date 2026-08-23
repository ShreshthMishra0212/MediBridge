import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import { Calendar, Video, CheckCircle, XCircle } from "lucide-react";

export const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchAppointments = async () => {
    try {
      const response = await patientApi.getAppointments();
      setAppointments(response.appointments || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch appointment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleAcceptReschedule = async (appointmentId) => {
    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await patientApi.acceptReschedule(appointmentId);
      setActionSuccess("Reschedule slot accepted successfully!");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      setError("Failed to accept rescheduled time slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReschedule = async (appointmentId) => {
    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await patientApi.rejectReschedule(appointmentId);
      setActionSuccess("Proposed reschedule slot rejected and appointment cancelled.");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      setError("Failed to reject rescheduled time slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Confirmed":
        return <span className="badge badge-confirmed">Confirmed</span>;
      case "Pending":
        return <span className="badge badge-pending">Pending</span>;
      case "Reschedule Proposed":
        return <span className="badge badge-proposed">Reschedule Proposed</span>;
      case "Cancelled":
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge badge-pending">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading your consultations history...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

      <div className="card table-card">
        <div className="table-header">
          <h3>Consultation Booking History</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Accept reschedule proposals, cancel slots, or launch telemedicine consults.
          </p>
        </div>
        <div className="table-container">
          {appointments.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <Calendar size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>You have not booked any consultations yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Actions / Meet Link</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>{app.doctorName}</td>
                    <td>{app.specialist || "General Physician"}</td>
                    <td>
                      {app.status === "Reschedule Proposed" ? (
                        <div style={{ color: "var(--primary)", fontWeight: 600 }}>
                          Proposed: {app.suggested_date}
                        </div>
                      ) : (
                        app.date
                      )}
                    </td>
                    <td>
                      {app.status === "Reschedule Proposed" ? (
                        <div style={{ color: "var(--primary)", fontWeight: 600 }}>
                          Proposed: {app.suggested_time}
                        </div>
                      ) : (
                        app.time
                      )}
                    </td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      {app.status === "Reschedule Proposed" ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleAcceptReschedule(app.id)}
                            disabled={actionLoading}
                            className="btn btn-secondary"
                            style={{ padding: "8px 12px", width: "auto", fontSize: "0.8rem" }}
                          >
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleRejectReschedule(app.id)}
                            disabled={actionLoading}
                            className="btn btn-danger"
                            style={{ padding: "8px 12px", width: "auto", fontSize: "0.8rem" }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : app.status === "Confirmed" && app.join_url ? (
                        <a
                          href={app.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}
                        >
                          <Video size={14} /> Join Call
                        </a>
                      ) : app.status === "Cancelled" ? (
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Cancelled</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Waiting on Doctor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
