# med_salts.py

MED_SALT_MAP = {
    "crocin": "Paracetamol",
    "dolo 650": "Paracetamol",
    "calpol": "Paracetamol",
    "combiflam": "Ibuprofen + Paracetamol",
    "brufen": "Ibuprofen",
    "disprin": "Aspirin",
    "ecosprin": "Aspirin",
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
    "ecospirin": "Aspirin",
    "thyronorm": "Levothyroxine",
    "eltroxin": "Levothyroxine",
    "shelcal": "Calcium Carbonate + Vitamin D3",
    "becosules": "Vitamin B Complex + Vitamin C",
    "revital": "Multivitamin + Ginseng",
    "zerodol": "Aceclofenac",
    "voveran": "Diclofenac",
    "meftal spas": "Mefenamic Acid + Dicyclomine",
    "sumo": "Nimesulide + Paracetamol",
}


import re

def normalize(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[-_/]", " ", name)   # hyphens/underscores -> spaces
    name = re.sub(r"\s+", " ", name)     # collapse multiple spaces
    return name


def get_salt(med_name: str):
    """Exact + partial match lookup for a medicine name."""
    key = normalize(med_name)

    # exact match
    if key in MED_SALT_MAP:
        return MED_SALT_MAP[key]

    # partial match (handles OCR noise like "Dolo650mg" or "Crocin Tab")
    for known_name, salt in MED_SALT_MAP.items():
        if known_name in key or key in known_name:
            return salt

    return None

def extract_meds_from_text(ocr_text: str):
    results = []
    text_norm = normalize(ocr_text)

    for known_name, salt in MED_SALT_MAP.items():
        known_norm = normalize(known_name)
        if known_norm in text_norm:
            results.append((known_name, salt))

    return results


if __name__ == "__main__":
    # quick test
    sample = "Patient prescribed Dolo 650 and Augmentin twice daily"
    print(extract_meds_from_text(sample))
