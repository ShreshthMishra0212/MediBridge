// Comprehensive Indian Medicine to Salt Composition Catalog
// Synchronized with backend routes/med_salts.py

export const MED_SALT_MAP = {
  "crocin": "Paracetamol",
  "dolo 650": "Paracetamol",
  "calpol": "Paracetamol",
  "combiflam": "Ibuprofen + Paracetamol",
  "brufen": "Ibuprofen",
  "disprin": "Aspirin",
  "ecosprin": "Aspirin",
  "ecospirin": "Aspirin",
  "azithral": "Azithromycin",
  "azee": "Azithromycin",
  "augmentin": "Amoxicillin + Clavulanic Acid",
  "amoxyclav": "Amoxicillin + Clavulanic Acid",
  "ciplox": "Ciprofloxacin",
  "cifran": "Ciprofloxacin",
  "norflox": "Norfloxacin",
  "pantop": "Pantoprazole",
  "pan 40": "Pantoprazole",
  "omez": "Omeprazole",
  "rantac": "Ranitidine",
  "zinetac": "Ranitidine",
  "digene": "Magnesium Hydroxide + Aluminium Hydroxide",
  "eno": "Sodium Bicarbonate + Citric Acid",
  "cetrizine": "Cetirizine",
  "cetzine": "Cetirizine",
  "allegra": "Fexofenadine",
  "avil": "Pheniramine Maleate",
  "benadryl": "Diphenhydramine",
  "metrogyl": "Metronidazole",
  "flagyl": "Metronidazole",
  "glycomet": "Metformin",
  "gluconorm": "Metformin",
  "amaryl": "Glimepiride",
  "atorva": "Atorvastatin",
  "rosuvas": "Rosuvastatin",
  "telma": "Telmisartan",
  "amlong": "Amlodipine",
  "stamlo": "Amlodipine",
  "thyronorm": "Levothyroxine",
  "eltroxin": "Levothyroxine",
  "shelcal": "Calcium Carbonate + Vitamin D3",
  "becosules": "Vitamin B Complex + Vitamin C",
  "revital": "Multivitamin + Ginseng",
  "zerodol": "Aceclofenac",
  "voveran": "Diclofenac",
  "meftal spas": "Mefenamic Acid + Dicyclomine",
  "sumo": "Nimesulide + Paracetamol",
};

export const MED_DETAILS = {
  "crocin": { category: "Analgesic & Antipyretic", use: "Fever, mild-to-moderate pain, headache", caution: "Avoid alcohol, max 4g paracetamol/day" },
  "dolo 650": { category: "Antipyretic & Analgesic", use: "High fever, body aches, viral infections", caution: "Take after meals, do not exceed daily limits" },
  "calpol": { category: "Antipyretic & Analgesic", use: "Fever reduction and pain relief", caution: "Safe in pediatric doses with doctor advice" },
  "combiflam": { category: "NSAID + Analgesic", use: "Muscle spasms, toothache, inflammation, fever", caution: "Take with food to prevent gastric irritation" },
  "brufen": { category: "NSAID", use: "Joint stiffness, arthritis, musculoskeletal pain", caution: "Avoid in patients with active peptic ulcers" },
  "disprin": { category: "Salicylate / Blood Thinner", use: "Headache, toothache, acute cardiovascular protection", caution: "Dissolve in water, not on empty stomach" },
  "ecosprin": { category: "Antiplatelet", use: "Cardiovascular stroke and clot prevention", caution: "Take consistently at same time daily" },
  "azithral": { category: "Macrolide Antibiotic", use: "Bacterial throat infections, bronchitis, sinusitis", caution: "Complete the full 3-to-5 day course" },
  "azee": { category: "Macrolide Antibiotic", use: "Respiratory tract and skin bacterial infections", caution: "Take 1 hour before or 2 hours after meals" },
  "augmentin": { category: "Penicillin + Beta-Lactamase Inhibitor", use: "Severe bacterial infections, ENT, dental infections", caution: "Complete full antibiotic course" },
  "amoxyclav": { category: "Broad-spectrum Antibiotic", use: "Chest, urinary tract, and ear infections", caution: "Do not stop prematurely without doctor consent" },
  "ciplox": { category: "Fluoroquinolone Antibiotic", use: "Eye/ear infections, urinary and intestinal infections", caution: "Stay well-hydrated during course" },
  "pantop": { category: "Proton Pump Inhibitor (PPI)", use: "Acidity, GERD, acid reflux, stomach ulcer prevention", caution: "Take on empty stomach 30 mins before breakfast" },
  "pan 40": { category: "Proton Pump Inhibitor (PPI)", use: "Hyperacidity, heartburn, gastritis", caution: "Best taken first thing in the morning" },
  "omez": { category: "Proton Pump Inhibitor (PPI)", use: "Gastric ulcers, acid reflux relief", caution: "Swallow whole, do not crush or chew capsule" },
  "rantac": { category: "H2 Blocker", use: "Acid indigestion, sour stomach, heartburn", caution: "Take 30-60 mins before meals" },
  "digene": { category: "Antacid", use: "Quick relief from indigestion, gas, acidity", caution: "Chew tablet thoroughly before swallowing" },
  "eno": { category: "Effervescent Antacid", use: "Instant 6-second relief from acidity and bloatedness", caution: "Dissolve in water; avoid in low-sodium diets" },
  "cetrizine": { category: "Antihistamine", use: "Allergic rhinitis, runny nose, sneezing, hives", caution: "May cause drowsiness; avoid driving" },
  "allegra": { category: "Non-Sedating Antihistamine", use: "Seasonal allergies, skin rashes, itching", caution: "Do not take with grapefruit or orange juice" },
  "glycomet": { category: "Biguanide Antidiabetic", use: "Type 2 diabetes blood sugar control", caution: "Take with or immediately after meals" },
  "telma": { category: "ARB Antihypertensive", use: "High blood pressure, cardiovascular protection", caution: "Monitor blood pressure regularly" },
  "shelcal": { category: "Calcium & Vitamin Supplement", use: "Osteoporosis, bone density, calcium deficiency", caution: "Take after meals for optimal absorption" },
  "becosules": { category: "Vitamin B-Complex", use: "Mouth ulcers, energy metabolism, weakness", caution: "May cause harmless bright yellow urine" },
  "zerodol": { category: "NSAID", use: "Osteoarthritis, joint pain, spondylitis", caution: "Take with food; consult doctor for prolonged use" },
  "meftal spas": { category: "Antispasmodic + NSAID", use: "Menstrual period cramps, intestinal colic pain", caution: "Take only during acute pain episodes with food" },
  "sumo": { category: "Analgesic & Antipyretic", use: "Acute pain, inflammation, headache, fever", caution: "Short-term use only as prescribed" }
};

export const normalizeMedName = (name) => {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ");
};

export const lookupSalt = (medName) => {
  const key = normalizeMedName(medName);
  if (MED_SALT_MAP[key]) {
    return {
      medicine: medName,
      salt: MED_SALT_MAP[key],
      details: MED_DETAILS[key] || { category: "General Medicine", use: "Therapeutic relief", caution: "Follow doctor's prescription" }
    };
  }
  for (const [known, salt] of Object.entries(MED_SALT_MAP)) {
    if (key.includes(known) || known.includes(key)) {
      return {
        medicine: known,
        salt,
        details: MED_DETAILS[known] || { category: "General Medicine", use: "Therapeutic relief", caution: "Follow doctor's prescription" }
      };
    }
  }
  return null;
};
