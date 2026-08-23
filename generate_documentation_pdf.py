import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (on pages after cover)
        if self._pageNumber > 1:
            self.drawString(54, 750, "MediBridge — Technical Codebase Documentation & Developer Guide")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.drawString(54, 36, "Confidential — Internal Developer Reference — MediBridge")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf(filename="MediBridge_Codebase_Documentation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0284C7")     # Medical Sky Blue
    dark_slate = colors.HexColor("#0F172A")        # Slate 900
    text_color = colors.HexColor("#334155")        # Slate 700
    bg_light = colors.HexColor("#F8FAFC")          # Slate 50
    border_color = colors.HexColor("#E2E8F0")      # Slate 200
    accent_green = colors.HexColor("#10B981")      # Emerald 500

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=dark_slate,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=dark_slate,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_color,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=dark_slate,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=text_color
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # =========================================================================
    # COVER / HEADER
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("MediBridge — Full Architecture & Codebase Documentation", title_style))
    story.append(Paragraph("A Comprehensive Developer Guide, File-by-File Reference, API Map & Modification Manual", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceBefore=4, spaceAfter=14))

    # =========================================================================
    # 1. PROJECT OVERVIEW
    # =========================================================================
    story.append(Paragraph("1. Project Overview", h1_style))
    story.append(Paragraph(
        "<b>MediBridge</b> is an end-to-end intelligent telemedicine and clinical records management platform designed to connect patients and specialized healthcare providers seamlessly. Built as a decoupled web application with a <b>React (Vite)</b> frontend and a <b>Python (Flask)</b> backend, MediBridge incorporates advanced artificial intelligence for patient triage, doctor matching, clinical report synthesis, optical character recognition (OCR), and assistive voice capabilities.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Core Pillars:</b><br/>"
        "• <b>Patient Portal:</b> Allows patients to browse specialist directories manually or describe health symptoms in plain natural language. Google Gemini analyzes the complaint to recommend the exact medical specialty, automatically filters registered doctors, and facilitates slot booking. Patients can also upload clinical history files to receive bilingual AI summaries, view past prescriptions with speech playback, and scan medicine packaging.<br/>"
        "• <b>Doctor Portal:</b> Empowers consulting clinicians with a dedicated <b>AI Medical Briefer</b> tab. Doctors select authorized patients connected through existing appointments and generate multi-section clinical briefs summarizing past conditions, prescriptions, test observations, and medical timelines in English and Hindi. Clinicians can manage appointments, propose reschedules, generate one-click Google Meet video rooms, and issue digital prescriptions with automatic PDF and DOCX file generation.<br/>"
        "• <b>Bilingual Voice Support:</b> Universal integration of the HTML5 Web SpeechSynthesis API enabling clear text-to-speech (TTS) in English (<code>en-IN</code>) and Hindi (<code>hi-IN</code>) across prescriptions and AI briefings with zero audio overlap.",
        body_style
    ))

    # =========================================================================
    # 2. TECHNOLOGY STACK
    # =========================================================================
    story.append(Paragraph("2. Technology Stack", h1_style))
    
    tech_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology", table_header_style), Paragraph("Exact Role & Implementation Purpose", table_header_style)],
        [Paragraph("Frontend Framework", table_cell_style), Paragraph("React 19 + Vite", table_cell_code), Paragraph("Single Page Application (SPA) architecture with fast HMR, client-side routing, and modular components", table_cell_style)],
        [Paragraph("Routing & Layout", table_cell_style), Paragraph("react-router-dom v7", table_cell_code), Paragraph("Protected role-based nested routing for <code>/patient/*</code> and <code>/doctor/*</code> dashboard layouts", table_cell_style)],
        [Paragraph("Icons & UI", table_cell_style), Paragraph("lucide-react", table_cell_code), Paragraph("Consistent clean vector iconography across all dashboard panels and action buttons", table_cell_style)],
        [Paragraph("HTTP Client", table_cell_style), Paragraph("Axios v1.19", table_cell_code), Paragraph("Configured central instance with request interceptors auto-attaching Bearer JWT tokens and handling 401 unauth", table_cell_style)],
        [Paragraph("Backend Framework", table_cell_style), Paragraph("Python Flask + CORS", table_cell_code), Paragraph("Modular REST API structured with Flask Blueprints (<code>auth_bp</code>, <code>patient_bp</code>, <code>doctor_bp</code>)", table_cell_style)],
        [Paragraph("Authentication", table_cell_style), Paragraph("PyJWT + Werkzeug", table_cell_code), Paragraph("Stateless cryptographic JWT token issuance, password scrypt hashing, and decorator-based route guards", table_cell_style)],
        [Paragraph("Generative AI", table_cell_style), Paragraph("google-genai (Gemini 2.0/Flash)", table_cell_code), Paragraph("Powers natural-language triage specialty classification, patient history synthesis, and doctor clinical briefs", table_cell_style)],
        [Paragraph("OCR & Vision AI", table_cell_style), Paragraph("NVIDIA Nemotron OCR v2", table_cell_code), Paragraph("Cloud vision endpoint extracting text from packaging; paired with regex salt lookup in <code>med_salts.py</code>", table_cell_style)],
        [Paragraph("Document Gen", table_cell_style), Paragraph("ReportLab + python-docx", table_cell_code), Paragraph("Server-side dynamic compilation of clinical prescription assets into downloadable PDF and DOCX files", table_cell_style)],
        [Paragraph("Telehealth Meet", table_cell_style), Paragraph("Google Calendar API v3", table_cell_code), Paragraph("Automated creation of scheduled Google Meet conferences with OAuth2 token persistence", table_cell_style)],
        [Paragraph("Data Storage", table_cell_style), Paragraph("Flat-File JSON Storage", table_cell_code), Paragraph("Thread-safe atomic read/write abstraction (<code>storage.py</code>) managing JSON entities in <code>backend/data/</code>", table_cell_style)],
        [Paragraph("Voice / TTS", table_cell_style), Paragraph("Web SpeechSynthesis API", table_cell_code), Paragraph("Browser-native audio synthesizer hook supporting Indian English (<code>en-IN</code>) and Hindi (<code>hi-IN</code>)", table_cell_style)],
    ]

    t_tech = Table(tech_data, colWidths=[110, 130, 264])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_tech)

    # =========================================================================
    # 3. COMPLETE PROJECT TREE
    # =========================================================================
    story.append(Paragraph("3. Complete Project Directory Structure", h1_style))
    story.append(Paragraph(
        "The project follows a clean decoupled structure where the root directory contains the React Vite application and the <code>backend/</code> folder houses the Python microservice.",
        body_style
    ))

    tree_text = """MediBridge-MERGED/
├── package.json                   # Frontend npm manifest & scripts (dev, build, lint)
├── vite.config.js                 # Vite bundler configuration & React plugin
├── index.html                     # HTML root entry point with Google Fonts
├── src/
│   ├── main.jsx                   # React root rendering App inside StrictMode
│   ├── App.jsx                    # Root router with ProtectedRoute trees for Patient & Doctor
│   ├── App.css                    # Unified design system variables (colors, cards, badges)
│   ├── api/
│   │   ├── client.js              # Axios instance with Bearer JWT interceptor & 401 listener
│   │   └── services.js            # Modular API service methods (authApi, patientApi, doctorApi, directApi)
│   ├── context/
│   │   └── AuthContext.jsx        # Authentication context provider (token, user, login, logout)
│   ├── components/
│   │   └── ProtectedRoute.jsx     # Route guard validating authentication state & role permissions
│   ├── hooks/
│   │   └── useSpeech.js           # Reusable bilingual SpeechSynthesis hook (en-IN/hi-IN, stop, toggle)
│   ├── layouts/
│   │   ├── PatientLayout.jsx      # Patient sidebar navigation shell with active route highlights
│   │   └── DoctorLayout.jsx       # Doctor sidebar navigation shell including AI Briefer tab
│   └── pages/
│       ├── LoginRegister.jsx      # Unified tabbed authentication screen (Login & Register for both roles)
│       ├── patient/
│       │   ├── PatientDashboard.jsx     # Patient overview: metrics, upcoming consultations, quick actions
│       │   ├── DoctorList.jsx           # AI Doctor Finder (symptom input + TTS) + manual specialty filter
│       │   ├── PatientAppointments.jsx  # Booking history, status badges, reschedule acceptance/rejection
│       │   ├── PatientPrescriptions.jsx # Prescriptions archive with bilingual detail modal, TTS & downloads
│       │   ├── AiBriefing.jsx           # Patient report upload & Gemini health summary generator with TTS
│       │   ├── OcrScanner.jsx           # Medicine packaging scanner using NVIDIA Nemotron OCR endpoint
│       │   ├── MedicalRecords.jsx       # Diagnostic PDF document manager with upload and preview
│       │   └── PatientProfile.jsx       # Patient demographic and contact info management
│       └── doctor/
│           ├── DoctorDashboard.jsx      # Doctor overview: schedule counts, pending requests, quick shortcuts
│           ├── DoctorAppointments.jsx   # Clinical schedule: Google Meet generator, prescription writer
│           ├── DoctorRequests.jsx       # Inbound patient booking requests: Accept or propose new slot
│           ├── DoctorAiBriefer.jsx      # AI Medical Briefer: authorized patient selector & structured summary
│           ├── DoctorPrescriptions.jsx  # Written prescriptions archive with bilingual viewer & downloads
│           └── DoctorProfile.jsx        # Doctor professional credentials, specialization & clinic location
└── backend/
    ├── index.py                   # Main Flask server entry point, CORS configuration & blueprint registration
    ├── requirements.txt           # Python dependency specifications
    ├── config.py                  # Environment config resolver & secret definitions
    ├── storage.py                 # File I/O abstraction managing JSON collections with threading locks
    ├── briefer.py                 # Google Gemini prompt engineering for patient history summarization
    ├── med_salts.py               # Medicine database & regex parser matching active pharmaceutical salts
    ├── meeting_generator.py       # Google Calendar API integration generating Google Meet video links
    ├── .env / .env.example        # Environment secret variables (Google API Key, NVIDIA OCR, Secret Key)
    ├── data/                      # Flat JSON database collections
    │   ├── users.json             # User authentication records (passwords scrypt-hashed)
    │   ├── patients.json          # Patient demographics and uploaded medical document references
    │   ├── doctors.json           # Doctor professional profiles, ratings, and specializations
    │   ├── appointments.json      # Consultation booking records, proposed times, and Meet links
    │   └── prescriptions.json     # Digital prescription records with structured medicine arrays
    ├── routes/
    │   ├── auth.py                # Authentication endpoints: /login and /register
    │   ├── auth_utils.py          # Token decorator guards (@token_required, @doctor_required)
    │   ├── patient.py             # Patient endpoints: /me, /appointments, /doctors, /ai-recommend-specialty
    │   └── doctor.py              # Doctor endpoints: /profile, /appointments, /my-patients, /ai-brief
    ├── utils/
    │   └── prescription_generator.py # ReportLab and python-docx dynamic prescription file builders
    ├── history/                   # Uploaded patient clinical history files for AI analysis
    ├── prescriptions/             # Generated prescription PDF and DOCX files
    └── uploads/                   # Stored patient medical diagnostic PDFs"""
    
    story.append(Paragraph(tree_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    # =========================================================================
    # 4. FILE-BY-FILE DOCUMENTATION
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("4. File-by-File Technical Reference", h1_style))
    story.append(Paragraph(
        "This section documents every core source-code file in the codebase, detailing its responsibility, exported symbols, internal logic, and exact situations warranting modification.",
        body_style
    ))

    files_doc = [
        {
            "name": "src/hooks/useSpeech.js",
            "purpose": "Universal custom React hook providing browser-native Text-to-Speech capabilities.",
            "contains": "useSpeech() hook, speak(text, lang), stop(), toggle(text, lang), speaking, currentLang state",
            "depends": "Browser window.speechSynthesis API, React useState/useCallback/useEffect/useRef",
            "used_by": "DoctorList.jsx, AiBriefing.jsx, DoctorAiBriefer.jsx, PatientPrescriptions.jsx, DoctorPrescriptions.jsx",
            "logic": "Preloads voices asynchronously on mount. Prioritizes 'hi-IN' for Hindi and 'en-IN' for English. Ensures strictly zero speech overlap by invoking window.speechSynthesis.cancel() before triggering any new utterance. Automatically cancels active speech when components unmount or pages change.",
            "modify_when": "Modify when adjusting speech rate, pitch, default voice selection priorities, or adding custom speech controls (pause/resume)."
        },
        {
            "name": "src/pages/patient/DoctorList.jsx",
            "purpose": "Patient doctor discovery and appointment booking page featuring dual-mode manual and AI-powered specialist search.",
            "contains": "DoctorList component, handleAiRecommend(), handleBookSubmit(), filter logic, booking modal",
            "depends": "patientApi (services.js), useSpeech hook, lucide-react icons",
            "used_by": "Rendered at route /patient/doctors via PatientLayout",
            "logic": "Renders an AI Doctor Finder prompt box where patients submit natural-language symptoms. Dispatches to patientApi.aiRecommendSpecialty(), receives recommended specialty + bilingual rationale, and automatically updates the specialty filter state to instantly show matching doctors. Preserves the full manual drop-down filter and appointment proposal dialog modal.",
            "modify_when": "Modify when changing doctor card layouts, rating displays, booking time-slot options, or AI suggestion display styles."
        },
        {
            "name": "src/pages/doctor/DoctorAiBriefer.jsx",
            "purpose": "Doctor clinical briefing dashboard facilitating authorized patient medical history review and Gemini-powered briefing synthesis.",
            "contains": "DoctorAiBriefer component, handleGenerateBrief(), getBriefFullText(), collapsible history preview, bilingual brief renderer",
            "depends": "doctorApi (services.js), useSpeech hook, lucide-react icons",
            "used_by": "Rendered at route /doctor/ai-briefer via DoctorLayout",
            "logic": "Fetches authorized patients via doctorApi.getMyPatients(). On selection, loads historical records. Dispatches doctorApi.generateAiBrief(patientId) to call the backend Gemini summarizer. Renders 7 structured clinical sections (Summary, Conditions, Prescriptions, Reports, Observations, Key Points, Timeline) with an English/Hindi toggle and section-level TTS.",
            "modify_when": "Modify when altering clinical briefing section schemas, adding export-to-PDF options, or customizing clinician alert disclaimers."
        },
        {
            "name": "src/pages/patient/PatientPrescriptions.jsx & DoctorPrescriptions.jsx",
            "purpose": "Prescription archive interfaces allowing patients and doctors to view details, listen to prescriptions bilingually, and download files.",
            "contains": "Prescription table, handleDownload(), getPrescriptionSpeechText(), prescription detail modal with TTS",
            "depends": "patientApi / doctorApi (services.js), useSpeech hook, lucide-react icons",
            "used_by": "Rendered at /patient/prescriptions and /doctor/prescriptions",
            "logic": "Fetches prescription list. Clicking 'View & Listen' opens a modal with complete medicine items (dosage, frequency, duration, instructions), doctor diagnosis, advice, and follow-up date. Includes an English/Hindi audio button that reads the entire prescription using the useSpeech hook.",
            "modify_when": "Modify when changing prescription table columns, modal layout, or medicine formatting."
        },
        {
            "name": "backend/routes/patient.py",
            "purpose": "Flask Blueprint handling all patient-specific REST endpoints and data mutations.",
            "contains": "get_my_profile, update_my_profile, upload_medical_documents, get_medical_documents, create_appointment, get_my_appointments, accept_suggested_appointment, reject_suggested_appointment, get_my_prescriptions, download_prescription_pdf/docx, get_all_doctors, ai_recommend_specialty",
            "depends": "Flask, storage.py, routes.auth_utils.token_required, google.genai, json, uuid",
            "used_by": "Registered in index.py under prefix /api/patients",
            "logic": "Implements strict patient authentication. Route /ai-recommend-specialty reads active doctor specializations from doctors.json, prompts Gemini 2.0 to classify the patient's symptom text into one of the available specializations, and returns the specialty along with bilingual explanations.",
            "modify_when": "Modify when adding patient profile fields, changing appointment status transitions, or altering AI triage prompts."
        },
        {
            "name": "backend/routes/doctor.py",
            "purpose": "Flask Blueprint managing doctor schedules, appointment approvals, meeting creation, prescriptions, and AI briefings.",
            "contains": "get_doctor_profile, update_doctor_profile, get_doctor_appointments, accept_appointment, create_appointment_meet, suggest_appointment_time, create_prescription, get_doctor_prescriptions, get_my_patients, get_patient_history, generate_ai_brief",
            "depends": "Flask, storage.py, auth_utils (token_required, doctor_required), prescription_generator.py, meeting_generator.py, google.genai",
            "used_by": "Registered in index.py under prefix /api/doctors",
            "logic": "Enforces doctor ownership on all appointments. /my-patients returns unique patients connected via appointments. /patient/<id>/history and /patient/<id>/ai-brief verify that the requesting doctor has a legitimate appointment with the patient before reading data or invoking Gemini for structured synthesis.",
            "modify_when": "Modify when updating doctor profile schema, prescription creation fields, appointment proposal logic, or doctor brief prompts."
        },
        {
            "name": "backend/briefer.py",
            "purpose": "AI health report summarization engine powered by Google Gemini SDK.",
            "contains": "_get_client(), empty_result(), summarize_health_report(report_text, file_paths)",
            "depends": "google.genai, dotenv, json, os",
            "used_by": "index.py (/brief_assist endpoint for patient AI health briefing)",
            "logic": "Uploads patient clinical history files (.pdf, .png, .jpg) to Gemini files API, constructs a bilingual prompt instructing Gemini to return JSON with 6 specific fields (summary, duration, purpose, instruction, precaution, medicines) in English and Hindi without hallucinations.",
            "modify_when": "Modify when changing the patient health report prompt, supported file types, or JSON output fields."
        },
        {
            "name": "backend/utils/prescription_generator.py",
            "purpose": "Automated clinical prescription document compiler generating binary PDF and DOCX assets.",
            "contains": "generate_prescription_files(prescription), generate_prescription_pdf(), generate_prescription_docx()",
            "depends": "reportlab (SimpleDocTemplate, Paragraph, Table, Spacer), docx (Document, Inches, Pt), os, uuid",
            "used_by": "doctor.py (invoked automatically during create_prescription)",
            "logic": "Takes structured prescription dictionary, builds styled medical letterhead with MediBridge branding, doctor info, patient metadata, medicine table, clinical advice, and signature line. Saves both .pdf and .docx files in backend/prescriptions/ and returns their relative paths.",
            "modify_when": "Modify when altering prescription document styling, adding clinic logos, or adjusting table layouts."
        },
        {
            "name": "backend/storage.py",
            "purpose": "Thread-safe data persistence layer for flat-file JSON collections.",
            "contains": "read_data(filename), write_data(filename, data), threading.Lock",
            "depends": "json, os, threading",
            "used_by": "auth.py, patient.py, doctor.py",
            "logic": "Resolves absolute paths in backend/data/. Locks file operations with threading.Lock to prevent race conditions during concurrent requests. Automatically initializes empty collections if files are missing.",
            "modify_when": "Modify when migrating from flat JSON files to a relational database (PostgreSQL/MySQL/SQLite) or MongoDB."
        }
    ]

    for f in files_doc:
        story.append(Paragraph(f"<b>File:</b> <code>{f['name']}</code>", h2_style))
        story.append(Paragraph(f"• <b>Purpose:</b> {f['purpose']}", body_style))
        story.append(Paragraph(f"• <b>Exported Symbols / Contains:</b> {f['contains']}", body_style))
        story.append(Paragraph(f"• <b>Dependencies:</b> {f['depends']}", body_style))
        story.append(Paragraph(f"• <b>Used By:</b> {f['used_by']}", body_style))
        story.append(Paragraph(f"• <b>Key Implementation Logic:</b> {f['logic']}", body_style))
        story.append(Paragraph(f"• <b>Modify When:</b> <i>{f['modify_when']}</i>", body_style))
        story.append(Spacer(1, 4))

    # =========================================================================
    # 5. COMPLETE API DOCUMENTATION TABLE
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("5. Complete Backend API Route Reference", h1_style))
    story.append(Paragraph("The following table documents every active REST endpoint exposed by the Flask backend application.", body_style))

    api_rows = [
        [Paragraph("Method & Route", table_header_style), Paragraph("Auth & Role", table_header_style), Paragraph("Input (Payload / Query)", table_header_style), Paragraph("Output & Purpose", table_header_style)],
        [Paragraph("POST /api/auth/register", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("name, email, password, role ('patient'|'doctor')", table_cell_style), Paragraph("Creates user record & role entity; returns 201", table_cell_style)],
        [Paragraph("POST /api/auth/login", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("email, password", table_cell_style), Paragraph("Validates credentials; returns JWT token + user profile", table_cell_style)],
        [Paragraph("GET /api/patients/me", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns current patient demographic details", table_cell_style)],
        [Paragraph("PUT /api/patients/me", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("age, gender, phone, address", table_cell_style), Paragraph("Updates patient demographics in patients.json", table_cell_style)],
        [Paragraph("GET /api/patients/doctors", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns full directory of registered doctors", table_cell_style)],
        [Paragraph("POST /api/patients/ai-recommend-specialty", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("{ symptoms: string }", table_cell_style), Paragraph("Gemini evaluates problem -> returns specialty + EN/HI rationale", table_cell_style)],
        [Paragraph("POST /api/patients/appointments", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("doctor_id, date, time", table_cell_style), Paragraph("Creates Pending appointment request", table_cell_style)],
        [Paragraph("GET /api/patients/appointments", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns all appointments for logged-in patient", table_cell_style)],
        [Paragraph("PUT /api/patients/appointments/<id>/accept", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Accepts doctor's proposed rescheduled date/time", table_cell_style)],
        [Paragraph("PUT /api/patients/appointments/<id>/reject", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Rejects doctor's proposed reschedule -> Cancelled", table_cell_style)],
        [Paragraph("POST /api/patients/me/medical-documents", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("multipart/form-data: files (.pdf)", table_cell_style), Paragraph("Saves diagnostic documents in uploads/ folder", table_cell_style)],
        [Paragraph("GET /api/patients/me/medical-documents", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns patient's uploaded PDF document metadata", table_cell_style)],
        [Paragraph("GET /api/patients/prescriptions", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns prescriptions written for this patient", table_cell_style)],
        [Paragraph("GET /api/patients/prescriptions/<id>/pdf", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Streams binary PDF prescription download", table_cell_style)],
        [Paragraph("GET /api/patients/prescriptions/<id>/docx", table_cell_code), Paragraph("JWT (Patient)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Streams binary DOCX prescription download", table_cell_style)],
        [Paragraph("GET /api/doctors/profile", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns doctor's professional profile", table_cell_style)],
        [Paragraph("PUT /api/doctors/profile", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("specialization, description, location, experience", table_cell_style), Paragraph("Updates doctor credentials & practice details", table_cell_style)],
        [Paragraph("GET /api/doctors/appointments", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns appointments assigned to logged-in doctor", table_cell_style)],
        [Paragraph("PUT /api/doctors/appointments/<id>/accept", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Confirms pending appointment request", table_cell_style)],
        [Paragraph("PUT /api/doctors/appointments/<id>/suggest", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("{ date: string, time: string }", table_cell_style), Paragraph("Proposes alternate consultation time (Reschedule Proposed)", table_cell_style)],
        [Paragraph("POST /api/doctors/appointments/<id>/meet", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Creates Google Meet room via Google Calendar API", table_cell_style)],
        [Paragraph("POST /api/doctors/appointments/<id>/prescription", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("diagnosis, medicines[], advice, follow_up_date", table_cell_style), Paragraph("Generates PDF/DOCX assets and saves prescription record", table_cell_style)],
        [Paragraph("GET /api/doctors/prescriptions", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns all prescriptions authored by this doctor", table_cell_style)],
        [Paragraph("GET /api/doctors/my-patients", table_cell_code), Paragraph("JWT (Doctor)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns unique patients connected via appointments", table_cell_style)],
        [Paragraph("GET /api/doctors/patient/<id>/history", table_cell_code), Paragraph("JWT (Doctor - Auth)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Returns patient history (guarded by appointment check)", table_cell_style)],
        [Paragraph("POST /api/doctors/patient/<id>/ai-brief", table_cell_code), Paragraph("JWT (Doctor - Auth)", table_cell_style), Paragraph("None", table_cell_style), Paragraph("Synthesizes 7-section clinical brief via Gemini (EN/HI)", table_cell_style)],
        [Paragraph("POST /upload", table_cell_code), Paragraph("Public / ID", table_cell_style), Paragraph("query ?fname=ID, multipart files", table_cell_style), Paragraph("Saves patient history files into history/ folder", table_cell_style)],
        [Paragraph("GET /brief_assist", table_cell_code), Paragraph("Public / ID", table_cell_style), Paragraph("query ?fname=ID", table_cell_style), Paragraph("Calls Gemini briefer on history/ files for patient summary", table_cell_style)],
        [Paragraph("POST /api/extract", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("multipart image: file", table_cell_style), Paragraph("NVIDIA Nemotron OCR extraction & salt matching", table_cell_style)],
    ]

    t_api = Table(api_rows, colWidths=[140, 75, 125, 164])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), dark_slate),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_api)

    # =========================================================================
    # 6. SYSTEM WORKFLOWS & ARCHITECTURE
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("6. Key System Workflows", h1_style))

    # Patient Workflow
    story.append(Paragraph("Patient Journey & AI Doctor Finder Flow", h2_style))
    story.append(Paragraph(
        "1. <b>Authentication:</b> Patient registers/logs in via <code>LoginRegister.jsx</code> -> Receives JWT -> Stored in <code>localStorage</code>.<br/>"
        "2. <b>Option A (Manual Discovery):</b> Patient visits <code>DoctorList.jsx</code> -> Filters by specialty dropdown -> Views real-time registered doctors -> Clicks 'Book Appointment'.<br/>"
        "3. <b>Option B (AI Doctor Finder):</b> Patient inputs natural language complaint (e.g. <i>'Frequent itchy red rashes on forehead'</i>) -> Triggers <code>patientApi.aiRecommendSpecialty()</code> -> Backend sends symptoms + available doctor specialties to Gemini -> Gemini classifies as 'Dermatologist' with bilingual rationale -> Frontend updates specialty filter state to 'Dermatologist' -> Filtered doctors appear -> Patient can listen to reasoning in English/Hindi via <code>useSpeech</code> -> Patient books slot.<br/>"
        "4. <b>Slot Booking:</b> Submits proposed date and time -> <code>appointments.json</code> records request with status <code>'Pending'</code>.",
        body_style
    ))

    # Doctor Workflow
    story.append(Paragraph("Doctor Consultation & AI Medical Briefer Flow", h2_style))
    story.append(Paragraph(
        "1. <b>Dashboard & Inbound Requests:</b> Doctor checks <code>DoctorRequests.jsx</code> to accept appointments or propose alternate times (<code>'Reschedule Proposed'</code>).<br/>"
        "2. <b>AI Medical Briefer:</b> Doctor navigates to <code>DoctorAiBriefer.jsx</code> -> Dropdown lists patients with confirmed/pending appointments via <code>doctorApi.getMyPatients()</code>.<br/>"
        "3. <b>Brief Generation:</b> Doctor clicks 'Generate AI Brief' -> <code>doctor.py</code> verifies doctor-patient relationship, bundles past prescriptions and appointment logs, and prompts Gemini 2.0 -> Structured JSON response returned with 7 distinct clinical sections in both English and Hindi.<br/>"
        "4. <b>Voice Playback:</b> Doctor toggles language (English | हिंदी) and clicks 'Listen' -> <code>useSpeech.js</code> streams synthesis via <code>SpeechSynthesisUtterance</code>.<br/>"
        "5. <b>Consultation & Prescription:</b> Doctor creates instant Google Meet via <code>meeting_generator.py</code>, conducts call, and writes prescription -> Backend compiles downloadable PDF and DOCX files.",
        body_style
    ))

    # Data Structures
    story.append(Paragraph("7. Database Entity Schemas (backend/data/*.json)", h1_style))
    schema_text = """// users.json
{ "id": "uuid", "name": "string", "email": "string", "password": "scrypt_hash", "role": "patient|doctor" }

// patients.json
{ "id": "uuid", "name": "string", "email": "string", "age": 30, "gender": "Male", "phone": "string", "address": "string", "medical_documents": [{ "id": "uuid", "original_name": "report.pdf", "filename": "uuid.pdf", "path": "uploads/uuid.pdf" }] }

// doctors.json
{ "id": "uuid", "name": "string", "email": "string", "specialization": "Cardiologist", "description": "string", "location": "string", "experience": 8, "rating": 5.0, "available_slots": [] }

// appointments.json
{ "id": "uuid", "patient_id": "uuid", "doctor_id": "uuid", "doctorName": "string", "specialist": "string", "date": "YYYY-MM-DD", "time": "10:00 AM", "status": "Pending|Confirmed|Reschedule Proposed|Cancelled", "join_url": "https://meet.google.com/...", "event_id": "string" }

// prescriptions.json
{ "id": "uuid", "appointment_id": "uuid", "doctor_id": "uuid", "doctor_name": "string", "specialization": "string", "patient_id": "uuid", "patient_name": "string", "date": "YYYY-MM-DD", "diagnosis": "string", "medicines": [{ "name": "string", "dosage": "string", "frequency": "string", "duration": "string", "instructions": "string" }], "advice": "string", "follow_up_date": "string", "pdf": "prescriptions/uuid.pdf", "docx": "prescriptions/uuid.docx" }"""
    story.append(Paragraph(schema_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    # =========================================================================
    # 8. COMMON MODIFICATION SCENARIOS ("WHERE DO I MAKE CHANGES?")
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("8. Developer Practical Modification Guide", h1_style))
    story.append(Paragraph("When extending or refactoring MediBridge, refer to this exact file-mapping directory:", body_style))

    scenarios = [
        ("1. Change Patient Dashboard UI / Statistics", "Modify <code>src/pages/patient/PatientDashboard.jsx</code> and CSS in <code>src/App.css</code>."),
        ("2. Change Doctor Dashboard UI / Actions", "Modify <code>src/pages/doctor/DoctorDashboard.jsx</code> and <code>src/layouts/DoctorLayout.jsx</code>."),
        ("3. Modify AI Doctor Recommendation Prompt", "Modify <code>backend/routes/patient.py</code> under route <code>ai_recommend_specialty</code> (Gemini prompt string)."),
        ("4. Adjust AI Doctor Finder Frontend UI / Styling", "Modify <code>src/pages/patient/DoctorList.jsx</code> (AI Doctor Finder card section)."),
        ("5. Customize Doctor AI Medical Briefer Sections", "Modify prompt in <code>backend/routes/doctor.py</code> (<code>generate_ai_brief</code>) and section renderers in <code>src/pages/doctor/DoctorAiBriefer.jsx</code>."),
        ("6. Modify Voice / TTS Behavior or Voices", "Modify <code>src/hooks/useSpeech.js</code> (language tag matching, pitch, rate, or pause/resume logic)."),
        ("7. Alter Prescription PDF / DOCX Layout & Branding", "Modify <code>backend/utils/prescription_generator.py</code> (ReportLab styles, table headers, document margins)."),
        ("8. Change Prescription Data Fields (e.g., adding lab tests)", "Update <code>DoctorAppointments.jsx</code> (form inputs), <code>doctor.py</code> (<code>create_prescription</code>), and <code>PatientPrescriptions.jsx</code> (modal viewer)."),
        ("9. Modify User Authentication & Token Lifetimes", "Modify <code>backend/routes/auth.py</code> (JWT payload, expiration timedelta) and <code>backend/routes/auth_utils.py</code>."),
        ("10. Add a New Protected Backend Endpoint", "Create route in <code>backend/routes/patient.py</code> or <code>doctor.py</code>, decorate with <code>@token_required</code> (and <code>@doctor_required</code> if doctor), and add corresponding method in <code>src/api/services.js</code>.")
    ]

    for title, desc in scenarios:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(f"• <b>Action:</b> {desc}", body_style))
        story.append(Spacer(1, 2))

    # =========================================================================
    # 9. SETUP & RUN GUIDE
    # =========================================================================
    story.append(Paragraph("9. Setup & Local Execution Guide", h1_style))
    story.append(Paragraph(
        "Follow these exact verified commands to launch the complete MediBridge stack locally.",
        body_style
    ))

    story.append(Paragraph("Terminal 1 — Backend (Flask API on Port 5000)", h2_style))
    cmd_backend = """# 1. Navigate to backend directory
cd backend

# 2. Activate virtual environment (Windows PowerShell)
.\\venv\\Scripts\\Activate.ps1
# Or on Windows Command Prompt: venv\\Scripts\\activate.bat
# Or on macOS/Linux: source venv/bin/activate

# 3. Verify / Install Dependencies
pip install -r requirements.txt

# 4. Start Flask Backend Server
python index.py
# Server runs on: http://localhost:5000 (or http://127.0.0.1:5000)"""
    story.append(Paragraph(cmd_backend.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    story.append(Paragraph("Terminal 2 — Frontend (React Vite on Port 5173)", h2_style))
    cmd_frontend = """# 1. From repository root directory
# Ensure Node.js v18+ is installed

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Vite Development Server
npm run dev
# App runs on: http://localhost:5173"""
    story.append(Paragraph(cmd_frontend.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    story.append(Paragraph("Environment Variables Configuration (backend/.env)", h2_style))
    env_table_data = [
        [Paragraph("Variable Name", table_header_style), Paragraph("Required?", table_header_style), Paragraph("Purpose & Service", table_header_style)],
        [Paragraph("SECRET_KEY", table_cell_code), Paragraph("Yes", table_cell_style), Paragraph("Cryptographic signing key for PyJWT authentication tokens", table_cell_style)],
        [Paragraph("GOOGLE_API_KEY", table_cell_code), Paragraph("Yes", table_cell_style), Paragraph("Google Gemini API Key powering AI Doctor Finder, Patient Health Brief, and Doctor AI Briefer", table_cell_style)],
        [Paragraph("NVIDIA_API_KEY", table_cell_code), Paragraph("Optional", table_cell_style), Paragraph("API key for NVIDIA Nemotron OCR v2 label scanner endpoint", table_cell_style)],
        [Paragraph("NVIDIA_OCR_URL", table_cell_code), Paragraph("Optional", table_cell_style), Paragraph("NVIDIA OCR cloud endpoint URL (defaults to nemotron-ocr-v2)", table_cell_style)],
    ]
    t_env = Table(env_table_data, colWidths=[130, 70, 304])
    t_env.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_env)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Documentation successfully built: {filename}")

if __name__ == "__main__":
    output_filename = sys.argv[1] if len(sys.argv) > 1 else "MediBridge_Codebase_Documentation.pdf"
    build_pdf(output_filename)
