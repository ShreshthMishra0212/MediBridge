import React, { useEffect, useState, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import axios from "axios";

import "./index.css";

/* =========================================================
   LOGO
========================================================= */

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-xl shadow-lg shadow-teal-500/20">
        💊
      </div>

      <div>
        <div className="text-xl font-black tracking-tight">
          Medi<span className="text-teal-500">Bridge</span>
        </div>

        <p className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">
          Healthcare Intelligence
        </p>
      </div>
    </Link>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

function Navbar() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">

          <Logo />

          <nav className="hidden items-center gap-8 md:flex">

            <button
              onClick={() => setShowAbout(true)}
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-500"
            >
              About
            </button>

            <Link
              to="/patient"
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-500"
            >
              Patient
            </Link>

            <Link
              to="/doctor"
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-500"
            >
              Doctor
            </Link>

          </nav>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 sm:flex">

            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

            <span className="text-xs font-bold text-emerald-700">
              Platform Online
            </span>

          </div>

        </div>
      </header>

      {/* ABOUT MODAL */}

      {showAbout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-5 backdrop-blur-sm"
          onClick={() => setShowAbout(false)}
        >

          <div
            className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl md:p-9"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-start justify-between">

              <Logo />

              <button
                onClick={() => setShowAbout(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            <div className="mt-7">

              <h2 className="text-2xl font-black">
                Bridging healthcare through technology.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                MediBridge connects patients and doctors by making medicine
                information easier to extract, understand and organize.
              </p>

              <div className="mt-6 space-y-3">

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">
                    📷 Medicine Recognition
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Extract medicine information from images using OCR.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">
                    🤖 AI Appointment Assistant
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Get general guidance about which specialist may be
                    appropriate for your symptoms.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">
                    🩺 Doctor Recommendations
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Find highly rated doctors based on specialist and area.
                  </p>
                </div>

              </div>

            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="mt-7 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-teal-600"
            >
              Continue to MediBridge
            </button>

          </div>

        </div>
      )}
    </>
  );
}

/* =========================================================
   HOME
========================================================= */

function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">

      <Navbar />

      <main>

        <section className="relative overflow-hidden">

          <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

          <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />

          <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">

            <div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 shadow-sm">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100">
                  ✨
                </span>

                <span className="text-xs font-bold tracking-wide text-teal-700">
                  SMARTER HEALTHCARE
                </span>

              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-slate-900 md:text-6xl lg:text-7xl">

                Connecting

                <span className="block bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  Patients & Doctors
                </span>

                through better data.

              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-slate-500 md:text-lg">

                MediBridge is a healthcare platform that helps patients
                understand their medicines and enables doctors to access
                structured medical information through intelligent technology.

              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">

                <Link
                  to="/patient"
                  className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-7 py-4 text-sm font-black text-white shadow-xl shadow-teal-500/20 transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >

                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    👤
                  </span>

                  Patient Portal

                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>

                </Link>

                <Link
                  to="/doctor"
                  className="group flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-700 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:text-teal-600"
                >

                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                    🩺
                  </span>

                  Doctor Portal

                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>

                </Link>

              </div>

            </div>

            <div className="hidden lg:block">

              <div className="relative mx-auto max-w-[500px]">

                <div className="absolute inset-10 rounded-[50px] bg-teal-400/20 blur-3xl" />

                <div className="relative overflow-hidden rounded-[36px] border border-white bg-white/90 p-5 shadow-2xl">

                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                        🏥
                      </div>

                      <div>

                        <p className="text-sm font-black">
                          MediBridge
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Healthcare Dashboard
                        </p>

                      </div>

                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600">
                      ACTIVE
                    </span>

                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                          Medicine Analysis
                        </p>

                        <h3 className="mt-2 text-xl font-black">
                          Medicine Data
                        </h3>

                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400/10 text-2xl">
                        💊
                      </div>

                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-white/5 p-3">

                        <p className="text-[9px] text-slate-400">
                          MEDICINE
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          Paracetamol
                        </p>

                      </div>

                      <div className="rounded-xl bg-white/5 p-3">

                        <p className="text-[9px] text-slate-400">
                          STRENGTH
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          650 mg
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="my-5 flex justify-center">
                    <div className="h-10 w-px bg-teal-300" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        👤
                      </div>

                      <p className="mt-3 text-xs font-black">
                        Patient
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Medicine information
                      </p>

                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        🩺
                      </div>

                      <p className="mt-3 text-xs font-black">
                        Doctor
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Patient information
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        <section className="border-t border-slate-200 bg-white py-16">

          <div className="mx-auto max-w-7xl px-5 lg:px-8">

            <div className="mx-auto max-w-2xl text-center">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-500">
                One Healthcare Platform
              </p>

              <h2 className="mt-3 text-3xl font-black md:text-4xl">
                Built for better healthcare communication
              </h2>

            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">

              <FeatureCard
                icon="📷"
                title="Medicine OCR"
                text="Extract medicine information from images using OCR technology."
              />

              <FeatureCard
                icon="🤖"
                title="AI Appointment Assistant"
                text="Get general guidance about the appropriate medical specialist."
              />

              <FeatureCard
                icon="🩺"
                title="Doctor Recommendations"
                text="Find highly rated doctors according to specialist and location."
              />

            </div>

          </div>

        </section>

        <footer className="border-t border-slate-200 bg-slate-950 py-8 text-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-5">

            <Logo />

            <p className="text-xs text-slate-500">
              Healthcare information platform
            </p>

          </div>

        </footer>

      </main>

    </div>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({ icon, title, text }) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:-translate-y-2 hover:border-teal-200 hover:bg-white hover:shadow-xl">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl transition group-hover:scale-110">
        {icon}
      </div>

      <h3 className="mt-6 text-lg font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   PATIENT HEADER
========================================================= */

function PatientHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">

      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">

        <Logo />

        <Link
          to="/"
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
        >
          ← Home
        </Link>

      </div>

    </header>
  );
}

/* =========================================================
   PATIENT PORTAL
========================================================= */

function Patient() {
  return (
    <div className="min-h-screen bg-slate-50">

      <PatientHeader />

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">

        <div className="mb-8">

          <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-600">
            PATIENT PORTAL
          </span>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Welcome to MediBridge
          </h1>

          <p className="mt-4 max-w-2xl text-slate-500">
            Manage your medicines, appointments and prescriptions
            from one place.
          </p>

        </div>

        <div className="grid gap-6 md:grid-cols-3">

          <Link
            to="/medicine-analysis"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-teal-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
              💊
            </div>

            <h2 className="mt-6 text-xl font-black">
              Scan Medicine
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Upload a medicine image and get its name, salt,
              strength and other information.
            </p>

            <div className="mt-6 text-sm font-bold text-teal-500">
              Scan Medicine →
            </div>

          </Link>

          <Link
            to="/appointment"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-blue-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🤖
            </div>

            <h2 className="mt-6 text-xl font-black">
              AI Appointment
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Describe your symptoms, find the appropriate specialist
              and get highly rated doctor recommendations.
            </p>

            <div className="mt-6 text-sm font-bold text-blue-500">
              Find Doctor →
            </div>

          </Link>

          <Link
            to="/prescriptions"
            className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:border-violet-300 hover:shadow-xl"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
              📄
            </div>

            <h2 className="mt-6 text-xl font-black">
              Previous Prescriptions
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Upload and access your previous prescriptions
              whenever you need them.
            </p>

            <div className="mt-6 text-sm font-bold text-violet-500">
              View Prescriptions →
            </div>

          </Link>

        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Patient Activity
          </p>

          <h2 className="mt-1 text-xl font-black">
            Your Healthcare Dashboard
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <DashboardMiniCard
              icon="💊"
              title="Medicine"
              text="Scan and understand your medicine."
            />

            <DashboardMiniCard
              icon="🤖"
              title="AI Appointment"
              text="Find a suitable specialist and doctor."
            />

            <DashboardMiniCard
              icon="📄"
              title="Prescriptions"
              text="Access uploaded prescriptions."
            />

          </div>

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   DASHBOARD MINI CARD
========================================================= */

function DashboardMiniCard({ icon, title, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">

      <span className="text-2xl">
        {icon}
      </span>

      <p className="mt-3 text-sm font-bold">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   MEDICINE ANALYSIS
   REAL OCR API INTEGRATION
========================================================= */

function MedicineAnalysis() {

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");

  const [result, setResult] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageChange = (event) => {

    const selectedImage = event.target.files[0];

    if (!selectedImage) return;

    setImage(URL.createObjectURL(selectedImage));
    setImageFile(selectedImage);
    setImageName(selectedImage.name);
    setResult(null);
  };

  const handleGenerateText = async () => {

    if (!imageFile) return;

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();

    formData.append("image", imageFile);

    try {

      const response = await axios.post(
        "http://10.180.0.225:5000/api/extract",
        formData
      );

      console.log("OCR response:", response.data);

      const salts = response.data?.salts;

      if (salts) {

        setResult({
          medicine: salts.medicine || "Unknown",
          salt: salts.salt || "Unknown"
        });

      } else {

        setResult({
          medicine: "No medicine detected",
          salt: "No salt detected"
        });

      }

    } catch (error) {

      console.error("OCR API error:", error);

      setResult({
        error:
          "Could not connect to the DeepSeek OCR API."
      });

    } finally {

      setIsLoading(false);

    }
  };

  const handleRemoveImage = () => {

    setImage(null);
    setImageFile(null);
    setImageName("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      <PatientHeader />

      <main className="mx-auto max-w-6xl px-5 py-12">

        <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-600">
          MEDICINE OCR
        </span>

        <h1 className="mt-5 text-4xl font-black">
          Scan Medicine
        </h1>

        <p className="mt-3 text-slate-500">
          Upload a clear medicine image and MediBridge will send it
          to your OCR backend.
        </p>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          {!image ? (

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center transition hover:border-teal-400">

              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-50 text-4xl">
                💊
              </div>

              <h2 className="mt-6 text-xl font-black">
                Upload Medicine Image
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                PNG, JPG or JPEG
              </p>

              <span className="mt-6 rounded-xl bg-slate-900 px-7 py-3 text-sm font-bold text-white">
                Choose Image
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

            </label>

          ) : (

            <div className="text-center">

              <p className="font-bold text-slate-700">
                Selected: {imageName}
              </p>

              <img
                src={image}
                alt="Uploaded medicine"
                className="mx-auto mt-6 max-h-80 rounded-2xl object-contain shadow-lg"
              />

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">

                <button
                  onClick={handleGenerateText}
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-7 py-3 font-bold text-white disabled:opacity-50"
                >
                  {isLoading
                    ? "Reading Image..."
                    : "Generate Text →"}
                </button>

                <button
                  onClick={handleRemoveImage}
                  className="rounded-xl bg-slate-100 px-7 py-3 font-bold text-slate-600 hover:bg-slate-200"
                >
                  Remove Image
                </button>

              </div>

            </div>

          )}

          {result && (

            <div className="mt-8 rounded-3xl bg-slate-950 p-7 text-white">

              <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
                OCR RESULT
              </p>

              {result.error ? (

                <p className="mt-4 text-red-300">
                  {result.error}
                </p>

              ) : (

                <>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">

                    <div className="rounded-2xl bg-white/5 p-5">

                      <p className="text-xs text-slate-400">
                        MEDICINE
                      </p>

                      <p className="mt-2 text-xl font-black">
                        {result.medicine}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/5 p-5">

                      <p className="text-xs text-slate-400">
                        SALT
                      </p>

                      <p className="mt-2 text-xl font-black">
                        {result.salt}
                      </p>

                    </div>

                  </div>

                  <p className="mt-5 text-sm text-slate-400">
                    {result.medicine} was detected. Salt:
                    {" "}
                    {result.salt}
                  </p>

                </>

              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   APPOINTMENT PAGE
   AI + SPECIALIST + RATING WISE DOCTORS
========================================================= */

function Appointment() {

  const [symptoms, setSymptoms] = useState("");

  const [aiLoading, setAiLoading] = useState(false);

  const [specialist, setSpecialist] = useState("");

  const [aiAdvice, setAiAdvice] = useState("");

  const [area, setArea] = useState("");

  const [doctor, setDoctor] = useState("");

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [booked, setBooked] = useState(false);

  /* =======================================================
     DOCTOR DATA

     In production this should come from your backend.
  ======================================================= */

  const doctors = [

    {
      id: 1,
      name: "Dr. Ankit Sharma",
      specialist: "General Physician",
      area: "Noida",
      rating: 4.9,
      experience: "12 Years",
      fee: "₹500",
    },

    {
      id: 2,
      name: "Dr. Priya Mehta",
      specialist: "Cardiologist",
      area: "Noida",
      rating: 4.8,
      experience: "15 Years",
      fee: "₹1000",
    },

    {
      id: 3,
      name: "Dr. Rahul Verma",
      specialist: "Dermatologist",
      area: "Noida",
      rating: 4.7,
      experience: "10 Years",
      fee: "₹700",
    },

    {
      id: 4,
      name: "Dr. Neha Gupta",
      specialist: "General Physician",
      area: "Delhi",
      rating: 4.9,
      experience: "14 Years",
      fee: "₹600",
    },

    {
      id: 5,
      name: "Dr. Arjun Kapoor",
      specialist: "Orthopedic",
      area: "Delhi",
      rating: 4.8,
      experience: "16 Years",
      fee: "₹900",
    },

    {
      id: 6,
      name: "Dr. Simran Kaur",
      specialist: "Gynecologist",
      area: "Ghaziabad",
      rating: 4.9,
      experience: "13 Years",
      fee: "₹800",
    },

    {
      id: 7,
      name: "Dr. Mohit Singh",
      specialist: "ENT Specialist",
      area: "Ghaziabad",
      rating: 4.6,
      experience: "9 Years",
      fee: "₹600",
    },

  ];

  /* =======================================================
     AI CHATBOT
  ======================================================= */

  const askAI = async () => {

    if (!symptoms.trim()) {

      alert("Please describe your symptoms first.");

      return;
    }

    setAiLoading(true);
    setAiAdvice("");

    /*
      DEMO AI LOGIC.

      Later replace this with:

      const response = await axios.post(
        "http://localhost:5000/api/ai/specialist",
        {
          symptoms: symptoms
        }
      );

      setSpecialist(response.data.specialist);
      setAiAdvice(response.data.advice);
    */

    setTimeout(() => {

      const text = symptoms.toLowerCase();

      let recommendedSpecialist =
        "General Physician";

      let advice =
        "Based on the information provided, starting with a General Physician may be appropriate.";

      if (
        text.includes("heart") ||
        text.includes("chest pain") ||
        text.includes("palpitation") ||
        text.includes("blood pressure")
      ) {

        recommendedSpecialist = "Cardiologist";

        advice =
          "Your symptoms may require evaluation of the heart and cardiovascular system. A Cardiologist may be appropriate.";

      } else if (
        text.includes("skin") ||
        text.includes("rash") ||
        text.includes("acne") ||
        text.includes("itching")
      ) {

        recommendedSpecialist = "Dermatologist";

        advice =
          "Your symptoms appear related to the skin. A Dermatologist may be the appropriate specialist.";

      } else if (
        text.includes("bone") ||
        text.includes("joint") ||
        text.includes("fracture") ||
        text.includes("back pain")
      ) {

        recommendedSpecialist = "Orthopedic";

        advice =
          "Your symptoms may involve bones, joints or muscles. An Orthopedic specialist may be appropriate.";

      } else if (
        text.includes("ear") ||
        text.includes("nose") ||
        text.includes("throat") ||
        text.includes("hearing")
      ) {

        recommendedSpecialist = "ENT Specialist";

        advice =
          "Your symptoms appear related to the ear, nose or throat. An ENT Specialist may be appropriate.";

      } else if (
        text.includes("pregnancy") ||
        text.includes("period") ||
        text.includes("menstrual") ||
        text.includes("pregnant")
      ) {

        recommendedSpecialist = "Gynecologist";

        advice =
          "For reproductive, menstrual or pregnancy-related concerns, a Gynecologist may be appropriate.";

      }

      setSpecialist(recommendedSpecialist);

      setAiAdvice(advice);

      setAiLoading(false);

    }, 1500);
  };

  /* =======================================================
     FILTER + SORT DOCTORS
  ======================================================= */

  const recommendedDoctors = doctors
    .filter((item) => {

      const specialistMatch =
        !specialist ||
        item.specialist === specialist;

      const areaMatch =
        !area ||
        item.area === area;

      return specialistMatch && areaMatch;

    })
    .sort((a, b) => b.rating - a.rating);

  /* =======================================================
     BOOK
  ======================================================= */

  const handleBooking = (e) => {

    e.preventDefault();

    if (!doctor || !date || !time) {

      alert(
        "Please select doctor, date and time."
      );

      return;
    }

    setBooked(true);
  };

  /* =======================================================
     BOOKED PAGE
  ======================================================= */

  if (booked) {

    const selectedDoctor =
      doctors.find(
        (item) => item.id === Number(doctor)
      );

    return (
      <div className="min-h-screen bg-slate-50">

        <PatientHeader />

        <main className="mx-auto max-w-4xl px-5 py-12">

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-3xl text-white">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Appointment Booked
            </h1>

            <p className="mt-2 text-slate-500">
              Your appointment has been successfully booked.
            </p>

            {selectedDoctor && (

              <div className="mt-7 rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm">
                  <strong>Doctor:</strong>{" "}
                  {selectedDoctor.name}
                </p>

                <p className="mt-3 text-sm">
                  <strong>Specialist:</strong>{" "}
                  {selectedDoctor.specialist}
                </p>

                <p className="mt-3 text-sm">
                  <strong>Area:</strong>{" "}
                  {selectedDoctor.area}
                </p>

                <p className="mt-3 text-sm">
                  <strong>Rating:</strong>{" "}
                  ⭐ {selectedDoctor.rating}
                </p>

                <p className="mt-3 text-sm">
                  <strong>Date:</strong>{" "}
                  {date}
                </p>

                <p className="mt-3 text-sm">
                  <strong>Time:</strong>{" "}
                  {time}
                </p>

              </div>

            )}

            <Link
              to="/patient"
              className="mt-7 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-teal-600"
            >
              Back to Patient Portal
            </Link>

          </div>

        </main>

      </div>
    );
  }

  /* =======================================================
     APPOINTMENT UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      <PatientHeader />

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">

        {/* HEADER */}

        <div className="mb-10">

          <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
            AI APPOINTMENT ASSISTANT
          </span>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Find the right doctor
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Tell our AI assistant about your symptoms. It can suggest
            an appropriate specialist and help you find highly rated
            doctors in your area.
          </p>

        </div>

        {/* =================================================
            AI CHATBOT
        ================================================= */}

        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-xl">

          <div className="p-7 md:p-9">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-3xl">
                🤖
              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
                  MediBridge AI
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Which specialist do I need?
                </h2>

              </div>

              <div className="ml-auto hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 md:block">
                ● AI ONLINE
              </div>

            </div>

            <div className="mt-7 rounded-2xl bg-white/5 p-5">

              <p className="text-sm leading-7 text-slate-300">
                👋 Hello! Tell me what you're experiencing.
                For example:
              </p>

              <p className="mt-3 rounded-xl bg-white/5 p-4 text-sm italic text-slate-400">
                "I have frequent headaches and dizziness."
              </p>

              <p className="mt-3 text-xs text-slate-500">
                This assistant provides general guidance and does not
                replace professional medical diagnosis.
              </p>

            </div>

            <textarea
              value={symptoms}
              onChange={(e) =>
                setSymptoms(e.target.value)
              }
              placeholder="Describe your symptoms or health concern..."
              rows={4}
              className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400"
            />

            <button
              type="button"
              onClick={askAI}
              disabled={aiLoading}
              className="mt-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLoading
                ? "🤖 AI is analyzing..."
                : "Ask AI Assistant →"}
            </button>

            {aiAdvice && (

              <div className="mt-6 rounded-2xl border border-teal-400/20 bg-teal-400/10 p-6">

                <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
                  AI Recommendation
                </p>

                <h3 className="mt-3 text-xl font-black">
                  Recommended Specialist
                </h3>

                <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/5 p-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/20 text-2xl">
                    🩺
                  </div>

                  <div>

                    <p className="font-black text-white">
                      {specialist}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Recommended based on the symptoms provided
                    </p>

                  </div>

                </div>

                <p className="mt-5 text-sm leading-7 text-slate-300">
                  {aiAdvice}
                </p>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            AREA + SPECIALIST
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              📍
            </div>

            <div>

              <h2 className="text-xl font-black">
                Find doctors near you
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Select your preferred area.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div>

              <label className="text-sm font-bold text-slate-700">
                Area
              </label>

              <select
                value={area}
                onChange={(e) => {

                  setArea(e.target.value);

                  setDoctor("");

                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              >

                <option value="">
                  Select area
                </option>

                <option value="Noida">
                  Noida
                </option>

                <option value="Delhi">
                  Delhi
                </option>

                <option value="Ghaziabad">
                  Ghaziabad
                </option>

              </select>

            </div>

            <div>

              <label className="text-sm font-bold text-slate-700">
                Specialist
              </label>

              <select
                value={specialist}
                onChange={(e) => {

                  setSpecialist(e.target.value);

                  setDoctor("");

                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              >

                <option value="">
                  Any specialist
                </option>

                <option value="General Physician">
                  General Physician
                </option>

                <option value="Cardiologist">
                  Cardiologist
                </option>

                <option value="Dermatologist">
                  Dermatologist
                </option>

                <option value="Orthopedic">
                  Orthopedic
                </option>

                <option value="ENT Specialist">
                  ENT Specialist
                </option>

                <option value="Gynecologist">
                  Gynecologist
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* =================================================
            DOCTOR RECOMMENDATIONS
        ================================================= */}

        <section className="mt-8">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-widest text-teal-500">
                DOCTOR RECOMMENDATIONS
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Highly rated doctors
              </h2>

            </div>

            <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600">
              ⭐ Rating Wise
            </span>

          </div>

          {recommendedDoctors.length === 0 ? (

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center">

              <p className="text-4xl">
                🔎
              </p>

              <p className="mt-3 font-bold text-slate-700">
                No doctors found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Try another area or specialist.
              </p>

            </div>

          ) : (

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              {recommendedDoctors.map(
                (item, index) => (

                  <div
                    key={item.id}
                    className={`rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                      Number(doctor) === item.id
                        ? "border-teal-400 ring-2 ring-teal-100"
                        : "border-slate-200"
                    }`}
                  >

                    <div className="flex items-start justify-between">

                      <div className="flex gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                          🩺
                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <h3 className="font-black">
                              {item.name}
                            </h3>

                            {index === 0 && (

                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
                                TOP RATED
                              </span>

                            )}

                          </div>

                          <p className="mt-1 text-sm text-teal-600">
                            {item.specialist}
                          </p>

                        </div>

                      </div>

                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">

                        <p className="text-sm font-black text-amber-600">
                          ⭐ {item.rating}
                        </p>

                        <p className="text-[9px] text-slate-400">
                          Rating
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-[9px] text-slate-400">
                          AREA
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          {item.area}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-[9px] text-slate-400">
                          EXPERIENCE
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          {item.experience}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-[9px] text-slate-400">
                          FEE
                        </p>

                        <p className="mt-1 text-xs font-bold">
                          {item.fee}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDoctor(String(item.id))
                      }
                      className={`mt-5 w-full rounded-xl py-3 text-sm font-bold transition ${
                        Number(doctor) === item.id
                          ? "bg-teal-500 text-white"
                          : "bg-slate-900 text-white hover:bg-teal-600"
                      }`}
                    >

                      {Number(doctor) === item.id
                        ? "✓ Doctor Selected"
                        : "Select Doctor"}

                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* =================================================
            BOOKING
        ================================================= */}

        <section className="mt-8">

          <form
            onSubmit={handleBooking}
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
          >

            <p className="text-xs font-bold uppercase tracking-widest text-blue-500">
              BOOKING DETAILS
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Select appointment time
            </h2>

            <div className="mt-7">

              <label className="text-sm font-bold text-slate-700">
                Selected Doctor
              </label>

              <select
                value={doctor}
                onChange={(e) =>
                  setDoctor(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              >

                <option value="">
                  Select a recommended doctor
                </option>

                {recommendedDoctors.map(
                  (item) => (

                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} — ⭐ {item.rating} —{" "}
                      {item.specialist}
                    </option>

                  )
                )}

              </select>

            </div>

            <div className="mt-6">

              <label className="text-sm font-bold text-slate-700">
                Select Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />

            </div>

            <div className="mt-6">

              <label className="text-sm font-bold text-slate-700">
                Select Time
              </label>

              <select
                value={time}
                onChange={(e) =>
                  setTime(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500"
              >

                <option value="">
                  Choose a time
                </option>

                <option value="10:00 AM">
                  10:00 AM
                </option>

                <option value="11:00 AM">
                  11:00 AM
                </option>

                <option value="12:00 PM">
                  12:00 PM
                </option>

                <option value="2:00 PM">
                  2:00 PM
                </option>

                <option value="4:00 PM">
                  4:00 PM
                </option>

                <option value="6:00 PM">
                  6:00 PM
                </option>

              </select>

            </div>

            <button
              type="submit"
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              Confirm Appointment →
            </button>

          </form>

        </section>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-xs leading-6 text-amber-700">

            ⚠️ <strong>Important:</strong> The AI assistant provides
            general informational guidance only. It does not diagnose
            medical conditions or replace a qualified healthcare
            professional.

          </p>

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   PRESCRIPTIONS
========================================================= */

function Prescriptions() {

  const [file, setFile] = useState(null);

  const [prescriptions, setPrescriptions] =
    useState([]);

  const handleUpload = (e) => {

    const selectedFile =
      e.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);

    setPrescriptions((prev) => [

      ...prev,

      {
        name: selectedFile.name,
        date: new Date().toLocaleDateString(),
      },

    ]);

  };

  return (
    <div className="min-h-screen bg-slate-50">

      <PatientHeader />

      <main className="mx-auto max-w-5xl px-5 py-12">

        <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-bold text-violet-600">
          PRESCRIPTIONS
        </span>

        <h1 className="mt-5 text-4xl font-black">
          Previous Prescriptions
        </h1>

        <p className="mt-3 text-slate-500">
          Upload and manage your previous prescriptions.
        </p>

        <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
            📄
          </div>

          <h2 className="mt-5 text-xl font-black">
            Upload Prescription
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Upload PDF, JPG or PNG prescription
          </p>

          <label className="mt-6 inline-block cursor-pointer rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-7 py-3 text-sm font-bold text-white shadow-lg">

            Choose File

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              className="hidden"
            />

          </label>

          {file && (

            <p className="mt-4 text-sm font-bold text-emerald-600">
              ✓ {file.name} uploaded
            </p>

          )}

        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

          <h2 className="text-xl font-black">
            Uploaded Prescriptions
          </h2>

          {prescriptions.length === 0 ? (

            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">

              <p className="text-3xl">
                📂
              </p>

              <p className="mt-3 text-sm font-bold text-slate-600">
                No prescriptions uploaded yet
              </p>

            </div>

          ) : (

            <div className="mt-6 space-y-3">

              {prescriptions.map(
                (prescription, index) => (

                  <div
                    key={index}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                        📄
                      </div>

                      <div>

                        <p className="text-sm font-bold">
                          {prescription.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          Uploaded {prescription.date}
                        </p>

                      </div>

                    </div>

                    <span className="text-xs font-bold text-emerald-500">
                      Uploaded
                    </span>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   DOCTOR PORTAL
========================================================= */

function Doctor() {

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">

        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">

          <Logo />

          <Link
            to="/"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            ← Home
          </Link>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">

        <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
          DOCTOR PORTAL
        </span>

        <h1 className="mt-5 text-4xl font-black md:text-5xl">
          Doctor Dashboard
        </h1>

        <p className="mt-4 max-w-2xl text-slate-500">
          Access structured medicine information and patient healthcare data.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">

          <DoctorCard
            icon="👥"
            title="Patients"
            text="View your patient information."
          />

          <DoctorCard
            icon="💊"
            title="Medicine Data"
            text="View structured medicine information."
          />

          <DoctorCard
            icon="📊"
            title="Analytics"
            text="View healthcare and medicine analytics."
          />

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   DOCTOR CARD
========================================================= */

function DoctorCard({ icon, title, text }) {

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:shadow-xl">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        {icon}
      </div>

      <h2 className="mt-6 text-xl font-black">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/patient"
          element={<Patient />}
        />

        <Route
          path="/medicine-analysis"
          element={<MedicineAnalysis />}
        />

        <Route
          path="/appointment"
          element={<Appointment />}
        />

        <Route
          path="/prescriptions"
          element={<Prescriptions />}
        />

        <Route
          path="/doctor"
          element={<Doctor />}
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;