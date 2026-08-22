import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientApi } from "../../api/services";
import { Calendar, FileText, Activity, Video } from "lucide-react";

export const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, prescRes] = await Promise.all([
          patientApi.getAppointments(),
          patientApi.getPrescriptions(),
        ]);
        setAppointments(apptsRes.appointments || []);
        setPrescriptions(prescRes.prescriptions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingAppointments = appointments.filter(
    (app) => app.status === "Pending" || app.status === "Confirmed" || app.status === "Reschedule Proposed"
  );

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
        <p>Loading your dashboard summary...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid">
        <div className="card stats-card">
          <div className="stats-icon">
            <Calendar size={24} />
          </div>
          <div>
            <div className="stats-num">{upcomingAppointments.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Active Appointments</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="stats-num">{prescriptions.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Prescriptions Received</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--warning-light)", color: "var(--warning)" }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="stats-num">Online</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>System Telehealth Status</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", marginBottom: "40px" }}>
        {/* Appointments Section */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-header">
            <h3>Upcoming Consultations</h3>
            <Link to="/patient/appointments" className="badge badge-confirmed" style={{ textTransform: "none" }}>View All</Link>
          </div>
          <div className="table-container">
            {upcomingAppointments.length === 0 ? (
              <p style={{ padding: "30px", textAlign: "center" }} className="text-muted">No upcoming consultations booked.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialty</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.slice(0, 5).map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 600 }}>{app.doctorName}</td>
                      <td>{app.specialist || "General"}</td>
                      <td>{app.date}</td>
                      <td>{app.time}</td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        {app.status === "Confirmed" && app.join_url ? (
                          <a href={app.join_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}>
                            <Video size={14} /> Join
                          </a>
                        ) : (
                          <Link to="/patient/appointments" className="btn btn-outline" style={{ padding: "8px 14px", fontSize: "0.8rem", width: "auto" }}>
                            Details
                          </Link>
                        )}
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
            <h4>Quick Operations</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <Link to="/patient/doctors" className="btn btn-primary" style={{ textAlign: "center" }}>
                Book Consultant
              </Link>
              <Link to="/patient/ocr" className="btn btn-secondary" style={{ textAlign: "center" }}>
                Scan Label (OCR)
              </Link>
              <Link to="/patient/ai-brief" className="btn btn-outline" style={{ textAlign: "center", display: "block" }}>
                AI Medical Briefing
              </Link>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: "var(--primary-light)", borderColor: "hsla(var(--hue), 85%, 55%, 0.1)" }}>
            <h5 style={{ color: "var(--primary)", marginBottom: "8px" }}>✦ AI Health Tips</h5>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dark)" }}>
              Ensure your prescription labels are clear and well-lit before uploading them to the OCR scanner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
