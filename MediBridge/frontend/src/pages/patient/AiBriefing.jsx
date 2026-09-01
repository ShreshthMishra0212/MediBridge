import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { directApi, patientApi } from "../../api/services";
import { synthesizePatientBriefWithGroq } from "../../api/groqService";
import {
  BrainCircuit,
  Upload,
  FileText,
  CheckCircle2,
  Languages,
  Volume2,
  VolumeX,
  Sparkles,
  Printer,
  Calendar,
  AlertTriangle,
  Pill,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useSpeech } from "../../hooks/useSpeech";

export const AiBriefing = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Brief State
  const [brief, setBrief] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [lang, setLang] = useState("english"); // 'english' or 'hindi'

  // Existing documents on profile
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const { toggle, speaking, currentLang, stop } = useSpeech();

  const fetchExistingDocuments = async () => {
    setLoadingDocs(true);
    try {
      const response = await patientApi.getMedicalDocuments();
      setSavedDocs(response.medical_documents || []);
    } catch (err) {
      console.warn("Could not load medical documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchExistingDocuments();
  }, []);

  const getFullBriefText = (selectedLang) => {
    if (!brief) return "";
    const b = brief.languages?.[selectedLang] || brief;
    const parts = [
      b.summary ? `Summary: ${b.summary}` : "",
      b.purpose ? `Purpose: ${b.purpose}` : "",
      b.medicines ? `Medicines Identified: ${b.medicines}` : "",
      b.precaution ? `Precautions: ${b.precaution}` : "",
      b.instruction ? `Dosage Instructions: ${b.instruction}` : "",
      b.duration ? `Duration: ${b.duration}` : "",
    ];
    return parts.filter(Boolean).join(". ");
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setError("");
    setSuccess("");
  };

  const handleUploadAndAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one clinical history file (.pdf, .docx, or images).");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      // 1. Upload files tied to patient ID fname parameter
      await directApi.uploadHistory(user.id, formData);
      setSuccess("Clinical documents uploaded successfully!");
      setFiles([]);
      fetchExistingDocuments();

      // 2. Automatically generate brief
      handleGenerateBrief();
    } catch (err) {
      console.error(err);
      setError("Failed to upload clinical files. Please check network and file formats.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGenerating(true);
    setError("");
    stop();
    try {
      // 1. Try backend /brief_assist endpoint
      const response = await directApi.getBriefAssist(user.id);
      if (response && response.summary && response.summary.summary) {
        setBrief(response.summary);
        return;
      }
    } catch (err) {
      console.warn("Backend brief_assist had no local files, activating direct Groq AI synthesis...", err);
    }

    // 2. Direct Groq AI fallback with user prescriptions & history
    try {
      let userPrescriptions = [];
      try {
        const pRes = await patientApi.getPrescriptions();
        userPrescriptions = pRes.prescriptions || [];
      } catch (pErr) {
        console.warn("Could not fetch prescriptions for briefing context", pErr);
      }

      const patientContext = `Patient Name: ${user.name || "Patient"}, ID: ${user.id}`;
      const groqBrief = await synthesizePatientBriefWithGroq(patientContext, userPrescriptions);
      setBrief(groqBrief);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
        "Failed to generate AI report summary. Please ensure documents or prescriptions exist on your profile."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: "1050px" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <BrainCircuit size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>AI Clinical Health Briefing</h3>
            <small className="text-muted">Extracts, translates, and synthesizes multi-page clinical reports and prescriptions into actionable patient guides</small>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: "30px", alignItems: "start" }}>
        {/* Upload Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <h4>Upload Clinical Reports</h4>
            <p className="text-muted" style={{ fontSize: "0.82rem", margin: "6px 0 16px" }}>
              Upload lab reports, discharge slips, or scanned prescriptions (PDF, DOCX, JPG, PNG).
            </p>

            <form onSubmit={handleUploadAndAnalyze}>
              <label className="dropzone" style={{ padding: "28px 10px" }}>
                <div className="dropzone-icon" style={{ width: "50px", height: "50px" }}>
                  <Upload size={22} />
                </div>
                <strong style={{ fontSize: "0.88rem" }}>Select Medical Files</strong>
                <p className="text-muted" style={{ fontSize: "0.75rem", margin: "2px 0 0" }}>PDF, Word, or Photos</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              {files.length > 0 && (
                <div style={{ marginTop: "14px", backgroundColor: "var(--light)", padding: "10px 12px", borderRadius: "8px" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, margin: "0 0 6px" }}>Selected to Upload ({files.length}):</p>
                  <ul style={{ listStyle: "none", fontSize: "0.78rem", paddingLeft: 0, margin: 0 }}>
                    {files.map((f, i) => (
                      <li key={i} className="text-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                        📄 {f.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: "16px" }}
                disabled={uploading || generating}
              >
                {uploading ? (
                  <>
                    <span className="spinner"></span> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Upload & Analyze
                  </>
                )}
              </button>
            </form>

            <button
              onClick={handleGenerateBrief}
              className="btn btn-secondary"
              style={{ marginTop: "10px", width: "100%" }}
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner"></span> Synthesizing AI Brief...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate / Refresh Brief
                </>
              )}
            </button>
          </div>

          {/* Uploaded Archive Quick View */}
          {savedDocs.length > 0 && (
            <div className="card">
              <h5 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "10px" }}>
                Archived Documents ({savedDocs.length})
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                {savedDocs.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                    <FileText size={14} className="text-muted" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{doc.original_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Briefing Results Panel */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Sparkles size={18} className="text-primary" />
              <span>Synthesized Medical Care Brief</span>
            </h4>

            {brief && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    const nextLang = lang === "english" ? "hindi" : "english";
                    setLang(nextLang);
                    stop();
                  }}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Languages size={14} />
                  <span>{lang === "english" ? "हिंदी में देखें" : "View in English"}</span>
                </button>
                <button
                  onClick={() => {
                    const speechLang = lang === "hindi" ? "hi" : "en";
                    toggle(getFullBriefText(lang), speechLang);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {speaking && currentLang === (lang === "hindi" ? "hi" : "en") ? (
                    <>
                      <VolumeX size={14} /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} /> {lang === "hindi" ? "सारांश सुनें" : "Listen Audio"}
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "6px 10px", fontSize: "0.8rem" }}
                  title="Print Summary"
                >
                  <Printer size={14} />
                </button>
              </div>
            )}
          </div>

          {generating && (
            <div style={{ textAlign: "center", padding: "70px 20px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "16px", fontSize: "0.95rem" }}>
                Synthesizing diagnostic reports and prescriptions using Groq AI Intelligence...
              </p>
            </div>
          )}

          {!generating && !brief && (
            <div style={{ textAlign: "center", padding: "70px 20px" }} className="text-muted">
              <BrainCircuit size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>Upload your health reports on the left or click "Generate Brief" to build your bilingual summary.</p>
            </div>
          )}

          {brief && !generating && (
            <div>
              <div className="ai-report-grid">
                {/* 1. Summary */}
                <div className="card ai-card" style={{ gridColumn: "1/-1", borderLeft: "4px solid var(--primary)", background: "linear-gradient(to right, hsla(var(--hue), 85%, 98%, 0.5), #ffffff)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                      {lang === "hindi" ? "चिकित्सा सारांश (Clinical Summary)" : "Clinical Summary"}
                    </small>
                    <button
                      onClick={() => toggle(brief.languages?.[lang]?.summary || brief.summary, lang === "hindi" ? "hi" : "en")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <p style={{ marginTop: "8px", fontSize: "1rem", lineHeight: 1.6, fontWeight: 500 }}>
                    {brief.languages?.[lang]?.summary || brief.summary || "No summary recorded."}
                  </p>
                </div>

                {/* 2. Purpose & Specialty */}
                <div className="card ai-card" style={{ borderLeft: "4px solid var(--secondary)" }}>
                  <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {lang === "hindi" ? "उपचार का उद्देश्य (Purpose & Specialty)" : "Purpose & Recommended Care"}
                  </small>
                  <p style={{ marginTop: "8px", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {brief.languages?.[lang]?.purpose || brief.purpose || "Not specified."}
                  </p>
                </div>

                {/* 3. Medicines */}
                <div className="card ai-card" style={{ borderLeft: "4px solid hsl(280, 80%, 55%)" }}>
                  <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {lang === "hindi" ? "दवाइयाँ (Medicines Identified)" : "Prescribed Medicines"}
                  </small>
                  <p style={{ marginTop: "8px", fontSize: "0.92rem", fontWeight: 600, color: "hsl(280, 70%, 35%)", lineHeight: 1.5 }}>
                    {brief.languages?.[lang]?.medicines || brief.medicines || "None listed in document."}
                  </p>
                </div>

                {/* 4. Dosage Instructions */}
                <div className="card ai-card" style={{ borderLeft: "4px solid var(--warning)" }}>
                  <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {lang === "hindi" ? "खुराक और समय (Dosage Instructions)" : "Dosage & Timings"}
                  </small>
                  <p style={{ marginTop: "8px", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {brief.languages?.[lang]?.instruction || brief.instruction || "Follow physician directions."}
                  </p>
                </div>

                {/* 5. Precautions */}
                <div className="card ai-card" style={{ borderLeft: "4px solid hsl(0, 80%, 55%)" }}>
                  <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {lang === "hindi" ? "सावधानियां (Important Precautions)" : "Clinical Precautions"}
                  </small>
                  <p style={{ marginTop: "8px", fontSize: "0.92rem", lineHeight: 1.5, color: "hsl(0, 70%, 35%)" }}>
                    {brief.languages?.[lang]?.precaution || brief.precaution || "Standard medical precautions."}
                  </p>
                </div>

                {/* 6. Duration */}
                <div className="card ai-card" style={{ gridColumn: "1/-1", borderLeft: "4px solid hsl(190, 85%, 45%)" }}>
                  <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {lang === "hindi" ? "उपचार की अवधि (Duration & Follow-up)" : "Treatment Duration & Follow-Up"}
                  </small>
                  <p style={{ marginTop: "8px", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {brief.languages?.[lang]?.duration || brief.duration || "As advised by consulting physician."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
