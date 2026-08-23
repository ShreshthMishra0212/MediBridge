import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { FileText, Download } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPrescriptions = async () => {
    try {
      const response = await doctorApi.getPrescriptions();
      setPrescriptions(response.prescriptions || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch prescriptions archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading prescriptions archive...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card table-card">
        <div className="table-header">
          <h3>Written Prescriptions Archive</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            History of generated prescriptions. PDF and DOCX assets can be retrieved directly from the server.
          </p>
        </div>
        <div className="table-container">
          {prescriptions.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <FileText size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>You have not written any prescriptions yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Diagnosis</th>
                  <th>Prescribed Date</th>
                  <th>File Types</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.patient_name}</td>
                    <td>{p.diagnosis}</td>
                    <td>{p.date}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <a
                          href={`${API_BASE_URL}/api/doctors/prescriptions/${p.id}/file/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: "8px 12px", width: "auto", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Download size={14} /> PDF
                        </a>
                        <a
                          href={`${API_BASE_URL}/api/doctors/prescriptions/${p.id}/file/docx`}
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
