import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { useSpeech } from "../../hooks/useSpeech";
import { FileText, Download, Eye, Volume2, VolumeX, Languages, X } from "lucide-react";

export const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [modalLang, setModalLang] = useState("en");

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
      return `रोगी ${p.patient_name || ""} का पर्चा। रोग निदान: ${p.diagnosis || ""}। दवाइयाँ: ${meds}। सलाह: ${p.advice || ""}। अगला परामर्श: ${p.follow_up_date || ""}`;
    }
    return `Prescription for patient ${p.patient_name || ""}. Diagnosis: ${p.diagnosis || ""}. Medicines: ${meds}. Advice: ${p.advice || ""}. Follow up: ${p.follow_up_date || ""}`;
  };

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
            History of generated prescriptions. Listen in English or Hindi, and download PDF or DOCX files.
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.patient_name}</td>
                    <td>{p.diagnosis}</td>
                    <td>{p.date}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => {
                            setSelectedPrescription(p);
                            setModalLang("en");
                            stop();
                          }}
                          className="btn btn-primary"
                          style={{ padding: "6px 10px", width: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Eye size={13} /> View & Listen
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
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Prescription Details</h3>
                <small className="text-muted">Patient: {selectedPrescription.patient_name} | {selectedPrescription.date}</small>
              </div>
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  stop();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Language & TTS Header Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--primary-light)", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px" }}>
              <button
                onClick={() => {
                  setModalLang(modalLang === "en" ? "hi" : "en");
                  stop();
                }}
                className="btn btn-outline"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Languages size={14} /> {modalLang === "en" ? "हिंदी में देखें" : "View in English"}
              </button>
              <button
                onClick={() => toggle(getPrescriptionSpeechText(selectedPrescription, modalLang), modalLang)}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                {speaking && currentLang === modalLang ? (
                  <><VolumeX size={14} /> Stop Audio</>
                ) : (
                  <><Volume2 size={14} /> {modalLang === "hi" ? "पर्चा सुनें" : "Listen Prescription"}</>
                )}
              </button>
            </div>

            {/* Details Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
              <div>
                <strong className="text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                  {modalLang === "hi" ? "रोग निदान (Diagnosis)" : "Diagnosis"}
                </strong>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{selectedPrescription.diagnosis}</p>
              </div>

              {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
                <div>
                  <strong className="text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                    {modalLang === "hi" ? "निर्धारित दवाइयाँ (Medicines)" : "Prescribed Medicines"}
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                    {selectedPrescription.medicines.map((m, idx) => (
                      <div key={idx} style={{ padding: "8px 12px", backgroundColor: "var(--background-light, #f8f9fa)", borderRadius: "6px", borderLeft: "3px solid var(--primary)" }}>
                        {typeof m === "object" ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                              Dosage: {m.dosage || "N/A"} | Freq: {m.frequency || "N/A"} | Duration: {m.duration || "N/A"}
                            </div>
                            {m.instructions && (
                              <div style={{ fontSize: "0.8rem", marginTop: "2px", fontStyle: "italic" }}>
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
                <div>
                  <strong className="text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                    {modalLang === "hi" ? "चिकित्सा सलाह (Doctor Advice)" : "Doctor Advice"}
                  </strong>
                  <p style={{ margin: "4px 0 0" }}>{selectedPrescription.advice}</p>
                </div>
              )}

              {selectedPrescription.follow_up_date && (
                <div>
                  <strong className="text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                    {modalLang === "hi" ? "अगली मुलाक़ात (Follow-Up Date)" : "Follow-Up Date"}
                  </strong>
                  <p style={{ margin: "4px 0 0" }}>{selectedPrescription.follow_up_date}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  stop();
                }}
                className="btn btn-outline"
                style={{ width: "auto" }}
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

