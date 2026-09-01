import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import {
  Search,
  MapPin,
  Award,
  Star,
  BrainCircuit,
  Volume2,
  VolumeX,
  Languages,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  X,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { useSpeech } from "../../hooks/useSpeech";
import { useVoiceInput } from "../../hooks/useVoiceInput";

const COMMON_SYMPTOM_CHIPS = [
  "Fever & Body Chills",
  "Severe Menstrual Cramps",
  "Skin Rash & Itching",
  "Chest Tightness & Palpitations",
  "Infant Cough & Fever",
  "Joint & Knee Pain",
  "Persistent Headache",
  "Ear Infection & Sore Throat",
];

export const DoctorList = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Doctor Detail View Modal
  const [viewDoctorProfile, setViewDoctorProfile] = useState(null);

  // AI Doctor Finder State
  const [symptoms, setSymptoms] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiLang, setAiLang] = useState("en");

  const { toggle, speaking, currentLang, stop } = useSpeech();

  const handleVoiceTranscript = (text) => {
    setSymptoms(text);
  };

  const { listening, toggleListening, isSupported: isMicSupported } = useVoiceInput({
    onTranscript: handleVoiceTranscript,
    lang: "en-IN",
  });

  const fetchDoctors = async () => {
    try {
      const response = await patientApi.getDoctors();
      setDoctors(response.doctors || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch doctor directory list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Extract unique specialties for filtering chips
  const specialties = ["All", ...new Set(doctors.map((d) => d.specialization).filter(Boolean))];

  // AI Doctor Recommendation Handler
  const handleAiRecommend = async (customSymptoms) => {
    const textToAnalyze = (typeof customSymptoms === "string" ? customSymptoms : symptoms).trim();
    if (!textToAnalyze) {
      setAiError("Please describe your health symptoms first.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    stop();
    try {
      const response = await patientApi.aiRecommendSpecialty(textToAnalyze);
      setAiResult(response);
      // Auto-set specialty filter to recommended specialty
      if (response.specialty) {
        setSpecialty(response.specialty);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.error || "AI analysis failed. Please try again or select specialty manually.");
    } finally {
      setAiLoading(false);
    }
  };

  // Local Search & Filtering with Recommended Specialist Sorting
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.location && doc.location.toLowerCase().includes(search.toLowerCase())) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(search.toLowerCase()));

    const matchesSpecialty =
      !specialty || specialty === "All" || doc.specialization?.toLowerCase() === specialty.toLowerCase();

    return matchesSearch && matchesSpecialty;
  });

  // Sort matching recommended specialists to the top
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (aiResult?.specialty) {
      const aMatch = a.specialization?.toLowerCase() === aiResult.specialty.toLowerCase();
      const bMatch = b.specialization?.toLowerCase() === aiResult.specialty.toLowerCase();
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return (b.rating || 5) - (a.rating || 5);
  });

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");
    setBookingLoading(true);

    if (!bookingDate || !bookingTime) {
      setBookingError("Please select a date and proposed time slot.");
      setBookingLoading(false);
      return;
    }

    try {
      await patientApi.createAppointment(selectedDoctor.id, bookingDate, bookingTime);
      setBookingSuccess("Appointment request submitted successfully! Pending doctor confirmation.");
      setBookingDate("");
      setBookingTime("");
      setTimeout(() => {
        setSelectedDoctor(null);
        setBookingSuccess("");
      }, 1800);
    } catch (err) {
      console.error(err);
      setBookingError(err.response?.data?.error || "Failed to request appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p style={{ marginTop: "16px" }}>Searching verified doctor network...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* AI Doctor Finder Section Powered by Groq */}
      <div className="card" style={{ marginBottom: "30px", borderLeft: "5px solid var(--primary)", background: "linear-gradient(to right, hsla(var(--hue), 85%, 98%, 0.8), #ffffff)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
              <BrainCircuit size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>AI Doctor Triage & Specialist Finder</h3>
              <small className="text-muted">Powered by Groq Clinical Intelligence — Speaks & listens in English and Hindi</small>
            </div>
          </div>
          <span className="badge badge-confirmed" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Sparkles size={12} /> Live AI Triage
          </span>
        </div>

        {/* Quick Symptom Chips */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "12px" }}>
          {COMMON_SYMPTOM_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-outline"
              style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "20px", whiteSpace: "nowrap", width: "auto" }}
              onClick={() => {
                setSymptoms(chip);
                handleAiRecommend(chip);
              }}
            >
              + {chip}
            </button>
          ))}
        </div>

        {/* Textarea + Voice Input Button */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe what you are experiencing (e.g. 'Severe throbbing headache with nausea for 2 days' or 'तेज बुखार और जोड़ों में दर्द')..."
            className="form-control"
            rows={3}
            style={{ resize: "vertical", paddingRight: isMicSupported ? "48px" : "16px" }}
            disabled={aiLoading}
          />
          {isMicSupported && (
            <button
              type="button"
              onClick={toggleListening}
              style={{
                position: "absolute",
                right: "12px",
                bottom: "12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background: listening ? "#fee2e2" : "var(--primary-light)",
                color: listening ? "#dc2626" : "var(--primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={listening ? "Stop recording" : "Speak symptoms"}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        {listening && (
          <div style={{ fontSize: "0.8rem", color: "#dc2626", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px", borderTopColor: "#dc2626" }}></span>
            <span>Listening... Speak your symptoms clearly</span>
          </div>
        )}

        {aiError && <div className="alert alert-danger" style={{ marginBottom: "12px" }}>{aiError}</div>}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => handleAiRecommend(symptoms)}
            className="btn btn-primary"
            style={{ width: "auto", padding: "10px 24px" }}
            disabled={aiLoading || !symptoms.trim()}
          >
            {aiLoading ? (
              <>
                <span className="spinner"></span> Analyzing Symptoms...
              </>
            ) : (
              <>
                <BrainCircuit size={16} /> Recommend Specialist
              </>
            )}
          </button>

          {aiResult && (
            <button
              onClick={() => {
                setAiResult(null);
                setSpecialty("");
                stop();
              }}
              className="btn btn-outline"
              style={{ width: "auto", padding: "10px 16px" }}
            >
              Clear AI Filter
            </button>
          )}
        </div>

        {/* AI Result Card */}
        {aiResult && (
          <div style={{ marginTop: "20px", padding: "18px", backgroundColor: "var(--primary-light)", borderRadius: "12px", border: "1px solid hsla(var(--hue), 85%, 55%, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <small className="text-muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  AI Recommended Medical Specialty
                </small>
                <h4 style={{ margin: "4px 0 0", color: "var(--primary)", fontSize: "1.3rem" }}>
                  ★ {aiResult.specialty}
                </h4>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                  <span className="badge badge-confirmed" style={{ fontSize: "0.75rem" }}>
                    {sortedDoctors.filter(d => d.specialization?.toLowerCase() === aiResult.specialty.toLowerCase()).length} Specialist(s) Available
                  </span>
                  {aiResult.urgency && (
                    <span className="badge badge-proposed" style={{ fontSize: "0.75rem" }}>
                      Triage Urgency: {aiResult.urgency}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setAiLang(aiLang === "en" ? "hi" : "en")}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Languages size={14} /> {aiLang === "en" ? "हिंदी में देखें" : "View in English"}
                </button>
                <button
                  onClick={() =>
                    toggle(
                      aiLang === "en" ? aiResult.reasoning : aiResult.reasoning_hindi,
                      aiLang
                    )
                  }
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  {speaking && currentLang === aiLang ? (
                    <>
                      <VolumeX size={14} /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} /> {aiLang === "hi" ? "सुनें" : "Listen"}
                    </>
                  )}
                </button>
              </div>
            </div>

            <p style={{ margin: "8px 0 0", fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-dark)" }}>
              {aiLang === "en" ? aiResult.reasoning : aiResult.reasoning_hindi}
            </p>

            {aiResult.selfCareTips && aiResult.selfCareTips.length > 0 && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(0, 102, 204, 0.2)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Immediate Self-Care Steps:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "20px", fontSize: "0.85rem" }}>
                  {aiResult.selfCareTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0 }}>Find a Consulting Specialist</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Showing {sortedDoctors.length} verified doctors available for online Google Meet consultations
            </p>
          </div>
        </div>

        <div className="filters-row">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by doctor name, specialty, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            {specialties.map((spec) => (
              <option key={spec} value={spec === "All" ? "" : spec}>
                {spec === "All" ? "All Specialties" : spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="doctors-grid">
        {sortedDoctors.length === 0 ? (
          <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px" }}>
            <p className="text-muted">No doctors found matching your criteria. Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          sortedDoctors.map((doc) => {
            const isAiMatch = aiResult?.specialty && doc.specialization?.toLowerCase() === aiResult.specialty.toLowerCase();
            return (
              <div
                key={doc.id}
                className="card doctor-card animated-hover"
                style={{
                  position: "relative",
                  border: isAiMatch ? "2px solid var(--primary)" : "1px solid var(--border)",
                  boxShadow: isAiMatch ? "0 8px 24px rgba(0, 102, 204, 0.15)" : "var(--shadow-sm)",
                }}
              >
                {isAiMatch && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "16px",
                      backgroundColor: "var(--primary)",
                      color: "white",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(0, 102, 204, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Sparkles size={11} /> Recommended
                  </div>
                )}

                <div className="doctor-info-header">
                  <div className="doctor-avatar-lg">
                    {doc.name ? doc.name[0].toUpperCase() : "D"}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "1.1rem", margin: 0 }}>{doc.name}</h4>
                    <span className="badge badge-confirmed" style={{ padding: "3px 10px", fontSize: "0.75rem", marginTop: "6px", display: "inline-block" }}>
                      {doc.specialization || "General Physician"}
                    </span>
                    <div className="rating-stars" style={{ display: "block", marginTop: "4px" }}>
                      <Star size={14} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      <span>{doc.rating ? Number(doc.rating).toFixed(1) : "5.0"} Rating</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.88rem", color: "var(--text-dark)", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <MapPin size={15} className="text-muted" />
                    <span>{doc.location || "Online Telehealth / MediBridge Facility"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Award size={15} className="text-muted" />
                    <span>{doc.experience ? `${doc.experience} Years Clinical Practice` : "Senior Consultant"}</span>
                  </div>
                  {doc.description && (
                    <p style={{ marginTop: "10px", fontStyle: "italic", fontSize: "0.82rem", color: "var(--text-muted)", lineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      "{doc.description}"
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    onClick={() => setViewDoctorProfile(doc)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: "9px 12px", fontSize: "0.82rem" }}
                  >
                    View Bio
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setBookingError("");
                      setBookingSuccess("");
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1.3, padding: "9px 12px", fontSize: "0.82rem" }}
                  >
                    <Calendar size={14} /> Book Slot
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Doctor Bio Modal */}
      {viewDoctorProfile && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "520px", width: "100%", position: "relative" }}>
            <button
              onClick={() => setViewDoctorProfile(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div className="doctor-avatar-lg" style={{ width: "72px", height: "72px", fontSize: "1.8rem" }}>
                {viewDoctorProfile.name ? viewDoctorProfile.name[0].toUpperCase() : "D"}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{viewDoctorProfile.name}</h3>
                <span className="badge badge-confirmed" style={{ marginTop: "6px", display: "inline-block" }}>
                  {viewDoctorProfile.specialization || "General Physician"}
                </span>
                <div className="rating-stars" style={{ display: "block", marginTop: "4px" }}>
                  <Star size={14} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "4px" }} />
                  <span>{viewDoctorProfile.rating || "5.0"} Rating</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={16} className="text-primary" />
                <span><strong>Location:</strong> {viewDoctorProfile.location || "MediBridge Telehealth Network"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={16} className="text-primary" />
                <span><strong>Experience:</strong> {viewDoctorProfile.experience || "5+"} Years Clinical Practice</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={16} className="text-primary" />
                <span><strong>Consultation Mode:</strong> Google Meet Video / Telemedicine</span>
              </div>

              {viewDoctorProfile.description && (
                <div style={{ marginTop: "12px", padding: "14px", backgroundColor: "var(--light)", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Doctor Biography:</strong>
                  <p style={{ margin: "6px 0 0", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{viewDoctorProfile.description}"
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setViewDoctorProfile(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedDoctor(viewDoctorProfile);
                  setViewDoctorProfile(null);
                }}
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Dialog Modal */}
      {selectedDoctor && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", position: "relative" }}>
            <button
              onClick={() => setSelectedDoctor(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>

            <h3>Book Consultation</h3>
            <p className="text-muted" style={{ marginBottom: "20px", fontSize: "0.88rem" }}>
              Consulting with <strong>{selectedDoctor.name}</strong> ({selectedDoctor.specialization || "General Physician"}).
            </p>

            {bookingError && <div className="alert alert-danger">{bookingError}</div>}
            {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}

            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label className="form-label">Consultation Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={bookingDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Time Slot</label>
                <select
                  className="form-control"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                >
                  <option value="">-- Select Time Slot --</option>
                  <option value="09:00 AM">09:00 AM (Morning)</option>
                  <option value="10:00 AM">10:00 AM (Morning)</option>
                  <option value="11:00 AM">11:00 AM (Morning)</option>
                  <option value="12:00 PM">12:00 PM (Noon)</option>
                  <option value="01:00 PM">01:00 PM (Afternoon)</option>
                  <option value="02:00 PM">02:00 PM (Afternoon)</option>
                  <option value="03:00 PM">03:00 PM (Afternoon)</option>
                  <option value="04:00 PM">04:00 PM (Evening)</option>
                  <option value="05:00 PM">05:00 PM (Evening)</option>
                  <option value="06:00 PM">06:00 PM (Evening)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedDoctor(null)}
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <>
                      <span className="spinner"></span> Submitting...
                    </>
                  ) : (
                    "Confirm Booking Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
