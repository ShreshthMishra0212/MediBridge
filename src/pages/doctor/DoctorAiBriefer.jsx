import { useState, useEffect } from "react";
import { doctorApi } from "../../api/services";
import { useSpeech } from "../../hooks/useSpeech";
import {
  BrainCircuit,
  User,
  FileText,
  AlertTriangle,
  Volume2,
  VolumeX,
  Languages,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";

const SECTION_LABELS = {
  patient_summary: { en: "Patient History Summary", hi: "रोगी इतिहास सारांश" },
  previous_conditions: { en: "Previous Conditions / Complaints", hi: "पिछली स्थितियाँ / शिकायतें" },
  previous_prescriptions: { en: "Previous Prescriptions", hi: "पिछले प्रिस्क्रिप्शन" },
  investigations: { en: "Investigations / Reports", hi: "जाँच / रिपोर्ट" },
  important_observations: { en: "Important Observations", hi: "महत्वपूर्ण अवलोकन" },
  key_points: { en: "Key Points for Doctor", hi: "डॉक्टर के लिए मुख्य बिंदु" },
  timeline: { en: "Medical Timeline", hi: "चिकित्सा समयरेखा" },
};

const SECTION_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--warning)",
  "var(--danger)",
  "purple",
  "teal",
  "var(--primary)",
];

export const DoctorAiBriefer = () => {
  // Patient selection
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Patient history
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // AI Brief
  const [brief, setBrief] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [patientName, setPatientName] = useState("");
  const [generating, setGenerating] = useState(false);

  // Language
  const [lang, setLang] = useState("en");

  // Errors
  const [error, setError] = useState("");

  // TTS
  const { toggle, speaking, currentLang, stop } = useSpeech();

  // --------------------------------------------------------
  // FETCH AUTHORIZED PATIENTS
  // --------------------------------------------------------

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await doctorApi.getMyPatients();
        setPatients(response.patients || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load patient list.");
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // --------------------------------------------------------
  // FETCH PATIENT HISTORY WHEN SELECTED
  // --------------------------------------------------------

  useEffect(() => {
    if (!selectedPatientId) {
      setHistory(null);
      setBrief(null);
      setError("");
      stop();
      return;
    }

    const fetchHistory = async () => {
      setLoadingHistory(true);
      setBrief(null);
      setError("");
      stop();

      try {
        const response = await doctorApi.getPatientHistory(selectedPatientId);
        setHistory(response);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "Failed to load patient history.");
        setHistory(null);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedPatientId]);

  // --------------------------------------------------------
  // GENERATE AI BRIEF
  // --------------------------------------------------------

  const handleGenerateBrief = async () => {
    if (!selectedPatientId) return;
    setGenerating(true);
    setError("");
    stop();

    try {
      const response = await doctorApi.generateAiBrief(selectedPatientId);
      setBrief(response.brief);
      setDisclaimer(response.disclaimer || "");
      setPatientName(response.patient_name || "");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Unable to generate the AI brief right now. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // --------------------------------------------------------
  // BUILD FULL BRIEF TEXT FOR TTS
  // --------------------------------------------------------

  const getBriefFullText = (language) => {
    if (!brief || !brief[language === "en" ? "english" : "hindi"]) return "";
    const data = brief[language === "en" ? "english" : "hindi"];
    const sectionKeys = Object.keys(SECTION_LABELS);
    return sectionKeys
      .map((key) => {
        const label = SECTION_LABELS[key][language === "en" ? "en" : "hi"];
        const value = data[key] || "";
        return value ? `${label}. ${value}` : "";
      })
      .filter(Boolean)
      .join(". ");
  };

  // --------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------

  if (loadingPatients) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading authorized patient list...</p>
      </div>
    );
  }

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <BrainCircuit size={24} className="text-primary" />
          <h3 style={{ margin: 0 }}>AI Medical Briefer</h3>
        </div>
        <p className="text-muted" style={{ margin: 0 }}>
          Select an authorized patient to review their medical history and generate a structured AI clinical brief in English and Hindi.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "30px" }}>
        {/* LEFT PANEL — Patient Selection & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Patient Selector */}
          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={18} /> Select Patient
            </h4>

            {patients.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "12px" }}>
                No patients found. You need appointments with patients to access this feature.
              </p>
            ) : (
              <select
                className="form-control"
                style={{ marginTop: "12px" }}
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">-- Select a patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Patient History Preview */}
          {history && (
            <div className="card">
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setHistoryExpanded(!historyExpanded)}
              >
                <h4 style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  <ClipboardList size={18} /> Medical Records
                </h4>
                {historyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {historyExpanded && (
                <div style={{ marginTop: "16px" }}>
                  {/* Patient Info */}
                  {history.patient && history.patient.name && (
                    <div style={{ marginBottom: "16px", fontSize: "0.85rem" }}>
                      <p style={{ margin: "2px 0" }}><strong>Name:</strong> {history.patient.name}</p>
                      {history.patient.age && <p style={{ margin: "2px 0" }}><strong>Age:</strong> {history.patient.age}</p>}
                      {history.patient.gender && <p style={{ margin: "2px 0" }}><strong>Gender:</strong> {history.patient.gender}</p>}
                    </div>
                  )}

                  {/* Prescriptions Summary */}
                  <h5 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>Prescriptions ({history.prescriptions?.length || 0})</h5>
                  {(!history.prescriptions || history.prescriptions.length === 0) ? (
                    <p className="text-muted" style={{ fontSize: "0.8rem" }}>No prescriptions available.</p>
                  ) : (
                    history.prescriptions.map((rx, i) => (
                      <div key={rx.id || i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.8rem" }}>
                        <strong>{rx.diagnosis}</strong>
                        <span className="text-muted"> — {rx.date || "N/A"}</span>
                        <div className="text-muted" style={{ marginTop: "2px" }}>By {rx.doctor_name || "Doctor"}</div>
                      </div>
                    ))
                  )}

                  {/* Appointments Summary */}
                  <h5 style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "16px", marginBottom: "8px" }}>
                    Appointments ({history.appointments?.length || 0})
                  </h5>
                  {(!history.appointments || history.appointments.length === 0) ? (
                    <p className="text-muted" style={{ fontSize: "0.8rem" }}>No appointment history.</p>
                  ) : (
                    history.appointments.map((a, i) => (
                      <div key={i} style={{ padding: "4px 0", fontSize: "0.8rem" }}>
                        {a.date} {a.time} — <span className="text-muted">{a.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Generate Brief Button */}
              <button
                onClick={handleGenerateBrief}
                className="btn btn-primary"
                style={{ marginTop: "16px", width: "100%" }}
                disabled={generating}
              >
                {generating ? (
                  <><span className="spinner"></span> Analyzing...</>
                ) : brief ? (
                  <><BrainCircuit size={16} /> Regenerate Brief</>
                ) : (
                  <><BrainCircuit size={16} /> Generate AI Brief</>
                )}
              </button>
            </div>
          )}

          {loadingHistory && (
            <div className="card" style={{ textAlign: "center", padding: "30px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "12px" }}>Loading medical history...</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — AI Brief Display */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <BrainCircuit size={20} className="text-primary" />
              AI Clinical Brief
              {patientName && <span className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}> — {patientName}</span>}
            </h4>

            {brief && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => { setLang(lang === "en" ? "hi" : "en"); stop(); }}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Languages size={14} />
                  {lang === "en" ? "हिंदी" : "English"}
                </button>
                <button
                  onClick={() => toggle(getBriefFullText(lang), lang)}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {speaking && currentLang === lang ? (
                    <><VolumeX size={14} /> Stop</>
                  ) : (
                    <><Volume2 size={14} /> {lang === "hi" ? "सुनें" : "Listen"}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Generating State */}
          {generating && (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "16px" }}>Analyzing medical history with Google Gemini...</p>
            </div>
          )}

          {/* Empty State */}
          {!generating && !brief && (
            <div style={{ textAlign: "center", padding: "60px" }} className="text-muted">
              <BrainCircuit size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>Select a patient and generate a brief to see the AI summary here.</p>
            </div>
          )}

          {/* Brief Content */}
          {brief && !generating && (
            <div>
              {/* Disclaimer */}
              {disclaimer && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px", backgroundColor: "hsl(45, 100%, 96%)", borderRadius: "8px", border: "1px solid hsl(45, 80%, 80%)", marginBottom: "20px", fontSize: "0.8rem" }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px", color: "hsl(45, 80%, 40%)" }} />
                  <span style={{ color: "hsl(45, 50%, 30%)" }}>{disclaimer}</span>
                </div>
              )}

              {/* Brief Sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {Object.keys(SECTION_LABELS).map((key, idx) => {
                  const langKey = lang === "en" ? "english" : "hindi";
                  const value = brief[langKey]?.[key];
                  if (!value) return null;
                  return (
                    <div
                      key={key}
                      className="card ai-card"
                      style={{ borderLeftColor: SECTION_COLORS[idx % SECTION_COLORS.length] }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <small className="text-muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {SECTION_LABELS[key][lang === "en" ? "en" : "hi"]}
                        </small>
                        <button
                          onClick={() => toggle(value, lang)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-muted)" }}
                          title={lang === "hi" ? "सुनें" : "Listen"}
                        >
                          {speaking && currentLang === lang ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>
                      <p style={{ marginTop: "8px", fontSize: "0.9rem", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
