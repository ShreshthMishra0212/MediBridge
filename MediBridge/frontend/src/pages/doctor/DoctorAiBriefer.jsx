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
  Sparkles,
  Copy,
  Check,
  Calendar,
  Pill,
  Activity,
  ShieldCheck,
} from "lucide-react";

const SECTION_LABELS = {
  patient_summary: { en: "Patient Clinical Overview", hi: "रोगी इतिहास एवं समग्र विवरण" },
  previous_conditions: { en: "Documented Conditions & Symptoms", hi: "पिछली बीमारियाँ एवं लक्षण" },
  previous_prescriptions: { en: "Prior Prescriptions & Dosages", hi: "पिछले पर्चे एवं दवाइयाँ" },
  investigations: { en: "Lab Tests & Diagnostic Reports", hi: "जाँच रिपोर्ट एवं परीक्षण" },
  important_observations: { en: "Key Clinical Observations & Risks", hi: "महत्वपूर्ण अवलोकन एवं जोखिम" },
  key_points: { en: "Action Points for Consulting Doctor", hi: "डॉक्टर के लिए मुख्य कार्य बिंदु" },
  timeline: { en: "Chronological Medical Timeline", hi: "चिकित्सीय समयरेखा" },
};

export const DoctorAiBriefer = () => {
  // Patient selection
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Patient history
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  // AI Brief
  const [brief, setBrief] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [patientName, setPatientName] = useState("");
  const [generating, setGenerating] = useState(false);

  // Language & Copy Feedback
  const [lang, setLang] = useState("en");
  const [copiedKey, setCopiedKey] = useState("");

  // Errors
  const [error, setError] = useState("");

  // TTS
  const { toggle, speaking, currentLang, stop } = useSpeech();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await doctorApi.getMyPatients();
        setPatients(response.patients || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load authorized patient list.");
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

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
        setError(err.response?.data?.error || "Failed to load patient clinical history.");
        setHistory(null);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedPatientId]);

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
      setError(
        err.response?.data?.error ||
        "Unable to compile AI clinical brief. Ensure patient history or records are present."
      );
    } finally {
      setGenerating(false);
    }
  };

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

  const handleCopySection = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  if (loadingPatients) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading authorized patient panel...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1150px" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: "26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <BrainCircuit size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Doctor AI Medical Briefer</h3>
            <small className="text-muted">Synthesizes patient appointment logs, prior prescriptions, and uploaded lab scans into a structured 7-part clinical brief</small>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: "30px", alignItems: "start" }}>
        {/* LEFT PANEL — Patient Selector & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Patient Selector */}
          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 12px" }}>
              <User size={18} className="text-primary" />
              <span>Select Authorized Patient</span>
            </h4>

            {patients.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                No active patients found. Once patients book appointments with you, they will appear here.
              </p>
            ) : (
              <select
                className="form-control"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">-- Choose a patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id.substring(0, 6)}...)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* History Details Card */}
          {history && (
            <div className="card">
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: historyExpanded ? "1px solid var(--border)" : "none", paddingBottom: historyExpanded ? "12px" : 0 }}
                onClick={() => setHistoryExpanded(!historyExpanded)}
              >
                <h4 style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  <ClipboardList size={18} className="text-primary" />
                  <span>Clinical Records On File</span>
                </h4>
                {historyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {historyExpanded && (
                <div style={{ marginTop: "14px", fontSize: "0.85rem" }}>
                  {/* Patient Info */}
                  {history.patient && (
                    <div style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", marginBottom: "14px" }}>
                      <div><strong>Name:</strong> {history.patient.name || "Patient"}</div>
                      {history.patient.age && <div><strong>Age:</strong> {history.patient.age} Yrs</div>}
                      {history.patient.gender && <div><strong>Gender:</strong> {history.patient.gender}</div>}
                      {history.patient.phone && <div><strong>Phone:</strong> {history.patient.phone}</div>}
                    </div>
                  )}

                  {/* Prescriptions */}
                  <div style={{ marginBottom: "14px" }}>
                    <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Prior Prescriptions ({history.prescriptions?.length || 0})
                    </strong>
                    {(!history.prescriptions || history.prescriptions.length === 0) ? (
                      <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>No prescriptions yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                        {history.prescriptions.map((rx, idx) => (
                          <div key={rx.id || idx} style={{ padding: "6px 8px", borderLeft: "3px solid var(--primary)", backgroundColor: "#ffffff", border: "1px solid var(--border)", borderRadius: "4px" }}>
                            <div style={{ fontWeight: 600 }}>{rx.diagnosis}</div>
                            <small className="text-muted">{rx.date} • By Dr. {rx.doctor_name || "Doctor"}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Consultation History */}
                  <div>
                    <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Appointment Logs ({history.appointments?.length || 0})
                    </strong>
                    {(!history.appointments || history.appointments.length === 0) ? (
                      <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>No previous logs.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                        {history.appointments.map((a, i) => (
                          <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-dark)" }}>
                            • {a.date} {a.time} ({a.status})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateBrief}
                className="btn btn-primary"
                style={{ marginTop: "16px", width: "100%" }}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner"></span> Analyzing History...
                  </>
                ) : brief ? (
                  <>
                    <Sparkles size={16} /> Regenerate Clinical Brief
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} /> Generate AI Medical Brief
                  </>
                )}
              </button>
            </div>
          )}

          {loadingHistory && (
            <div className="card" style={{ textAlign: "center", padding: "30px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "10px", fontSize: "0.85rem" }}>Fetching patient history...</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Structured 7-Section AI Brief */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Sparkles size={18} className="text-primary" />
              <span>7-Section AI Clinical Brief</span>
              {patientName && <span className="badge badge-confirmed" style={{ fontSize: "0.78rem" }}>{patientName}</span>}
            </h4>

            {brief && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setLang(lang === "en" ? "hi" : "en");
                    stop();
                  }}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Languages size={14} /> {lang === "en" ? "हिंदी" : "English"}
                </button>
                <button
                  onClick={() => toggle(getBriefFullText(lang), lang)}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  {speaking && currentLang === lang ? (
                    <>
                      <VolumeX size={14} /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} /> {lang === "hi" ? "संक्षेप सुनें" : "Listen Audio"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {generating && (
            <div style={{ textAlign: "center", padding: "70px 20px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "16px", fontSize: "0.95rem" }}>
                Groq AI is analyzing patient documents, PyMuPDF records, and clinical logs...
              </p>
            </div>
          )}

          {!generating && !brief && (
            <div style={{ textAlign: "center", padding: "70px 20px" }} className="text-muted">
              <BrainCircuit size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>Select an authorized patient on the left and click "Generate AI Medical Brief" to view summary.</p>
            </div>
          )}

          {brief && !generating && (
            <div>
              {/* Disclaimer */}
              {disclaimer && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 14px", backgroundColor: "#fffbeb", borderRadius: "8px", border: "1px solid #fef3c7", marginBottom: "20px", fontSize: "0.82rem", color: "#92400e" }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{disclaimer}</span>
                </div>
              )}

              {/* 7-Section Cards Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {Object.keys(SECTION_LABELS).map((key) => {
                  const langKey = lang === "en" ? "english" : "hindi";
                  const value = brief[langKey]?.[key];
                  if (!value) return null;

                  return (
                    <div
                      key={key}
                      style={{
                        padding: "16px 20px",
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        borderLeft: key === "key_points" ? "5px solid hsl(var(--hue), 85%, 48%)" : key === "important_observations" ? "5px solid hsl(0, 80%, 55%)" : "5px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <small style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--primary)", fontSize: "0.8rem" }}>
                          {SECTION_LABELS[key][lang === "en" ? "en" : "hi"]}
                        </small>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleCopySection(key, value)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "2px" }}
                            title="Copy Section"
                          >
                            {copiedKey === key ? <Check size={13} className="text-secondary" /> : <Copy size={13} />}
                            <span>{copiedKey === key ? "Copied" : "Copy"}</span>
                          </button>
                          <button
                            onClick={() => toggle(value, lang)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)" }}
                            title={lang === "hi" ? "सुनें" : "Listen"}
                          >
                            <Volume2 size={13} />
                          </button>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text-dark)" }}>
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
