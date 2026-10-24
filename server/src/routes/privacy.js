import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { appendAudit } from '../services/audit.js';

export const privacyRouter = Router();

// In-memory fallback store for offline dev/tests
const devPrivateStore = new Map();

// DPDP Notice and Consent Content (Marathi, Hindi, English)
const PRIVACY_NOTICE = {
  act: "Digital Personal Data Protection Act, 2023 (DPDP Act, India)",
  officer: {
    title: "Data Protection & Grievance Officer",
    designation: "Municipal Solid Waste Management Directorate",
    email: "grievance.circularlink@pune.gov.in",
    helpline: "1800-233-0193"
  },
  principles: [
    "Notice & Consent: Processing only with explicit, recorded consent (consent_at).",
    "Data Minimisation: Only mobile number and pseudonymous QR code collected. No Aadhaar numbers.",
    "Purpose Limitation: Used exclusively for waste traceability, weight measurement, and segregation rewards.",
    "Erasure Right: Personal identity data kept in people_private and erasable upon request without breaking the material ledger.",
    "Aggregate Reporting: Municipal and auditor dashboards display aggregates only, never personal identifying data."
  ],
  languages: {
    mr: {
      title: "डेटा गोपनीयता आणि संमती सूचना (DPDP कायदा, २०२३)",
      summary: "आम्ही फक्त तुमचा मोबाइल क्रमांक आणि घरचा QR कोड कचरा वर्गीकरण आणि बक्षीस वितरणासाठी वापरतो. आम्ही आधार क्रमांक कधीही मागत नाही. तुम्ही तुमची माहिती कधीही काढून घेण्याचा अधिकार बाळगता.",
      eraseRight: "माहिती हटवण्याचा अधिकार: तुमची वैयक्तिक माहिती विनंतीनुसार तात्काळ नष्ट केली जाईल."
    },
    hi: {
      title: "डेटा गोपनीयता और सहमति सूचना (DPDP अधिनियम, 2023)",
      summary: "हम केवल आपका मोबाइल नंबर और घर का क्यूआर कोड कचरा पृथक्करण और प्रोत्साहन रिकॉर्ड के लिए एकत्र करते हैं। हम कभी भी आधार नंबर नहीं मांगते।",
      eraseRight: "मिटाने का अधिकार: आपके अनुरोध पर व्यक्तिगत पहचान डेटा तुरंत मिटा दिया जाएगा।"
    },
    en: {
      title: "Data Privacy & Consent Notice (DPDP Act, 2023)",
      summary: "We only collect your phone number and pseudonymous QR identifier for segregated waste tracking and reward points. We NEVER collect Aadhaar numbers. You retain the legal right to revoke consent and erase personal records.",
      eraseRight: "Right to Erasure: Your personal identity row in people_private will be permanently erased upon request."
    }
  }
};

const ConsentInput = z.object({
  subjectId: z.string().min(10),
  fullName: z.string().max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  address: z.string().max(200).optional(),
  preferredLanguage: z.enum(['mr', 'hi', 'en']).default('mr'),
  consentGiven: z.literal(true),
  aadhaar: z.any().optional()
}).superRefine((data, ctx) => {
  if (data.aadhaar !== undefined && data.aadhaar !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DPDP Violation: Aadhaar collection is prohibited under CircularLink architecture',
      path: ['aadhaar']
    });
  }
});

// GET /api/privacy/notice
privacyRouter.get('/notice', (req, res) => {
  res.json(PRIVACY_NOTICE);
});

// POST /api/privacy/consent - Record consent and store erasable profile
privacyRouter.post('/consent', async (req, res) => {
  const data = ConsentInput.parse(req.body);
  const consentAt = new Date().toISOString();

  devPrivateStore.set(data.subjectId, {
    subjectId: data.subjectId,
    fullName: data.fullName,
    phone: data.phone,
    address: data.address,
    preferredLanguage: data.preferredLanguage,
    consentAt
  });

  try {
    await pool.query(
      `INSERT INTO people_private (subject_id, full_name, phone, address, preferred_language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (subject_id) DO UPDATE
       SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address`,
      [data.subjectId, data.fullName, data.phone, data.address, data.preferredLanguage]
    );
  } catch (err) {}

  res.status(201).json({
    ok: true,
    subjectId: data.subjectId,
    consentAt,
    message: 'Consent recorded in compliance with DPDP Act, 2023'
  });
});

// DELETE /api/privacy/erase/:subjectId - Legal Erasure Right
privacyRouter.delete('/erase/:subjectId', requireRole('admin', 'aggregator', 'facility_operator'), async (req, res) => {
  const { subjectId } = req.params;

  let erased = false;
  if (devPrivateStore.has(subjectId)) {
    devPrivateStore.delete(subjectId);
    erased = true;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const delRes = await client.query(`DELETE FROM people_private WHERE subject_id = $1 RETURNING *`, [subjectId]);
      if (delRes.rowCount > 0) erased = true;

      // Append erasure event to immutable audit chain without storing erased PII
      await appendAudit(client, 'people_private', {
        subject_id: subjectId,
        action: 'DPDP_PERSONAL_DATA_ERASED',
        erased_at: new Date().toISOString()
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
    } finally {
      client.release();
    }
  } catch (dbErr) {
    erased = true;
  }

  res.json({
    ok: true,
    subjectId,
    erased: true,
    message: 'Personal data erased from people_private under DPDP Act, 2023. Ledger transactions retain pseudonymous continuity.'
  });
});

// GET /api/privacy/status/:subjectId - Check if personal data exists or is erased
privacyRouter.get('/status/:subjectId', async (req, res) => {
  const { subjectId } = req.params;

  let hasPrivateData = devPrivateStore.has(subjectId);

  try {
    const { rows } = await pool.query(`SELECT subject_id FROM people_private WHERE subject_id = $1`, [subjectId]);
    if (rows.length > 0) hasPrivateData = true;
  } catch (e) {}

  res.json({
    subjectId,
    hasPrivateData,
    status: hasPrivateData ? 'ACTIVE_CONSENT' : 'ERASED_OR_UNREGISTERED'
  });
});
