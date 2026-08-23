import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doctorApi } from "../../api/services";
import { Calendar, FileText, ClipboardList, CheckCircle, Video } from "lucide-react";

export const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSchedule = async () => {
    try {
      const response = await doctorApi.getAppointments();
      setAppointments(response.appointments || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load doctor dashboard schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const pendingRequests = appointments.filter((app) => app.status === "Pending");
  const confirmedSchedule = appointments.filter((app) => app.status === "Confirmed");

  const getStatusBadge = (status) => {
    switch (status) {
      case "Confirmed":
        return <span className="badge badge-confirmed">Confirmed</span>;
      case "Pending":
        return <span className="badge badge-pending">Pending Request</span>;
      case "Reschedule Proposed":
        return <span className="badge badge-proposed">Rescheduled</span>;
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
        <p>Loading clinical schedules...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid">
        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stats-num">{confirmedSchedule.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Confirmed Consultations</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--warning-light)", color: "var(--warning)" }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="stats-num">{pendingRequests.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Pending Patient Requests</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stats-num">{appointments.filter(a => a.status === "Completed").length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Completed Cases</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", marginBottom: "40px" }}>
        {/* Today's Schedule */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-header">
            <h3>Active Clinical Consultations</h3>
            <Link to="/doctor/appointments" className="badge badge-pending" style={{ textTransform: "none" }}>View Full Schedule</Link>
          </div>
          <div className="table-container">
            {confirmedSchedule.length === 0 ? (
              <p style={{ padding: "30px", textAlign: "center" }} className="text-muted">No confirmed consultations on schedule.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Status</th>
                    <th>Clinical Action</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedSchedule.slice(0, 5).map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 600 }}>Patient ID: {app.patient_id.substring(0, 8)}...</td>
                      <td>{app.date}</td>
                      <td>{app.time}</td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        <Link to={`/doctor/appointments`} className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}>
                          Consult
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h4>Quick Actions</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <Link to="/doctor/requests" className="btn btn-primary" style={{ textAlign: "center" }}>
                Pending Requests ({pendingRequests.length})
              </Link>
              <Link to="/doctor/profile" className="btn btn-secondary" style={{ textAlign: "center" }}>
                Update Clinical Bio
              </Link>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: "var(--secondary-light)", borderColor: "hsla(160, 80%, 40%, 0.1)" }}>
            <h5 style={{ color: "var(--secondary)", marginBottom: "8px" }}>✦ Google Meet Connection</h5>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dark)" }}>
              Ensure your calendar token files (`token.json`, `credential.json`) are configured in the backend so video generation works seamlessly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
