import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientApi } from "../../api/services";
import {
  Calendar,
  FileText,
  Activity,
  Video,
  ScanLine,
  BrainCircuit,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";

export const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, prescRes, docsRes] = await Promise.all([
          patientApi.getAppointments(),
          patientApi.getPrescriptions(),
          patientApi.getMedicalDocuments().catch(() => ({ medical_documents: [] })),
        ]);
        setAppointments(apptsRes.appointments || []);
        setPrescriptions(prescRes.prescriptions || []);
        setDocuments(docsRes.medical_documents || []);
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

  const nextConfirmedAppointment = appointments.find(
    (app) => app.status === "Confirmed"
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
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading your patient dashboard summary...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Hero Welcome & Spotlight */}
      {nextConfirmedAppointment && (
        <div
          className="card"
          style={{
            marginBottom: "30px",
            background: "linear-gradient(135deg, hsl(var(--hue), 85%, 48%), hsl(var(--hue), 85%, 38%))",
            color: "white",
            border: "none",
            boxShadow: "0 12px 30px rgba(0, 102, 204, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span className="badge" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "white", marginBottom: "8px", textTransform: "uppercase" }}>
                Next Confirmed Consultation
              </span>
              <h2 style={{ margin: "4px 0 6px", fontSize: "1.4rem" }}>Dr. {nextConfirmedAppointment.doctorName}</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: "0.9rem" }}>
                {nextConfirmedAppointment.specialist || "General Physician"} • {nextConfirmedAppointment.date} at {nextConfirmedAppointment.time}
              </p>
            </div>
            <div>
              {nextConfirmedAppointment.join_url ? (
                <a
                  href={nextConfirmedAppointment.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ backgroundColor: "white", color: "var(--primary)", fontWeight: 700, padding: "12px 24px", width: "auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Video size={18} /> Join Video Consultation
                </a>
              ) : (
                <Link
                  to="/patient/appointments"
                  className="btn"
                  style={{ backgroundColor: "white", color: "var(--primary)", fontWeight: 700, padding: "12px 20px", width: "auto" }}
                >
                  View Details
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
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
          <div className="stats-icon" style={{ backgroundColor: "hsl(280, 85%, 95%)", color: "hsl(280, 80%, 50%)" }}>
            <FolderOpen size={24} />
          </div>
          <div>
            <div className="stats-num">{documents.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Lab Documents</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--warning-light)", color: "var(--warning)" }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="stats-num" style={{ fontSize: "1.2rem", color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
              Online
            </div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Groq AI Triage Active</div>
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
              <p style={{ padding: "40px", textAlign: "center" }} className="text-muted">No upcoming consultations booked.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialty</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.slice(0, 5).map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 700 }}>{app.doctorName}</td>
                      <td>{app.specialist || "General"}</td>
                      <td>
                        <div>{app.date}</div>
                        <small className="text-muted">{app.time}</small>
                      </td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        {app.status === "Confirmed" && app.join_url ? (
                          <a href={app.join_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.78rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Video size={13} /> Join
                          </a>
                        ) : (
                          <Link to="/patient/appointments" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.78rem", width: "auto" }}>
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

        {/* Quick Operations Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h4>Quick Health Actions</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
              <Link to="/patient/doctors" className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <BrainCircuit size={16} />
                <span>AI Doctor Finder</span>
              </Link>
              <Link to="/patient/ocr" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <ScanLine size={16} />
                <span>Medicine OCR & Salts</span>
              </Link>
              <Link to="/patient/ai-brief" className="btn btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Sparkles size={16} />
                <span>AI Health Briefing</span>
              </Link>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: "var(--primary-light)", borderColor: "hsla(var(--hue), 85%, 55%, 0.15)" }}>
            <h5 style={{ color: "var(--primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={16} /> 24/7 AI Health Companion
            </h5>
            <p style={{ fontSize: "0.82rem", color: "var(--text-dark)", margin: 0, lineHeight: 1.5 }}>
              Use the floating <strong>MediBot</strong> button at the bottom-right for instant medical query assistance in Hindi or English anytime!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
