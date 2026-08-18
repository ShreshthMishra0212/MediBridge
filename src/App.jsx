import { useEffect, useRef, useState } from "react";
import axios from "axios";

import "./App.css";
const slides = [
  {
    label: "✦ AI MEDICINE ANALYSIS",
    title: "Understand your medicine data",
    text: "Upload a clear medicine label and let MediBridge extract the important text.",
    tags: ["Image OCR", "Fast Upload", "Easy to Use"],
  },
  {
    label: "✦ SMART TEXT EXTRACTION",
    title: "Read medicine labels quickly",
    text: "Our OCR workflow identifies visible text from medicine packages and prescriptions.",
    tags: ["Text Detection", "Image Preview", "Secure Upload"],
  },
  {
    label: "✦ STRUCTURED INFORMATION",
    title: "Turn images into useful details",
    text: "Use extracted text to identify medicine names, salts, dosage, and other information.",
    tags: ["Medicine Name", "Salt Details", "AI Analysis"],
  },
];
function App() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);

useEffect(() => {
  const slider = setInterval(() => {
    setCurrentSlide((previousSlide) =>
      previousSlide === slides.length - 1 ? 0 : previousSlide + 1
    );
  }, 5000);

  return () => clearInterval(slider);
}, []);

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
      "http://10.180.0.225:5000/api/extract",
      formData,
    );
    const salts=response.data.salts;
    setResult(salts.medicine+" was detected, salt(s) are : "+salts.salt|| "No readable text was found.");
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

      <section id="home" className="hero-carousel">
  {slides.map((slide, index) => (
    <article
      key={slide.title}
      className={`banner-slide ${index === currentSlide ? "active" : ""}`}
    >
      <span className="hero-label">{slide.label}</span>

      <h1>
        {slide.title.split(" ").slice(0, -1).join(" ")}{" "}
        <span>{slide.title.split(" ").slice(-1)}</span>
      </h1>

      <p>{slide.text}</p>

      <div className="feature-tags">
        {slide.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  ))}

  <button
    className="slide-button previous"
    onClick={() =>
      setCurrentSlide(
        currentSlide === 0 ? slides.length - 1 : currentSlide - 1
      )
    }
  >
    ‹
  </button>

  <button
    className="slide-button next"
    onClick={() =>
      setCurrentSlide(
        currentSlide === slides.length - 1 ? 0 : currentSlide + 1
      )
    }
  >
    ›
  </button>

  <div className="slide-dots">
    {slides.map((slide, index) => (
      <button
        key={slide.title}
        className={index === currentSlide ? "dot active-dot" : "dot"}
        onClick={() => setCurrentSlide(index)}
      />
    ))}
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