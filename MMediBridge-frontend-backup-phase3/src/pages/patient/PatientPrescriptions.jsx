import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import { FileText, Download } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const PatientPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const response = await patientApi.getPrescriptions();
        setPrescriptions(response.prescriptions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch prescriptions archive.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card table-card">
        <div className="table-header">
          <h3>Prescriptions & Diagnostics Documents</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            View prescriptions written by your consulting specialist. PDF and DOCX files can be downloaded directly.
          </p>
        </div>
        <div className="table-container">
          {prescriptions.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <FileText size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>No prescriptions generated on your profile yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Consultant</th>
                  <th>Diagnosis</th>
                  <th>Prescribed Date</th>
                  <th>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.doctor_name}</td>
                    <td>{p.diagnosis}</td>
                    <td>{p.date}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <a
                          href={`${API_BASE_URL}/api/patients/prescriptions/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: "8px 12px", width: "auto", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Download size={14} /> PDF
                        </a>
                        <a
                          href={`${API_BASE_URL}/api/patients/prescriptions/${p.id}/docx`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: "8px 12px", width: "auto", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Download size={14} /> DOCX
                        </a>
                      </div>
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
