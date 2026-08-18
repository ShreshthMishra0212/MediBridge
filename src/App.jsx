import { useRef, useState } from "react";
// import Tesseract from "tesseract.js";
import axios from "axios";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageChange = (event) => {
    const selectedImage = event.target.files[0];

    if (!selectedImage) return;

    setImage(URL.createObjectURL(selectedImage));
    setImageFile(selectedImage);
    setImageName(selectedImage.name);
    setResult("");
  };


  // API call
  const handleGenerateText = async () => {
  if (!imageFile) return;

  setIsLoading(true);
  setResult("");

  const formData = new FormData();
  formData.append("image", imageFile);

  try {
    const response = await axios.post(
      "http://10.180.0.225:5173/api/extract",
      formData,
    );
    console.log("my name");
    console.log("ocr resopnse:",response.data);
    setResult(response.data.text || "No readable text was found.");
  } catch (error) {
    console.error(error);
    setResult("Could not connect to the DeepSeek OCR API.");
  } finally {
    setIsLoading(false);
  }
};

  const handleRemoveImage = () => {
    setImage(null);
    setImageFile(null);
    setImageName("");
    setResult("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="upload-page">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">💊</span>

          <span>
            <strong>
              Medi<span>Bridge</span>
            </strong>
            <small>AI MEDICINE INTELLIGENCE</small>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#upload">Menu</a>
          <a href="#about">About</a>
          <a href="#contact">Contact Us</a>
        </nav>

        <div className="status-area">
          <span className="online-status">● AI System Online</span>
          <span className="step-badge">Step 1 / 2</span>
        </div>
      </header>

      <section id="home" className="upload-hero">
        <span className="hero-label">✦ AI MEDICINE ANALYSIS</span>

        {/* <h1>
          Understand your <span>medicine</span> data
        </h1> */}

        <h1> Scan your <span>medicine</span> data </h1>

        <p>
          Upload a clear image of your medicine package, label, or prescription
          to begin extracting its text.
        </p>

        <div className="feature-tags">
          <span>Image OCR</span>
          <span>AI Analysis</span>
          <span>Structured Data</span>
        </div>
      </section>

      <section id="upload" className="upload-card">
        <div className="upload-card-heading">
          <div>
            <small>SOURCE DATA</small>
            <h2>Upload Medicine Image</h2>
          </div>

          <span className="secure-tag">● SECURE UPLOAD</span>
        </div>

        {!image ? (
          <label className="drop-zone">
            <span className="upload-symbol">↑</span>
            <strong>Upload your medicine image</strong>
            <p>PNG, JPG, or JPEG · Clear label images work best</p>
            <span className="browse-button">Choose Image</span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        ) : (
          <div className="preview-section">
            <p className="file-name">Selected: {imageName}</p>

            <img src={image} alt="Uploaded medicine" className="preview-image" />

            <div className="action-buttons">
              <button
                type="button"
                onClick={handleGenerateText}
                disabled={isLoading}
              >
                {isLoading ? "Reading Image..." : "Generate Text"}
              </button>

              <button
                type="button"
                className="remove-button"
                onClick={handleRemoveImage}
              >
                Remove Image
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="ocr-result">
            <small>EXTRACTED TEXT</small>
            <pre>{result}</pre>
          </div>
        )}
      </section>

      <section id="about" className="info-section">
        <h2>About MediBridge</h2>
        <p>
          MediBridge helps users read text from medicine labels using image OCR.
        </p>
      </section>

      <section id="contact" className="info-section">
        <h2>Contact Us</h2>
        <p>For support, please contact the MediBridge team.</p>
      </section>

      <p className="privacy-note">
        🔒 Your uploaded image is used only for this analysis.
      </p>
    </main>
  );
}

export default App;