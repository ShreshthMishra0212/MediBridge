import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Shell Layouts
import { PatientLayout } from "./layouts/PatientLayout";
import { DoctorLayout } from "./layouts/DoctorLayout";

// Shared Login Page
import { LoginRegister } from "./pages/LoginRegister";

// Patient Pages
import { PatientDashboard } from "./pages/patient/PatientDashboard";
import { PatientAppointments } from "./pages/patient/PatientAppointments";
import { DoctorList } from "./pages/patient/DoctorList";
import { MedicalRecords } from "./pages/patient/MedicalRecords";
import { OcrScanner } from "./pages/patient/OcrScanner";
import { AiBriefing } from "./pages/patient/AiBriefing";
import { PatientProfile } from "./pages/patient/PatientProfile";
import { PatientPrescriptions } from "./pages/patient/PatientPrescriptions";

// Doctor Pages
import { DoctorDashboard } from "./pages/doctor/DoctorDashboard";
import { DoctorAppointments } from "./pages/doctor/DoctorAppointments";
import { DoctorRequests } from "./pages/doctor/DoctorRequests";
import { DoctorPrescriptions } from "./pages/doctor/DoctorPrescriptions";
import { DoctorProfile } from "./pages/doctor/DoctorProfile";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication page */}
          <Route path="/login" element={<LoginRegister />} />

          {/* Patient Role-Protected dashboard tree */}
          <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
            <Route path="/patient" element={<PatientLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="doctors" element={<DoctorList />} />
              <Route path="records" element={<MedicalRecords />} />
              <Route path="ocr" element={<OcrScanner />} />
              <Route path="ai-brief" element={<AiBriefing />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="prescriptions" element={<PatientPrescriptions />} />
            </Route>
          </Route>

          {/* Doctor Role-Protected dashboard tree */}
          <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
            <Route path="/doctor" element={<DoctorLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="requests" element={<DoctorRequests />} />
              <Route path="prescriptions" element={<DoctorPrescriptions />} />
              <Route path="profile" element={<DoctorProfile />} />
            </Route>
          </Route>

          {/* Default fallback route redirection */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;