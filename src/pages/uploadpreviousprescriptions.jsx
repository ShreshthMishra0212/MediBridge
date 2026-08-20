import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./UploadPreviousPrescriptions.css";

function UploadPreviousPrescriptions() {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = () => {
    if (!file) return;

    alert(`Prescription "${fileName}" is ready to upload.`);
  };

  return (
    <main className="prescription-page">
      <header className="prescription-header">
        <Link to="/" className="prescription-brand">
          <span>✚</span>
          Medi<span>Bridge</span>
        </Link>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </header>

      <section className="prescription-hero">
        <span>✦ PREVIOUS PRESCRIPTIONS</span>
        <h1>Upload your previous prescription</h1>
        <p>
          Upload a Word document to keep your previous prescription information
          ready for review.
        </p>
      </section>

      <section className="document-card">
        <div className="document-heading">
          <div>
            <small>DOCUMENT UPLOAD</small>
            <h2>Prescription File</h2>
          </div>

          <span>● SECURE UPLOAD</span>
        </div>

        {!file ? (
          <label className="document-drop-zone">
            <span className="document-icon">📄</span>
            <strong>Upload your prescription document</strong>
            <p>Supported formats: DOC and DOCX</p>
            <span className="choose-document">Choose Word File</span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="selected-document">
            <span className="document-icon">📄</span>
            <div>
              <strong>{fileName}</strong>
              <p>Word prescription selected successfully.</p>
            </div>

            <button className="remove-document" onClick={handleRemoveFile}>
              Remove
            </button>
          </div>
        )}

        {file && (
          <button className="upload-document-button" onClick={handleUpload}>
            Upload Prescription
          </button>
        )}
      </section>

      <p className="document-note">
        🔒 Your prescription document is used only for your requested analysis.
      </p>
    </main>
  );
}

export default UploadPreviousPrescriptions;
