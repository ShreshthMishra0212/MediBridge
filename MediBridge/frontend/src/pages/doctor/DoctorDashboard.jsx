import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doctorApi } from "../../api/services";
import {
  Calendar,
  FileText,
  ClipboardList,
  CheckCircle,
  Video,
  BrainCircuit,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";

export const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      const [apptsRes, prescRes, ptsRes] = await Promise.all([
        doctorApi.getAppointments(),
        doctorApi.getPrescriptions().catch(() => ({ prescriptions: [] })),
        doctorApi.getMyPatients().catch(() => ({ patients: [] })),
      ]);
      setAppointments(apptsRes.appointments || []);
      setPrescriptions(prescRes.prescriptions || []);
      setPatients(ptsRes.patients || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load doctor dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading clinical workspace metrics...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Metrics Row */}
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
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Pending Requests</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="stats-num">{prescriptions.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Prescriptions Issued</div>
          </div>
        </div>

        <div className="card stats-card">
          <div className="stats-icon" style={{ backgroundColor: "hsl(280, 85%, 95%)", color: "hsl(280, 80%, 50%)" }}>
            <User size={24} />
          </div>
          <div>
            <div className="stats-num">{patients.length}</div>
            <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Authorized Patients</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", marginBottom: "40px" }}>
        {/* Today's Schedule */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-header">
            <h3>Active Consultations Schedule</h3>
            <Link to="/doctor/appointments" className="badge badge-confirmed" style={{ textTransform: "none" }}>Full Studio</Link>
          </div>
          <div className="table-container">
            {confirmedSchedule.length === 0 ? (
              <p style={{ padding: "40px", textAlign: "center" }} className="text-muted">No confirmed consultations on schedule today.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedSchedule.slice(0, 5).map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 700 }}>Patient: {app.patient_id.substring(0, 8)}...</td>
                      <td>
                        <div>{app.date}</div>
                        <small className="text-muted">{app.time}</small>
                      </td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        <Link to="/doctor/appointments" className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.78rem", width: "auto" }}>
                          Consult / Prescribe
                        </Link>
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
            <h4>Quick Clinical Actions</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
              <Link to="/doctor/requests" className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <ClipboardList size={16} />
                <span>Pending Requests ({pendingRequests.length})</span>
              </Link>
              <Link to="/doctor/ai-briefer" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <BrainCircuit size={16} />
                <span>AI Patient Briefer</span>
              </Link>
              <Link to="/doctor/prescriptions" className="btn btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <FileText size={16} />
                <span>Prescriptions Archive</span>
              </Link>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: "var(--secondary-light)", borderColor: "hsla(160, 80%, 40%, 0.15)" }}>
            <h5 style={{ color: "hsl(160, 80%, 25%)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={16} /> Google Meet Integration
            </h5>
            <p style={{ fontSize: "0.82rem", color: "var(--text-dark)", margin: 0, lineHeight: 1.5 }}>
              Generate secure Google Meet telehealth rooms for your confirmed consultation slots with 1-click in the Today's Schedule panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
