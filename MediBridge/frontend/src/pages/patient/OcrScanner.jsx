import { useState } from "react";
import { Link } from "react-router-dom";
import { directApi } from "../../api/services";
import { MED_SALT_MAP, MED_DETAILS, lookupSalt } from "../../api/medSaltCatalog";
import { explainMedicineWithGroq } from "../../api/groqService";
import { useSpeech } from "../../hooks/useSpeech";
import {
  ScanLine,
  Upload,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  Pill,
  ShieldAlert,
  Info,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Languages,
} from "lucide-react";

export const OcrScanner = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Searchable Salt Dictionary State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogMed, setSelectedCatalogMed] = useState(null);

  // Groq AI Deep Pharmacology Analysis State
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeLang, setActiveLang] = useState("en");

  const { toggle, speaking, currentLang, stop } = useSpeech();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setResult(null);
    setAiExplanation(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!imageFile) return;

    setError("");
    setResult(null);
    setAiExplanation(null);
    setLoading(true);
    stop();

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await directApi.extractOcr(formData);
      const matched = response.salts; // { medicine, salt }
      setResult(matched);

      // Trigger Groq AI detailed pharmacology explainer
      fetchGroqExplanation(matched.medicine, matched.salt);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
        "OCR analysis failed. You can also search for the medicine name in the catalog below."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchGroqExplanation = async (medName, saltName) => {
    setAiLoading(true);
    try {
      const exp = await explainMedicineWithGroq(medName, saltName);
      setAiExplanation(exp);
    } catch (err) {
      console.warn("Groq pharmacology explanation failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectFromCatalog = (brand) => {
    const data = lookupSalt(brand);
    if (data) {
      setSelectedCatalogMed(data);
      setResult({ medicine: data.medicine, salt: data.salt });
      fetchGroqExplanation(data.medicine, data.salt);
      // Scroll up smoothly to result
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setAiExplanation(null);
    setSelectedCatalogMed(null);
    setError("");
    stop();
  };

  // Filter medicines in catalog
  const filteredCatalog = Object.keys(MED_SALT_MAP).filter((med) => {
    const salt = MED_SALT_MAP[med];
    const q = searchQuery.toLowerCase().trim();
    return med.toLowerCase().includes(q) || salt.toLowerCase().includes(q);
  });

  const getSpeechSummaryText = () => {
    if (!result) return "";
    if (activeLang === "hi" && aiExplanation?.hindiSummary) {
      return aiExplanation.hindiSummary;
    }
    return `Medicine: ${result.medicine}. Generic chemical salt: ${result.salt}. Purpose: ${
      aiExplanation?.indications || MED_DETAILS[result.medicine.toLowerCase()]?.use || "Therapeutic medicine"
    }. Safety advice: ${aiExplanation?.dosageAdvice || "Take as prescribed by your physician."}`;
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <ScanLine size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Medicine OCR & Generic Salt Identifier</h3>
            <small className="text-muted">Extracts chemical salt formulas, identifies generic substitutes & provides bilingual safety guides</small>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Main Split: Scan Upload & Result View */}
      <div className="ocr-split" style={{ alignItems: "start" }}>
        {/* Upload Zone Panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <h4>Upload Prescription or Medicine Box</h4>
          <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            Take a clear photo of your tablet strip, bottle label, or doctor's prescription note.
          </p>

          {!imagePreview ? (
            <label className="dropzone" style={{ padding: "40px 20px" }}>
              <div className="dropzone-icon">
                <Upload size={32} />
              </div>
              <strong style={{ fontSize: "0.95rem" }}>Select medicine photo</strong>
              <p className="text-muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>PNG, JPG, or JPEG format</p>
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
                  style={{ flex: 1.5 }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Scanning label...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine size={16} /> Scan & Extract Salts
                    </>
                  )}
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Clear Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Extraction & Pharmacological Analysis Panel */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "14px", marginBottom: "16px" }}>
            <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Pill size={18} className="text-primary" />
              <span>Chemical Salt Details</span>
            </h4>

            {result && (
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => {
                    setActiveLang(activeLang === "en" ? "hi" : "en");
                    stop();
                  }}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "5px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Languages size={13} /> {activeLang === "en" ? "हिंदी" : "English"}
                </button>
                <button
                  onClick={() => toggle(getSpeechSummaryText(), activeLang)}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "5px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span>{speaking ? "Stop" : activeLang === "hi" ? "सुनें" : "Listen"}</span>
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
              <p style={{ marginTop: "14px", fontSize: "0.9rem" }}>Scanning text with NVIDIA OCR & matching salt formulas...</p>
            </div>
          )}

          {!loading && !result && (
            <div style={{ textAlign: "center", padding: "50px 20px" }} className="text-muted">
              <ScanLine size={48} style={{ marginBottom: "12px", strokeWidth: 1.5 }} />
              <p>Upload a medicine image or click any brand name in the catalog below to view its generic composition.</p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Brand Card */}
              <div style={{ background: "var(--primary-light)", padding: "16px", borderRadius: "10px", borderLeft: "4px solid var(--primary)" }}>
                <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  IDENTIFIED BRAND NAME
                </small>
                <h3 style={{ textTransform: "capitalize", color: "var(--primary)", margin: "4px 0 0" }}>{result.medicine}</h3>
              </div>

              {/* Salt Card */}
              <div style={{ background: "var(--secondary-light)", padding: "16px", borderRadius: "10px", borderLeft: "4px solid var(--secondary)" }}>
                <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ACTIVE GENERIC CHEMICAL SALT
                </small>
                <h4 style={{ textTransform: "capitalize", color: "hsl(160, 80%, 25%)", margin: "4px 0 0" }}>{result.salt}</h4>
              </div>

              {/* AI Clinical Breakdown */}
              {aiExplanation && (
                <div style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--primary)", fontWeight: 700 }}>
                    <Sparkles size={16} /> Groq Clinical Pharmacological Guide
                  </div>

                  {activeLang === "hi" && aiExplanation.hindiSummary ? (
                    <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", lineHeight: 1.6 }}>
                      {aiExplanation.hindiSummary}
                    </div>
                  ) : (
                    <>
                      {aiExplanation.category && (
                        <div><strong>Drug Class:</strong> {aiExplanation.category}</div>
                      )}
                      {aiExplanation.indications && (
                        <div><strong>Treats:</strong> {aiExplanation.indications}</div>
                      )}
                      {aiExplanation.howItWorks && (
                        <div><strong>How It Works:</strong> {aiExplanation.howItWorks}</div>
                      )}
                      {aiExplanation.dosageAdvice && (
                        <div><strong>Dosage Guidance:</strong> {aiExplanation.dosageAdvice}</div>
                      )}
                      {aiExplanation.precautions && (
                        <div style={{ color: "hsl(0, 80%, 40%)" }}><strong>Precautions:</strong> {aiExplanation.precautions}</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {aiLoading && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }}></span>
                  Generating pharmacology guidance with Groq AI...
                </div>
              )}

              {/* Action Button */}
              <Link
                to="/patient/doctors"
                className="btn btn-outline"
                style={{ marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <span>Consult Doctor for this Prescription</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Searchable Medicine & Salt Catalog Section */}
      <div className="card" style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={20} className="text-primary" />
              <span>Generic Medicine & Chemical Salt Directory</span>
            </h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Search across 50+ common Indian pharmaceuticals to look up active salt molecules instantly
            </p>
          </div>
        </div>

        <div className="search-wrapper" style={{ marginBottom: "20px" }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by brand name (e.g. Crocin, Augmentin, Pantop, Telma) or salt (Paracetamol)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
          {filteredCatalog.length === 0 ? (
            <p className="text-muted" style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px" }}>
              No medicines found matching "{searchQuery}".
            </p>
          ) : (
            filteredCatalog.map((med) => (
              <div
                key={med}
                onClick={() => handleSelectFromCatalog(med)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
                className="animated-hover"
              >
                <strong style={{ textTransform: "capitalize", fontSize: "0.9rem", color: "var(--primary)" }}>{med}</strong>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>{MED_SALT_MAP[med]}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
