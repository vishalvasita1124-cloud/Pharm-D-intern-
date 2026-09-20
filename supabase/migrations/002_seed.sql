-- =============================================================
-- Pharm D Intern Notes — Stage 1 Seed Data
-- Run this AFTER 001_schema.sql in Supabase SQL Editor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.categories (name, slug, description) VALUES
  ('Clinical Pharmacy',
   'clinical-pharmacy',
   'Medication reconciliation, patient counselling, ADR monitoring and clinical interventions.'),
  ('Diagnostic Skills',
   'diagnostic-skills',
   'ECG, Chest X-Ray, CT Scan, ABG interpretation and laboratory values.'),
  ('Therapeutics',
   'therapeutics',
   'Cardiology, respiratory, nephrology, neurology, endocrinology and infectious diseases.'),
  ('Clinical Research / CRO',
   'clinical-research',
   'ICH-GCP, clinical trials, pharmacovigilance, data management and regulatory affairs.')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.products
  (title, slug, description, short_description, category_id, price, pages, topics, is_published)
VALUES

  -- 1. ECG Clinical Notes
  (
    'ECG Clinical Notes for Pharm D Interns',
    'ecg-clinical-notes',
    'A comprehensive, ward-ready guide to ECG interpretation designed specifically for Pharm D interns and clinical pharmacy students. Covers everything from the basics of cardiac electrophysiology to recognising complex arrhythmias and STEMI patterns.',
    'Complete ECG interpretation guide for clinical pharmacy practice.',
    (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
    99,
    40,
    ARRAY[
      'ECG basics & electrode placement',
      'Heart rate calculation',
      'Rhythm analysis',
      'P wave morphology',
      'PR interval',
      'QRS complex',
      'QT/QTc interval',
      'Axis deviation',
      'Arrhythmia recognition',
      'STEMI / NSTEMI patterns'
    ],
    TRUE
  ),

  -- 2. Chest X-Ray Notes
  (
    'Chest X-Ray Clinical Notes',
    'chest-xray-clinical-notes',
    'A systematic approach to chest X-ray interpretation for clinical pharmacists. Learn the ABCDE method, identify common pathologies and relate findings to drug therapy decisions.',
    'Systematic chest X-ray interpretation for clinical pharmacists.',
    (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
    99,
    35,
    ARRAY[
      'ABCDE systematic approach',
      'Cardiomegaly & cardiac silhouette',
      'Pulmonary infiltrates',
      'Pleural effusion',
      'Pneumothorax',
      'Consolidation patterns',
      'Drug-induced lung disease',
      'ICU lines & devices'
    ],
    TRUE
  ),

  -- 3. CT Scan Notes
  (
    'CT Scan Clinical Notes',
    'ct-scan-clinical-notes',
    'Understand CT scan reports as a clinical pharmacist — from brain CT in stroke care to abdominal CT in sepsis workup. Concise notes with clinical relevance to drug therapy decisions.',
    'CT scan interpretation for drug therapy decision-making.',
    (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
    129,
    45,
    ARRAY[
      'CT brain — stroke & haemorrhage',
      'CT chest — pulmonary embolism',
      'CT abdomen — sepsis workup',
      'Contrast agents & nephrotoxicity',
      'Reporting conventions',
      'Clinical pharmacy relevance'
    ],
    TRUE
  ),

  -- 4. Antibiotic Quick Reference
  (
    'Antibiotic Quick Reference',
    'antibiotic-quick-reference',
    'A pocket-sized reference for antibiotic selection, dosing, de-escalation and stewardship principles. Covers empirical therapy for common infections with renal dosing adjustments.',
    'Antibiotic selection, dosing and stewardship at a glance.',
    (SELECT id FROM public.categories WHERE slug = 'therapeutics'),
    79,
    30,
    ARRAY[
      'Antimicrobial spectrum overview',
      'Empirical therapy by site of infection',
      'Renal dose adjustments',
      'Beta-lactam allergy cross-reactivity',
      'De-escalation principles',
      'PK/PD optimisation',
      'Antifungal & antiviral overview'
    ],
    TRUE
  ),

  -- 5. Clinical Laboratory Values
  (
    'Clinical Laboratory Values',
    'clinical-laboratory-values',
    'Reference ranges, clinical significance and pharmacy-relevant interpretation for essential laboratory parameters. Includes drug-lab interactions and monitoring parameters.',
    'Lab reference ranges with clinical pharmacy interpretation.',
    (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
    79,
    35,
    ARRAY[
      'Haematology — CBC interpretation',
      'Renal function — eGFR, creatinine',
      'Liver function tests',
      'Electrolytes & acid-base',
      'Cardiac biomarkers',
      'Drug-level monitoring',
      'Drug-induced lab abnormalities'
    ],
    TRUE
  ),

  -- 6. ABG Interpretation Notes
  (
    'ABG Interpretation Notes',
    'abg-interpretation-notes',
    'Step-by-step arterial blood gas interpretation with clinical pharmacy applications. Covers acid-base disorders, compensation, oxygenation indices and medication causes of ABG abnormalities.',
    'Step-by-step ABG interpretation for clinical pharmacists.',
    (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
    79,
    25,
    ARRAY[
      'pH, PaCO₂, HCO₃ — step-by-step',
      'Metabolic acidosis — anion gap',
      'Metabolic alkalosis',
      'Respiratory acidosis & alkalosis',
      'Mixed disorders',
      'Oxygenation — PaO₂/FiO₂',
      'Drug-induced ABG changes'
    ],
    TRUE
  ),

  -- 7. Ward Round Notes
  (
    'Clinical Pharmacy Ward Round Notes',
    'clinical-pharmacy-ward-round-notes',
    'A comprehensive guide to participating in multidisciplinary ward rounds as a clinical pharmacist. Covers documentation, clinical interventions, SOAP notes and communication with medical teams.',
    'Ward round participation guide for clinical pharmacists.',
    (SELECT id FROM public.categories WHERE slug = 'clinical-pharmacy'),
    129,
    50,
    ARRAY[
      'Ward round structure & etiquette',
      'SOAP note documentation',
      'Drug therapy problem identification',
      'Medication reconciliation on rounds',
      'Communication with physicians',
      'Clinical intervention documentation',
      'Discharge medication counselling',
      'High-alert medication monitoring'
    ],
    TRUE
  ),

  -- 8. ICH-GCP Notes
  (
    'ICH-GCP Quick Notes',
    'ich-gcp-quick-notes',
    'Concise ICH-GCP E6(R2) notes for clinical pharmacy professionals entering clinical research and CRO environments. Covers GCP principles, investigator responsibilities, informed consent and essential documents.',
    'ICH-GCP E6(R2) essentials for clinical pharmacy CRO roles.',
    (SELECT id FROM public.categories WHERE slug = 'clinical-research'),
    99,
    40,
    ARRAY[
      'GCP principles & definitions',
      'Roles — investigator, sponsor, monitor, CRO',
      'Informed consent process',
      'Adverse event reporting',
      'Essential documents & TMF',
      'Site monitoring visits',
      'Protocol deviations',
      'Regulatory submissions'
    ],
    TRUE
  )

ON CONFLICT (slug) DO UPDATE SET
  is_published = TRUE,
  updated_at = NOW();
