import { useState } from "react";
import { directApi } from "../../api/services";
import { ScanLine, Upload, Star } from "lucide-react";

export const OcrScanner = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setResult(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    setError("");
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await directApi.extractOcr(formData);
      setResult(response.salts); // { medicine, salt }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || 
        "OCR analysis failed. Please verify that NVIDIA_API_KEY is configured in backend environment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError("");
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      <div className="card" style={{ marginBottom: "30px" }}>
        <h3>Prescription OCR Salt Scanner</h3>
        <p className="text-muted">
          Upload images of medicine labels or prescriptions. Our OCR engine identifies chemical salt compositions.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="ocr-split">
        {/* Input Panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h4>Upload Medicine Label</h4>
          
          {!imagePreview ? (
            <label className="dropzone" style={{ padding: "40px 20px" }}>
              <div className="dropzone-icon">
                <ScanLine size={32} />
              </div>
              <strong>Select Medicine Label Image</strong>
              <p className="text-muted" style={{ fontSize: "0.8rem" }}>PNG, JPG, or JPEG formats supported</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <img src={imagePreview} alt="Prescription preview" className="ocr-image-preview" />
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleScanSubmit}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Scanning label...</span>
                    </>
                  ) : (
                    "Scan & Extract Salts"
                  )}
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="btn btn-outline"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="card">
          <h4>Extraction Results</h4>
          <p className="text-muted" style={{ marginBottom: "20px", fontSize: "0.85rem" }}>
            The identified brand name matches to generic salt formulas instantly.
          </p>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "12px" }}>Connecting to NVIDIA Nemotron OCR...</p>
            </div>
          )}

          {!loading && !result && (
            <p className="text-muted" style={{ textAlign: "center", padding: "40px" }}>
              Upload and scan a label image to render details here.
            </p>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--primary-light)", padding: "16px", borderRadius: "8px", borderLeft: "4px solid var(--primary)" }}>
                <small className="text-muted" style={{ fontWeight: 600 }}>DETECTED BRAND</small>
                <h3 style={{ textTransform: "capitalize", color: "var(--primary)" }}>{result.medicine}</h3>
              </div>

              <div style={{ background: "var(--secondary-light)", padding: "16px", borderRadius: "8px", borderLeft: "4px solid var(--secondary)" }}>
                <small className="text-muted" style={{ fontWeight: 600 }}>GENERIC SALT COMPOSITION</small>
                <h4 style={{ textTransform: "capitalize", color: "hsl(160, 80%, 25%)" }}>{result.salt}</h4>
              </div>

              <div className="alert alert-info" style={{ fontSize: "0.8rem", marginTop: "10px" }}>
                💡 Matches are mapped using a curated index of 50 common Indian medicines.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
