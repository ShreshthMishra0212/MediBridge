import { useState, useEffect } from "react";
import { patientApi } from "../../api/services";
import { Search, MapPin, Award, Star } from "lucide-react";

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

  // Local Search & Filtering
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.location && doc.location.toLowerCase().includes(search.toLowerCase()));
      
    const matchesSpecialty = 
      !specialty || 
      specialty === "All" || 
      doc.specialization === specialty;
      
    return matchesSearch && matchesSpecialty;
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
      setBookingSuccess("Appointment request submitted successfully!");
      // Reset inputs
      setBookingDate("");
      setBookingTime("");
      setTimeout(() => setSelectedDoctor(null), 1500);
    } catch (err) {
      console.error(err);
      setBookingError(err.response?.data?.error || "Failed to request appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <span className="spinner" style={{ borderTopColor: "var(--primary)" }}></span>
        <p>Searching doctor directory...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: "30px" }}>
        <h3>Find a Consultant Specialist</h3>
        <p className="text-muted" style={{ marginBottom: "20px" }}>
          Browse medical professionals, view specialties, and submit booking requests.
        </p>

        <div className="filters-row">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by consultant name, hospital, location..."
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
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="doctors-grid">
        {filteredDoctors.length === 0 ? (
          <p className="text-muted" style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>
            No medical consultants match your filters.
          </p>
        ) : (
          filteredDoctors.map((doc) => (
            <div key={doc.id} className="card doctor-card animated-hover">
              <div className="doctor-info-header">
                <div className="doctor-avatar-lg">
                  {doc.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 style={{ fontSize: "1.1rem" }}>{doc.name}</h4>
                  <p className="badge badge-confirmed" style={{ padding: "4px 10px", fontSize: "0.75rem", marginTop: "4px" }}>
                    {doc.specialization || "General Practitioner"}
                  </p>
                  <div className="rating-stars" style={{ display: "block", marginTop: "4px" }}>
                    <Star size={14} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "4px" }} />
                    <span>{doc.rating || "5.0"} Rating</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.9rem", color: "var(--text-dark)", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <MapPin size={16} className="text-muted" />
                  <span>Clinic: {doc.location || "Noida Facility"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Award size={16} className="text-muted" />
                  <span>Experience: {doc.experience || "5"} Years Practice</span>
                </div>
                {doc.description && (
                  <p style={{ marginTop: "12px", fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    "{doc.description}"
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedDoctor(doc);
                  setBookingError("");
                  setBookingSuccess("");
                }}
                className="btn btn-primary"
                style={{ marginTop: "10px" }}
              >
                Book Appointment
              </button>
            </div>
          ))
        )}
      </div>

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
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--text-muted)"
              }}
            >
              &times;
            </button>

            <h3>Book with {selectedDoctor.name}</h3>
            <p className="text-muted" style={{ marginBottom: "20px" }}>
              Submit a proposed slot. Please note selected slots are proposed and pending doctor confirmation.
            </p>

            {bookingError && <div className="alert alert-danger">{bookingError}</div>}
            {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}

            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label className="form-label">Proposed Appointment Date</label>
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
                <label className="form-label">Proposed Time Slot</label>
                <select
                  className="form-control"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                >
                  <option value="">Select Time</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
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
                  {bookingLoading ? <span className="spinner"></span> : "Confirm Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
