import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
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
  Printer,
  ShieldCheck,
} from "lucide-react";

export const PatientPrescriptions = () => {
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
      const response = await patientApi.getPrescriptions();
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
      let blob;
      let filename;
      if (fileType === "pdf") {
        blob = await patientApi.downloadPrescriptionPdf(prescriptionId);
        filename = `prescription-${prescriptionId}.pdf`;
      } else {
        blob = await patientApi.downloadPrescriptionDocx(prescriptionId);
        filename = `prescription-${prescriptionId}.docx`;
      }
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
      return `डॉक्टर ${p.doctor_name || ""} का डिजिटल पर्चा। रोग निदान: ${p.diagnosis || ""}। निर्धारित दवाइयाँ: ${meds}। विशेष सलाह: ${p.advice || "चिकित्सक के निर्देशानुसार दवा लें"}। अगली जांच: ${p.follow_up_date || "आवश्यकतानुसार"}`;
    }
    return `Prescription issued by Doctor ${p.doctor_name || ""}. Diagnosis: ${p.diagnosis || ""}. Prescribed Medicines: ${meds}. Advice: ${p.advice || "Take as directed"}. Follow up: ${p.follow_up_date || "As needed"}`;
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.doctor_name && p.doctor_name.toLowerCase().includes(q)) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q)) ||
      (p.date && p.date.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading your prescription records...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>My Prescriptions & Medication Archive</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Access official doctor prescriptions, listen in Hindi/English, and download PDF or Word DOCX copies
            </p>
          </div>
          <div className="search-wrapper" style={{ minWidth: "260px" }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              style={{ padding: "8px 14px 8px 40px", fontSize: "0.85rem" }}
              placeholder="Search by doctor or diagnosis..."
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
              <p>No prescriptions found matching your records.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor / Clinic</th>
                  <th>Diagnosis</th>
                  <th>Prescribed Date</th>
                  <th>Actions & Downloads</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>Dr. {p.doctor_name}</div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                        {p.specialization || "Specialist Consultant"}
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

      {/* Prescription Detail & Digital Rx Modal */}
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
            {/* Header Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--primary)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  Rx
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--primary)" }}>MediBridge Digital Prescription</h3>
                  <small className="text-muted">Doc ID: {selectedPrescription.id}</small>
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

            {/* Doctor and Patient Meta Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem" }}>
              <div>
                <strong className="text-muted" style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>Consulting Doctor</strong>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Dr. {selectedPrescription.doctor_name}</div>
                <div className="text-muted">{selectedPrescription.specialization || "Physician"}</div>
              </div>
              <div>
                <strong className="text-muted" style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>Prescription Date</strong>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{selectedPrescription.date}</div>
                <div className="text-muted">Follow-up: {selectedPrescription.follow_up_date || "As advised"}</div>
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: "16px" }}>
              <strong className="text-muted" style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>
                {modalLang === "hi" ? "रोग निदान (Clinical Diagnosis)" : "Clinical Diagnosis"}
              </strong>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                {selectedPrescription.diagnosis}
              </div>
            </div>

            {/* Medicines Timetable */}
            {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <strong className="text-muted" style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>
                  {modalLang === "hi" ? "दवाइयों का विवरण और समय (Medications Timetable)" : "Prescribed Medications"}
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {selectedPrescription.medicines.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        borderLeft: "4px solid var(--primary)",
                      }}
                    >
                      {typeof m === "object" ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{m.name}</span>
                            <span className="badge badge-confirmed" style={{ fontSize: "0.72rem" }}>
                              {m.dosage || "Standard Dose"}
                            </span>
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                            Frequency: <strong>{m.frequency || "Daily"}</strong> | Duration: <strong>{m.duration || "5 Days"}</strong>
                          </div>
                          {m.instructions && (
                            <div style={{ fontSize: "0.8rem", color: "hsl(var(--hue), 85%, 40%)", marginTop: "4px" }}>
                              💡 Instructions: {m.instructions}
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

            {/* Advice */}
            {selectedPrescription.advice && (
              <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#fffbeb", borderRadius: "8px", border: "1px solid #fef3c7" }}>
                <strong style={{ textTransform: "uppercase", fontSize: "0.75rem", color: "#92400e" }}>
                  {modalLang === "hi" ? "चिकित्सकीय निर्देश (Special Advice)" : "Special Clinical Advice"}
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#78350f" }}>{selectedPrescription.advice}</p>
              </div>
            )}

            {/* Doctor Signature Stamp */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px", paddingTop: "14px", borderTop: "1px dashed var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <ShieldCheck size={28} className="text-primary" style={{ margin: "0 auto 4px" }} />
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Dr. {selectedPrescription.doctor_name}</div>
                <small className="text-muted">Digitally Verified MediBridge Physician</small>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => handleDownload(selectedPrescription.id, "pdf")}
                disabled={downloading === `${selectedPrescription.id}-pdf`}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => {
                  setSelectedPrescription(null);
                  stop();
                }}
                className="btn btn-outline"
                style={{ width: "auto", padding: "8px 16px" }}
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
