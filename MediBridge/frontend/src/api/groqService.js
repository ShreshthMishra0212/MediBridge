// Dedicated Groq AI Client for MediBridge Frontend
// Powers real-time medical triage, AI chatbot, medicine explanations, and bilingual Hindi/English synthesis

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_AUDIO_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "qwen/qwen3.8-27b";

/**
 * Generic chat completion against Groq API
 */
export const callGroqChat = async ({
  messages,
  systemPrompt = "",
  model = DEFAULT_MODEL,
  temperature = 0.3,
  maxTokens = 2048,
  jsonMode = false,
}) => {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: "system", content: systemPrompt });
  }
  formattedMessages.push(...messages);

  const payload = {
    model,
    messages: formattedMessages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${errorBody || res.statusText}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content || "";
  return rawContent;
};

/**
 * AI Triage & Specialty Recommendation using Groq
 */
export const triageSymptomsWithGroq = async (symptoms, availableSpecialties = []) => {
  const specialties = [
    "General Physician",
    "Cardiologist",
    "Gynecologist",
    "Dermatologist",
    "Pediatrician",
    "Neurologist",
    "Orthopedist",
    "Ophthalmologist",
    "ENT Specialist",
    "Psychiatrist",
    ...availableSpecialties,
  ];
  const uniqueSpecialties = [...new Set(specialties)];

  const systemPrompt = `You are a certified senior clinical triage AI for MediBridge Hospital.
Analyze the patient's symptoms and output a JSON response matching the single most appropriate medical specialist.
Available Specialties: ${JSON.stringify(uniqueSpecialties)}

Rules:
1. Provide accurate medical triage.
2. Return a 1-2 sentence clinical explanation in simple English.
3. Return a 1-2 sentence clinical explanation in natural Hindi (Devanagari script).
4. Output STRICT JSON with format:
{
  "specialty": "<Specialist Name>",
  "reasoning": "<English reason>",
  "reasoning_hindi": "<Hindi reason>",
  "urgency": "Low" | "Medium" | "High" | "Emergency",
  "selfCareTips": ["<Tip 1>", "<Tip 2>"]
}`;

  const raw = await callGroqChat({
    messages: [{ role: "user", content: `Patient Health Symptoms:\n"${symptoms}"` }],
    systemPrompt,
    jsonMode: true,
  });

  try {
    return JSON.parse(raw);
  } catch (e) {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.split("\n").filter(l => !l.startsWith("```")).join("\n");
    }
    return JSON.parse(cleaned);
  }
};

/**
 * Explains a medicine and its salt with clinical details in Hindi & English
 */
export const explainMedicineWithGroq = async (medicineName, saltName) => {
  const systemPrompt = `You are an expert clinical pharmacologist for MediBridge.
Explain the brand medicine "${medicineName}" and its active generic salt formula "${saltName}".
Provide clear, safe, patient-friendly guidance in JSON format:
{
  "category": "<Drug Class>",
  "indications": "<What it treats>",
  "howItWorks": "<Simple mechanism of action>",
  "dosageAdvice": "<General safety advice on when/how to take>",
  "sideEffects": "<Common mild side effects>",
  "precautions": "<Who should avoid or take care>",
  "hindiSummary": "<सरल हिंदी में दवा का उपयोग, लेने का सही तरीका और मुख्य सावधानी>"
}`;

  const raw = await callGroqChat({
    messages: [{ role: "user", content: `Explain medicine: ${medicineName} (Salt: ${saltName})` }],
    systemPrompt,
    jsonMode: true,
  });

  try {
    return JSON.parse(raw);
  } catch (e) {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.split("\n").filter(l => !l.startsWith("```")).join("\n");
    }
    return JSON.parse(cleaned);
  }
};

/**
 * Direct Groq AI Health Report Synthesizer for Patient Portal
 */
export const synthesizePatientBriefWithGroq = async (patientContext, prescriptions = []) => {
  const systemPrompt = `You are an expert clinical AI assistant for MediBridge Health Portal.
Analyze the patient's medical history, prescriptions, and symptoms to synthesize a structured patient care guide in BOTH simple English and natural Hindi (Devanagari script).

OUTPUT STRICT JSON ONLY:
{
  "summary": {
    "english": "<2-3 sentence overview of patient condition, diagnosis, and care plan>",
    "hindi": "<रोगी की स्थिति, निदान और उपचार योजना का सरल 2-3 वाक्यों में विवरण>"
  },
  "duration": {
    "english": "<Treatment duration e.g. 5 days, 2 weeks, or As directed>",
    "hindi": "<उपचार की अवधि e.g. 5 दिन, 2 सप्ताह, या चिकित्सक के निर्देशानुसार>"
  },
  "purpose": {
    "english": "<Medical purpose and recommended specialty care>",
    "hindi": "<चिकित्सीय उद्देश्य और अनुशंसित देखभाल>"
  },
  "instruction": {
    "english": "<Specific dosage and timing instructions for prescribed medicines>",
    "hindi": "<दवाइयों की खुराक और लेने का सही समय>"
  },
  "precaution": {
    "english": "<Key clinical precautions, dietary guidance, and warnings>",
    "hindi": "<महत्वपूर्ण सावधानियां, खानपान की सलाह और चेतावनियां>"
  },
  "medicines": {
    "english": "<List of medicines identified with dosage>",
    "hindi": "<पहचानी गई दवाइयाँ और उनकी मात्रा>"
  }
}`;

  let userText = `Patient Clinical Context: ${patientContext || "General Health Review"}\n`;
  if (prescriptions && prescriptions.length > 0) {
    userText += "\nPrescriptions on File:\n" + JSON.stringify(prescriptions, null, 2);
  }

  const raw = await callGroqChat({
    messages: [{ role: "user", content: userText }],
    systemPrompt,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(raw);
    const finalResult = {
      summary: parsed.summary?.english || "",
      duration: parsed.duration?.english || "",
      purpose: parsed.purpose?.english || "",
      instruction: parsed.instruction?.english || "",
      precaution: parsed.precaution?.english || "",
      medicines: parsed.medicines?.english || "",
      languages: {
        english: {
          summary: parsed.summary?.english || "",
          duration: parsed.duration?.english || "",
          purpose: parsed.purpose?.english || "",
          instruction: parsed.instruction?.english || "",
          precaution: parsed.precaution?.english || "",
          medicines: parsed.medicines?.english || "",
        },
        hindi: {
          summary: parsed.summary?.hindi || "",
          duration: parsed.duration?.hindi || "",
          purpose: parsed.purpose?.hindi || "",
          instruction: parsed.instruction?.hindi || "",
          precaution: parsed.precaution?.hindi || "",
          medicines: parsed.medicines?.hindi || "",
        }
      }
    };
    return finalResult;
  } catch (e) {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.split("\n").filter(l => !l.startsWith("```")).join("\n");
    }
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary?.english || "",
      duration: parsed.duration?.english || "",
      purpose: parsed.purpose?.english || "",
      instruction: parsed.instruction?.english || "",
      precaution: parsed.precaution?.english || "",
      medicines: parsed.medicines?.english || "",
      languages: {
        english: {
          summary: parsed.summary?.english || "",
          duration: parsed.duration?.english || "",
          purpose: parsed.purpose?.english || "",
          instruction: parsed.instruction?.english || "",
          precaution: parsed.precaution?.english || "",
          medicines: parsed.medicines?.english || "",
        },
        hindi: {
          summary: parsed.summary?.hindi || "",
          duration: parsed.duration?.hindi || "",
          purpose: parsed.purpose?.hindi || "",
          instruction: parsed.instruction?.hindi || "",
          precaution: parsed.precaution?.hindi || "",
          medicines: parsed.medicines?.hindi || "",
        }
      }
    };
  }
};

/**
 * Interactive Bilingual Medical Assistant (MediBot) powered by Groq
 */
export const chatWithMediBot = async (userMessage, chatHistory = [], userRole = "patient", userName = "User") => {
  const systemPrompt = `You are "MediBot", the intelligent AI Medical Assistant for MediBridge Health Portal.
Current User: ${userName} (${userRole}).
Portal Capabilities:
- Telemedicine appointments with verified doctors (Cardiologist, Dermatologist, General Physician, Pediatrician, Gynecologist, Orthopedist, etc.)
- Google Meet video consultations
- OCR prescription salt scanner (identifying generic salts like Paracetamol, Ibuprofen, Metformin, etc.)
- AI Health Report briefing (summarizing clinical history & prescriptions)
- Digital PDF/DOCX prescription generation and storage

Guidelines:
1. Be polite, empathetic, concise, and clinically sound.
2. If the user writes in Hindi or Hinglish, reply warmly in natural Hindi (Devanagari) or bilingual English-Hindi.
3. If the user asks about dangerous symptoms (severe chest pain, breathing difficulty, stroke signs), immediately advise emergency care (dial 112 / visit ER).
4. Do not prescribe specific new prescription-only antibiotic dosages without recommending a doctor consultation on the portal.
5. Format your answers with clear bullet points and bold highlights where helpful.`;

  const messages = chatHistory.map(m => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });

  return await callGroqChat({
    messages,
    systemPrompt,
    temperature: 0.4,
    maxTokens: 1024,
  });
};

/**
 * Transcribe speech audio using Groq Whisper model
 */
export const transcribeAudioWithGroq = async (audioBlob) => {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "json");

  const res = await fetch(GROQ_AUDIO_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Whisper transcription error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.text || "";
};
