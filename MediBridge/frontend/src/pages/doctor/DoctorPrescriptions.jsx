import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { useSpeech } from "../../hooks/useSpeech";
import {
  FileText,
  Download,
  Eye,
  Volume2,
  VolumeX,
  Languages,
  X,
  Search,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [modalLang, setModalLang] = useState("en");
  const [search, setSearch] = useState("");

  const { toggle, speaking, currentLang, stop } = useSpeech();

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

  const handleDownload = async (prescriptionId, fileType) => {
    const key = `${prescriptionId}-${fileType}`;
    setDownloading(key);
    setError("");
    try {
      const blob = await doctorApi.downloadPrescriptionFile(prescriptionId, fileType);
      const filename = `prescription-${prescriptionId}.${fileType}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(`Failed to download ${fileType.toUpperCase()} file.`);
    } finally {
      setDownloading("");
    }
  };

  const getPrescriptionSpeechText = (p, lang) => {
    if (!p) return "";
    const meds = Array.isArray(p.medicines)
      ? p.medicines
          .map((m) =>
            typeof m === "object"
              ? `${m.name || ""} dosage ${m.dosage || ""} frequency ${m.frequency || ""} duration ${m.duration || ""}`
              : m
          )
          .join(", ")
      : "";

    if (lang === "hi") {
      return `रोगी ${p.patient_name || ""} का चिकित्सा पर्चा। निदान: ${p.diagnosis || ""}। निर्धारित दवाइयाँ: ${meds}। सलाह: ${p.advice || ""}। अगली जांच: ${p.follow_up_date || ""}`;
    }
    return `Prescription issued for patient ${p.patient_name || ""}. Diagnosis: ${p.diagnosis || ""}. Prescribed Medicines: ${meds}. Special advice: ${p.advice || ""}. Follow up: ${p.follow_up_date || ""}`;
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.patient_name && p.patient_name.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q)) ||
      (p.date && p.date.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading clinical prescriptions archive...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Written Prescriptions & Clinical Records</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Archive of all prescriptions compiled via ReportLab PDF and Word DOCX engines
            </p>
          </div>
          <div className="search-wrapper" style={{ minWidth: "260px" }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              style={{ padding: "8px 14px 8px 40px", fontSize: "0.85rem" }}
              placeholder="Search by patient or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card table-card">
        <div className="table-container">
          {filteredPrescriptions.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center" }} className="text-muted">
              <FileText size={48} style={{ marginBottom: "14px", strokeWidth: 1.5 }} />
              <p>You have not compiled any prescriptions yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Clinical Diagnosis</th>
                  <th>Issued Date</th>
                  <th>Actions & Downloads</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.patient_name}</div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                        ID: <code>{p.patient_id ? p.patient_id.substring(0, 8) : "N/A"}...</code>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-confirmed" style={{ fontSize: "0.8rem", textTransform: "none" }}>
                        {p.diagnosis}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <Calendar size={14} className="text-muted" />
                        <span>{p.date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => {
                            setSelectedPrescription(p);
                            setModalLang("en");
                            stop();
                          }}
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", width: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Eye size={13} /> View Slip & Audio
                        </button>
                        <button
                          onClick={() => handleDownload(p.id, "pdf")}
                          disabled={downloading === `${p.id}-pdf`}
                          className="btn btn-secondary"
                          style={{ padding: "6px 10px", width: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          {downloading === `${p.id}-pdf` ? <span className="spinner"></span> : <Download size={13} />} PDF
                        </button>
                        <button
                          onClick={() => handleDownload(p.id, "docx")}
                          disabled={downloading === `${p.id}-docx`}
                          className="btn btn-outline"
                          style={{ padding: "6px 10px", width: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          {downloading === `${p.id}-docx` ? <span className="spinner"></span> : <Download size={13} />} DOCX
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

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
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
          <div className="card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative", backgroundColor: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--primary)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  Rx
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--primary)" }}>Prescription Record</h3>
                  <small className="text-muted">Patient: {selectedPrescription.patient_name} | Date: {selectedPrescription.date}</small>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  stop();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Audio & Translation Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--primary-light)", padding: "10px 14px", borderRadius: "8px", marginBottom: "18px" }}>
              <button
                onClick={() => {
                  setModalLang(modalLang === "en" ? "hi" : "en");
                  stop();
                }}
                className="btn btn-outline"
                style={{ width: "auto", padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Languages size={13} /> {modalLang === "en" ? "हिंदी में बदलें" : "Switch to English"}
              </button>

              <button
                onClick={() => toggle(getPrescriptionSpeechText(selectedPrescription, modalLang), modalLang)}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "5px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                {speaking && currentLang === modalLang ? (
                  <>
                    <VolumeX size={14} /> Stop Audio
                  </>
                ) : (
                  <>
                    <Volume2 size={14} /> {modalLang === "hi" ? "पर्चा सुनें" : "Listen Prescription"}
                  </>
                )}
              </button>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
              <div>
                <strong className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Diagnosis</strong>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "1.05rem", color: "var(--primary)" }}>{selectedPrescription.diagnosis}</p>
              </div>

              {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
                <div>
                  <strong className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Medications Prescribed</strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                    {selectedPrescription.medicines.map((m, idx) => (
                      <div key={idx} style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid var(--primary)" }}>
                        {typeof m === "object" ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontWeight: 700 }}>{m.name}</span>
                              <span className="badge badge-confirmed" style={{ fontSize: "0.72rem" }}>{m.dosage}</span>
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                              Freq: {m.frequency} | Duration: {m.duration}
                            </div>
                            {m.instructions && (
                              <div style={{ fontSize: "0.8rem", marginTop: "2px", color: "var(--primary)" }}>
                                Note: {m.instructions}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontWeight: 600 }}>{m}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPrescription.advice && (
                <div style={{ padding: "10px 12px", backgroundColor: "#fffbeb", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#92400e" }}>Clinical Advice</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#78350f" }}>{selectedPrescription.advice}</p>
                </div>
              )}

              {selectedPrescription.follow_up_date && (
                <div>
                  <strong className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Follow-Up Date</strong>
                  <p style={{ margin: "4px 0 0" }}>{selectedPrescription.follow_up_date}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <button
                onClick={() => handleDownload(selectedPrescription.id, "pdf")}
                disabled={downloading === `${selectedPrescription.id}-pdf`}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "7px 14px" }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  stop();
                }}
                className="btn btn-outline"
                style={{ width: "auto", padding: "7px 14px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
