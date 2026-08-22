import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import { Upload, FileText, Download } from "lucide-react";

export const MedicalRecords = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDocuments = async () => {
    try {
      const response = await patientApi.getMedicalDocuments();
      setDocuments(response.medical_documents || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch medical documents.");
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
    // Append each selected file
    for (let i = 0; i < selectedFiles.length; i++) {
      // Validate PDF format
      if (!selectedFiles[i].name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF document files are allowed.");
        setUploading(false);
        return;
      }
      formData.append("files", selectedFiles[i]);
    }

    try {
      await patientApi.uploadMedicalDocuments(formData);
      setSuccess("Medical documents uploaded successfully!");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to upload medical documents.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Loading medical documents archive...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "30px" }}>
      {/* List Panel */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-header">
          <h3>Patient Records Archive</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Uploaded medical documentation and diagnostic reports (.pdf formats only).
          </p>
        </div>
        <div className="table-container">
          {error && <div className="alert alert-danger" style={{ margin: "20px" }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ margin: "20px" }}>{success}</div>}

          {documents.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
              <FileText size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
              <p>No documents uploaded in your records history.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Internal ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={18} className="text-muted" />
                      <span>{doc.original_name}</span>
                    </td>
                    <td style={{ fontSize: "0.85rem" }} className="text-muted">{doc.id}</td>
                    <td>
                      <span className="badge badge-confirmed" style={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Uploaded
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div>
        <div className="card">
          <h4>Upload Diagnostics</h4>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "6px", marginBottom: "20px" }}>
            Upload PDF reports (lab tests, MRI scans, radiology details) to link to your file.
          </p>

          <label className="dropzone" style={{ padding: "30px 20px" }}>
            <div className="dropzone-icon">
              <Upload size={24} />
            </div>
            <strong style={{ fontSize: "0.9rem" }}>Drag & drop files here</strong>
            <span className="badge badge-proposed" style={{ textTransform: "none", fontSize: "0.75rem" }}>
              Choose PDF
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
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>Uploading records, please wait...</p>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: "20px", backgroundColor: "var(--warning-light)", borderColor: "hsla(38, 95%, 50%, 0.1)" }}>
          <h5 style={{ color: "var(--warning)", marginBottom: "8px" }}>🔒 Records Security Note</h5>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dark)" }}>
            Documents are processed securely. Due to backend security settings, document files are stored as metadata.
          </p>
        </div>
      </div>
    </div>
  );
};
