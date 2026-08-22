import client from "./client";

// ==========================================
// AUTH SERVICES
// ==========================================
export const authApi = {
  login: async (email, password) => {
    const response = await client.post("/api/auth/login", { email, password });
    return response.data; // { message, token, user: { id, name, email, role } }
  },
  register: async (name, email, password, role) => {
    const response = await client.post("/api/auth/register", { name, email, password, role });
    return response.data; // { message, user }
  },
};

// ==========================================
// PATIENT SERVICES
// ==========================================
export const patientApi = {
  getProfile: async () => {
    const response = await client.get("/api/patients/me");
    return response.data; // { patient }
  },
  updateProfile: async (profileData) => {
    const response = await client.put("/api/patients/me", profileData);
    return response.data; // { message, patient }
  },
  getMedicalDocuments: async () => {
    const response = await client.get("/api/patients/me/medical-documents");
    return response.data; // { medical_documents }
  },
  uploadMedicalDocuments: async (formData) => {
    // Note: Content-Type header boundary will be auto-set by the browser
    const response = await client.post("/api/patients/me/medical-documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data; // { message, documents }
  },
  getDoctors: async () => {
    const response = await client.get("/api/patients/doctors");
    return response.data; // { doctors }
  },
  createAppointment: async (doctorId, date, time) => {
    const response = await client.post("/api/patients/appointments", {
      doctor_id: doctorId,
      date,
      time,
    });
    return response.data; // { message, appointment }
  },
  getAppointments: async () => {
    const response = await client.get("/api/patients/appointments");
    return response.data; // { appointments }
  },
  acceptReschedule: async (appointmentId) => {
    const response = await client.put(`/api/patients/appointments/${appointmentId}/accept`);
    return response.data; // { message, appointment }
  },
  rejectReschedule: async (appointmentId) => {
    const response = await client.put(`/api/patients/appointments/${appointmentId}/reject`);
    return response.data; // { message, appointment }
  },
  getPrescriptions: async () => {
    const response = await client.get("/api/patients/prescriptions");
    return response.data; // { prescriptions }
  },
  downloadPrescriptionPdf: async (prescriptionId) => {
    const response = await client.get(`/api/patients/prescriptions/${prescriptionId}/pdf`, {
      responseType: "blob",
    });
    return response.data; // Binary PDF blob
  },
  downloadPrescriptionDocx: async (prescriptionId) => {
    const response = await client.get(`/api/patients/prescriptions/${prescriptionId}/docx`, {
      responseType: "blob",
    });
    return response.data; // Binary DOCX blob
  },
};

// ==========================================
// DOCTOR SERVICES
// ==========================================
export const doctorApi = {
  getProfile: async () => {
    const response = await client.get("/api/doctors/profile");
    return response.data; // { doctor }
  },
  updateProfile: async (profileData) => {
    const response = await client.put("/api/doctors/profile", profileData);
    return response.data; // { message, doctor }
  },
  getAppointments: async () => {
    const response = await client.get("/api/doctors/appointments");
    return response.data; // { appointments }
  },
  acceptAppointment: async (appointmentId) => {
    const response = await client.put(`/api/doctors/appointments/${appointmentId}/accept`);
    return response.data; // { message, appointment }
  },
  suggestReschedule: async (appointmentId, date, time) => {
    const response = await client.put(`/api/doctors/appointments/${appointmentId}/suggest`, {
      date,
      time,
    });
    return response.data; // { message, appointment }
  },
  createGoogleMeet: async (appointmentId) => {
    const response = await client.post(`/api/doctors/appointments/${appointmentId}/meet`);
    return response.data; // { message, appointment_id, join_url, ... }
  },
  createPrescription: async (appointmentId, prescriptionData) => {
    const response = await client.post(
      `/api/doctors/appointments/${appointmentId}/prescription`,
      prescriptionData
    );
    return response.data; // { message, prescription }
  },
  getPrescriptions: async () => {
    const response = await client.get("/api/doctors/prescriptions");
    return response.data; // { prescriptions }
  },
  downloadPrescriptionFile: async (prescriptionId, fileType) => {
    const response = await client.get(`/api/doctors/prescriptions/${prescriptionId}/file/${fileType}`, {
      responseType: "blob",
    });
    return response.data; // Binary file blob
  },
};

// ==========================================
// OCR, UPLOADS & AI SERVICES (DIRECT ROUTES)
// ==========================================
export const directApi = {
  uploadHistory: async (patientId, formData) => {
    const response = await client.post(`/upload?fname=${patientId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data; // { status, files }
  },
  getBriefAssist: async (patientId) => {
    const response = await client.get(`/brief_assist?fname=${patientId}`);
    return response.data; // { status, summary }
  },
  extractOcr: async (formData) => {
    const response = await client.post("/api/extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data; // { salts: { medicine, salt } }
  },
  checkMeetStatus: async (expiresAt) => {
    const response = await client.get(`/api/check-status?expires_at=${expiresAt}`);
    return response.data; // { expired }
  },
};
