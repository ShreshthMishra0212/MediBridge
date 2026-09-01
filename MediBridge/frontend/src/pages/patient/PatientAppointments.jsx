import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientApi, directApi } from "../../api/services";
import {
  Calendar,
  Video,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
  Sparkles,
} from "lucide-react";

export const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  // Status Filter Tab
  const [filterTab, setFilterTab] = useState("all"); // 'all', 'confirmed', 'pending', 'reschedule', 'cancelled'

  // Pre-call readiness modal
  const [showPrecheck, setShowPrecheck] = useState(null);

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
      setActionSuccess("Rescheduled slot accepted! Appointment is now confirmed.");
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
      setActionSuccess("Proposed reschedule rejected and appointment cancelled.");
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
        return <span className="badge badge-pending">Pending Doctor Review</span>;
      case "Reschedule Proposed":
        return <span className="badge badge-proposed">Reschedule Proposed</span>;
      case "Cancelled":
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge badge-pending">{status}</span>;
    }
  };

  // Filter appointments according to active tab
  const filteredAppointments = appointments.filter((app) => {
    if (filterTab === "all") return true;
    if (filterTab === "confirmed") return app.status === "Confirmed";
    if (filterTab === "pending") return app.status === "Pending";
    if (filterTab === "reschedule") return app.status === "Reschedule Proposed";
    if (filterTab === "cancelled") return app.status === "Cancelled";
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading your consultations schedule...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>My Consultations & Telemedicine Schedule</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Join Google Meet video rooms, accept reschedule proposals, or book new doctor slots
            </p>
          </div>
          <Link to="/patient/doctors" className="btn btn-primary" style={{ width: "auto", padding: "10px 18px", fontSize: "0.85rem" }}>
            + Book New Doctor
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

      {/* Tabs */}
      <div className="auth-tabs" style={{ marginBottom: "20px" }}>
        <button
          className={`auth-tab ${filterTab === "all" ? "active" : ""}`}
          onClick={() => setFilterTab("all")}
        >
          All ({appointments.length})
        </button>
        <button
          className={`auth-tab ${filterTab === "confirmed" ? "active" : ""}`}
          onClick={() => setFilterTab("confirmed")}
        >
          Confirmed ({appointments.filter(a => a.status === "Confirmed").length})
        </button>
        <button
          className={`auth-tab ${filterTab === "pending" ? "active" : ""}`}
          onClick={() => setFilterTab("pending")}
        >
          Pending ({appointments.filter(a => a.status === "Pending").length})
        </button>
        <button
          className={`auth-tab ${filterTab === "reschedule" ? "active" : ""}`}
          onClick={() => setFilterTab("reschedule")}
        >
          Rescheduled ({appointments.filter(a => a.status === "Reschedule Proposed").length})
        </button>
        <button
          className={`auth-tab ${filterTab === "cancelled" ? "active" : ""}`}
          onClick={() => setFilterTab("cancelled")}
        >
          Cancelled ({appointments.filter(a => a.status === "Cancelled").length})
        </button>
      </div>

      {/* Appointments List */}
      <div className="card table-card">
        <div className="table-container">
          {filteredAppointments.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center" }} className="text-muted">
              <Calendar size={48} style={{ marginBottom: "14px", strokeWidth: 1.5 }} />
              <p>No appointments in this category.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor & Specialty</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Telehealth / Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{app.doctorName}</div>
                      <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                        {app.specialist || "General Physician"} • {app.area || "MediBridge Clinic"}
                      </div>
                    </td>

                    <td>
                      {app.status === "Reschedule Proposed" ? (
                        <div>
                          <div style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            Original: {app.date} at {app.time}
                          </div>
                          <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.9rem", marginTop: "2px" }}>
                            Proposed: {app.suggested_date} at {app.suggested_time}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600 }}>{app.date}</div>
                          <div className="text-muted" style={{ fontSize: "0.8rem" }}>{app.time}</div>
                        </div>
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
                            style={{ padding: "6px 12px", width: "auto", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Check size={14} /> Accept New Time
                          </button>
                          <button
                            onClick={() => handleRejectReschedule(app.id)}
                            disabled={actionLoading}
                            className="btn btn-danger"
                            style={{ padding: "6px 12px", width: "auto", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : app.status === "Confirmed" && app.join_url ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <a
                            href={app.join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ padding: "7px 14px", fontSize: "0.8rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <Video size={14} /> Join Google Meet
                          </a>
                          <button
                            onClick={() => setShowPrecheck(app)}
                            className="btn btn-outline"
                            style={{ padding: "7px 10px", width: "auto", fontSize: "0.75rem" }}
                            title="Pre-call Checklist"
                          >
                            Pre-check
                          </button>
                        </div>
                      ) : app.status === "Confirmed" ? (
                        <span className="text-muted" style={{ fontSize: "0.82rem" }}>Meet link will appear before slot</span>
                      ) : app.status === "Cancelled" ? (
                        <span className="text-muted" style={{ fontSize: "0.82rem" }}>Cancelled</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: "0.82rem" }}>Awaiting Doctor Confirmation</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pre-Call Readiness Modal */}
      {showPrecheck && (
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
              onClick={() => setShowPrecheck(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)" }}
            >
              &times;
            </button>

            <h3>Telemedicine Pre-Call Checklist</h3>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
              Consultation with <strong>{showPrecheck.doctorName}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                <CheckCircle size={16} className="text-primary" />
                <span>Ensure your camera and microphone permissions are enabled.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                <CheckCircle size={16} className="text-primary" />
                <span>Sit in a well-lit, quiet room for clear medical review.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                <CheckCircle size={16} className="text-primary" />
                <span>Keep your previous prescription or medicine boxes nearby.</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowPrecheck(null)}
              >
                Close
              </button>
              <a
                href={showPrecheck.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                onClick={() => setShowPrecheck(null)}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Video size={14} /> Proceed to Meet
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
