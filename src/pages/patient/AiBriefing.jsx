import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { directApi } from "../../api/services";
import { BrainCircuit, Upload, FileText, CheckCircle2, Languages } from "lucide-react";

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

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError("");
    setSuccess("");
  };

  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one clinical history file (.pdf/images).");
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
      setSuccess("Clinical history files uploaded successfully!");
      setFiles([]);
      
      // 2. Automatically generate brief
      handleGenerateBrief();
    } catch (err) {
      console.error(err);
      setError("Failed to upload clinical files to patient profile.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGenerating(true);
    setError("");
    try {
      const response = await directApi.getBriefAssist(user.id);
      setBrief(response.summary);
    } catch (err) {
      console.error(err);
      setError("Failed to generate AI report summary. Check GOOGLE_API_KEY environment configuration.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div className="card" style={{ marginBottom: "30px" }}>
        <h3>AI Health Report Briefing</h3>
        <p className="text-muted">
          Upload medical histories, prescriptions, or clinical files. Our Gemini agent compiles bilingual medical summaries.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "30px" }}>
        {/* Upload Panel */}
        <div className="card" style={{ height: "fit-content" }}>
          <h4>Upload Report Files</h4>
          <p className="text-muted" style={{ fontSize: "0.8rem", margin: "6px 0 20px" }}>
            Files are associated with your ID: <code style={{ wordBreak: "break-all" }}>{user?.id}</code>
          </p>

          <form onSubmit={handleUploadAndAnalyze}>
            <label className="dropzone" style={{ padding: "30px 10px" }}>
              <div className="dropzone-icon">
                <Upload size={24} />
              </div>
              <strong style={{ fontSize: "0.85rem" }}>Select reports/images</strong>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            {files.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Selected Files:</p>
                <ul style={{ listStyle: "none", fontSize: "0.8rem", paddingLeft: "4px" }}>
                  {files.map((f, i) => (
                    <li key={i} className="text-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📄 {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: "20px" }}
              disabled={uploading || generating}
            >
              {uploading ? <span className="spinner"></span> : "Upload & Analyze"}
            </button>
          </form>

          {brief && (
            <button
              onClick={handleGenerateBrief}
              className="btn btn-secondary"
              style={{ marginTop: "12px", width: "100%" }}
              disabled={generating}
            >
              Recalculate Briefing
            </button>
          )}
        </div>

        {/* AI Briefing Results Panel */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BrainCircuit size={20} className="text-primary" />
              <span>AI Summarization Brief</span>
            </h4>

            {brief && (
              <button
                onClick={() => setLang(lang === "english" ? "hindi" : "english")}
                className="btn btn-outline"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Languages size={14} />
                <span>Switch to {lang === "english" ? "Hindi" : "English"}</span>
              </button>
            )}
          </div>

          {generating && (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "16px" }}>Analyzing uploaded documents using Google Gemini...</p>
            </div>
          )}

          {!generating && !brief && (
            <div style={{ textAlign: "center", padding: "60px" }} className="text-muted">
              <BrainCircuit size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>Upload files on the left to generate your briefing summary.</p>
            </div>
          )}

          {brief && !generating && (
            <div>
              <div className="ai-report-grid">
                <div className="card ai-card">
                  <small className="text-muted" style={{ fontWeight: 600 }}>SUMMARY BRIEF</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem" }}>
                    {brief.languages?.[lang]?.summary || brief.summary || "No brief available."}
                  </p>
                </div>

                <div className="card ai-card" style={{ borderLeftColor: "var(--secondary)" }}>
                  <small className="text-muted" style={{ fontWeight: 600 }}>PURPOSE & SPECIALIST</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem" }}>
                    {brief.languages?.[lang]?.purpose || brief.purpose || "Not specified."}
                  </p>
                </div>

                <div className="card ai-card" style={{ borderLeftColor: "var(--warning)" }}>
                  <small className="text-muted" style={{ fontWeight: 600 }}>MEDICINES IDENTIFIED</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem", fontWeight: 600 }}>
                    {brief.languages?.[lang]?.medicines || brief.medicines || "None identified."}
                  </p>
                </div>

                <div className="card ai-card" style={{ borderLeftColor: "var(--danger)" }}>
                  <small className="text-muted" style={{ fontWeight: 600 }}>PRECAUTIONS</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem" }}>
                    {brief.languages?.[lang]?.precaution || brief.precaution || "None listed."}
                  </p>
                </div>

                <div className="card ai-card" style={{ borderLeftColor: "purple" }}>
                  <small className="text-muted" style={{ fontWeight: 600 }}>DOSAGE INSTRUCTIONS</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem" }}>
                    {brief.languages?.[lang]?.instruction || brief.instruction || "None listed."}
                  </p>
                </div>

                <div className="card ai-card" style={{ borderLeftColor: "teal" }}>
                  <small className="text-muted" style={{ fontWeight: 600 }}>DURATION</small>
                  <p style={{ marginTop: "6px", fontSize: "0.95rem" }}>
                    {brief.languages?.[lang]?.duration || brief.duration || "Not specified."}
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
