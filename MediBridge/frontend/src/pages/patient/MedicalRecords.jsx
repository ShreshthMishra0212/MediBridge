import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientApi } from "../../api/services";
import {
  Upload,
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const MedicalRecords = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const fetchDocuments = async () => {
    try {
      const response = await patientApi.getMedicalDocuments();
      setDocuments(response.medical_documents || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch medical records archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError("");
    setSuccess("");
    setUploading(true);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      if (!selectedFiles[i].name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF format documents are supported for diagnostic storage.");
        setUploading(false);
        return;
      }
      formData.append("files", selectedFiles[i]);
    }

    try {
      await patientApi.uploadMedicalDocuments(formData);
      setSuccess("Medical documents uploaded and linked to your patient profile successfully!");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to upload medical documents.");
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    return (
      doc.original_name?.toLowerCase().includes(search.toLowerCase()) ||
      doc.id?.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Loading medical records archive...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "30px", alignItems: "start" }}>
      {/* List Panel */}
      <div>
        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>Medical Documents & Lab Archive</h3>
              <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                Stored diagnostic reports, blood tests, radiology scans, and clinical history files (.pdf)
              </p>
            </div>
            <div className="search-wrapper" style={{ minWidth: "220px" }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                style={{ padding: "8px 12px 8px 36px", fontSize: "0.82rem" }}
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card table-card">
          <div className="table-container">
            {filteredDocs.length === 0 ? (
              <div style={{ padding: "50px", textAlign: "center" }} className="text-muted">
                <FolderOpen size={48} style={{ marginBottom: "14px", strokeWidth: 1.5 }} />
                <p>No medical documents uploaded in your records archive.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Document ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
                          <FileText size={18} className="text-primary" />
                          <span>{doc.original_name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.82rem" }} className="text-muted">
                        <code>{doc.id}</code>
                      </td>
                      <td>
                        <span className="badge badge-confirmed" style={{ fontSize: "0.72rem", textTransform: "none" }}>
                          Encrypted & Stored
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Upload Zone & AI Handoff */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="card">
          <h4>Upload PDF Records</h4>
          <p className="text-muted" style={{ fontSize: "0.82rem", margin: "6px 0 16px" }}>
            Upload lab reports, MRI scans, or clinical notes in PDF format.
          </p>

          <label className="dropzone" style={{ padding: "28px 16px" }}>
            <div className="dropzone-icon" style={{ width: "52px", height: "52px" }}>
              <Upload size={22} />
            </div>
            <strong style={{ fontSize: "0.88rem" }}>Choose PDF Documents</strong>
            <span className="badge badge-proposed" style={{ textTransform: "none", fontSize: "0.72rem" }}>
              Drag & Drop PDF
            </span>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileUpload}
              style={{ display: "none" }}
              disabled={uploading}
            />
          </label>

          {uploading && (
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>Uploading records...</p>
            </div>
          )}
        </div>

        {/* AI Action Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, hsla(var(--hue), 85%, 96%, 0.8), #ffffff)", border: "1px solid hsla(var(--hue), 85%, 55%, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: 700, marginBottom: "8px" }}>
            <Sparkles size={18} />
            <span>AI Health Report Briefing</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-dark)", lineHeight: 1.5, margin: "0 0 14px" }}>
            Want an instant bilingual summary of all your uploaded diagnostic files and doctor prescriptions?
          </p>
          <Link to="/patient/ai-brief" className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "0.82rem", width: "100%" }}>
            <span>Analyze with AI Briefer</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
