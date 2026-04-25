import { ensureDatabaseReady, loadAppointmentsForMember, type Appointment } from "@/lib/storage";
import {
  generateVerificationCode,
  hashPassword,
  hashToken,
  hashVerificationCode,
  isValidEmailFormat,
  normalizeEmail,
  randomToken,
  verifyPassword,
} from "@/lib/security";
import { Resend } from "resend";

export type Member = {
  id: string;
  name: string;
  company: string;
  email: string;
  emailVerified: boolean;
  paymentStatus: "unpaid" | "paid";
  stripeCustomerId?: string | null;
  lastPaymentAt?: string | null;
  createdAt?: string | null;
};

type MemberRow = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  password_hash: string;
  email_verified: boolean | null;
  payment_status: string | null;
  stripe_customer_id: string | null;
  last_payment_at: string | Date | null;
  created_at: string | Date | null;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

let authDbInitialized = false;

function normalizeMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    paymentStatus: row.payment_status === "paid" ? "paid" : "unpaid",
    stripeCustomerId: row.stripe_customer_id,
    lastPaymentAt:
      row.last_payment_at instanceof Date
        ? row.last_payment_at.toISOString()
        : row.last_payment_at,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

async function ensureAuthTables() {
  const db = await ensureDatabaseReady();

  if (authDbInitialized) {
    return db;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      payment_status TEXT DEFAULT 'unpaid',
      stripe_customer_id TEXT,
      last_payment_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS member_sessions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS member_email_verifications (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS member_payments (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS member_id TEXT`,
  );

  authDbInitialized = true;
  return db;
}

async function sendVerificationEmail(email: string, code: string, name: string) {
  if (!resend) {
    return { success: false, error: "Email provider not configured" };
  }

  try {
    await resend.emails.send({
      from: "SISU Mentorship <onboarding@resend.dev>",
      to: email,
      subject: "Verify your SISU member account",
      text: `Hello ${name},\n\nYour SISU verification code is ${code}.\nThis code expires in 15 minutes.\n\nBest,\nSISU Team`,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error };
  }
}

export async function registerMember(input: {
  name: string;
  company: string;
  email: string;
  password: string;
}) {
  if (!isValidEmailFormat(input.email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const db = await ensureAuthTables();
  const email = normalizeEmail(input.email);
  const existing = await db.query(
    `SELECT * FROM members WHERE email = $1`,
    [email],
  );

  let memberId: string;
  if (existing.rowCount) {
    const row = existing.rows[0] as MemberRow;

    if (row.email_verified) {
      throw new Error("An account with this email already exists. Please sign in.");
    }

    memberId = row.id;
    await db.query(
      `
        UPDATE members
        SET name = $1, company = $2, password_hash = $3
        WHERE id = $4
      `,
      [input.name.trim(), input.company.trim(), await hashPassword(input.password), memberId],
    );
  } else {
    memberId = `member-${Date.now()}`;
    await db.query(
      `
        INSERT INTO members (
          id,
          name,
          company,
          email,
          password_hash,
          email_verified,
          payment_status
        )
        VALUES ($1, $2, $3, $4, $5, false, 'unpaid')
      `,
      [
        memberId,
        input.name.trim(),
        input.company.trim(),
        email,
        await hashPassword(input.password),
      ],
    );
  }

  const code = generateVerificationCode();
  await db.query(
    `
      INSERT INTO member_email_verifications (
        id,
        member_id,
        code_hash,
        expires_at
      )
      VALUES ($1, $2, $3, NOW() + interval '15 minutes')
    `,
    [`verify-${Date.now()}`, memberId, hashVerificationCode(code)],
  );

  const emailResult = await sendVerificationEmail(email, code, input.name.trim());
  if (!emailResult.success) {
    throw new Error("Could not send verification email. Please try again.");
  }

  return { memberId, email };
}

export async function verifyMemberEmail(input: {
  email: string;
  code: string;
}) {
  const db = await ensureAuthTables();
  const email = normalizeEmail(input.email);

  const memberResult = await db.query(`SELECT * FROM members WHERE email = $1`, [email]);
  if (!memberResult.rowCount) {
    throw new Error("No member account found for this email.");
  }

  const memberRow = memberResult.rows[0] as MemberRow;
  const codeHash = hashVerificationCode(input.code.trim());

  const verificationResult = await db.query(
    `
      SELECT id
      FROM member_email_verifications
      WHERE member_id = $1
        AND code_hash = $2
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [memberRow.id, codeHash],
  );

  if (!verificationResult.rowCount) {
    throw new Error("That verification code is invalid or expired.");
  }

  const verificationId = verificationResult.rows[0].id as string;

  await db.query(
    `UPDATE member_email_verifications SET used_at = NOW() WHERE id = $1`,
    [verificationId],
  );
  await db.query(
    `UPDATE members SET email_verified = true WHERE id = $1`,
    [memberRow.id],
  );

  return normalizeMember({
    ...memberRow,
    email_verified: true,
  });
}

export async function authenticateMember(input: {
  email: string;
  password: string;
}) {
  const db = await ensureAuthTables();
  const email = normalizeEmail(input.email);
  const result = await db.query(`SELECT * FROM members WHERE email = $1`, [email]);

  if (!result.rowCount) {
    throw new Error("Invalid email or password.");
  }

  const row = result.rows[0] as MemberRow;
  const valid = await verifyPassword(input.password, row.password_hash);

  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return normalizeMember(row);
}

export async function createMemberSession(memberId: string) {
  const db = await ensureAuthTables();
  const token = randomToken();
  await db.query(
    `
      INSERT INTO member_sessions (
        id,
        member_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, NOW() + interval '30 days')
    `,
    [`session-${Date.now()}`, memberId, hashToken(token)],
  );

  return token;
}

export async function deleteMemberSession(token: string) {
  const db = await ensureAuthTables();
  await db.query(`DELETE FROM member_sessions WHERE token_hash = $1`, [
    hashToken(token),
  ]);
}

export async function getMemberFromSessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const db = await ensureAuthTables();
  const result = await db.query(
    `
      SELECT m.*
      FROM member_sessions s
      JOIN members m ON m.id = s.member_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [hashToken(token)],
  );

  if (!result.rowCount) {
    return null;
  }

  return normalizeMember(result.rows[0] as MemberRow);
}

export async function getMemberById(memberId: string) {
  const db = await ensureAuthTables();
  const result = await db.query(`SELECT * FROM members WHERE id = $1`, [memberId]);
  if (!result.rowCount) {
    return null;
  }
  return normalizeMember(result.rows[0] as MemberRow);
}

export async function updateMemberStripeCustomerId(
  memberId: string,
  stripeCustomerId: string,
) {
  const db = await ensureAuthTables();
  await db.query(
    `UPDATE members SET stripe_customer_id = $1 WHERE id = $2`,
    [stripeCustomerId, memberId],
  );
}

export async function markMemberPaid(input: {
  memberId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  amount: number;
  currency: string;
  status: string;
}) {
  const db = await ensureAuthTables();

  await db.query(
    `
      INSERT INTO member_payments (
        id,
        member_id,
        amount,
        currency,
        status,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      `payment-${input.checkoutSessionId}`,
      input.memberId,
      input.amount,
      input.currency,
      input.status,
      input.checkoutSessionId,
      input.paymentIntentId ?? null,
    ],
  );

  await db.query(
    `
      UPDATE members
      SET payment_status = 'paid',
          last_payment_at = NOW()
      WHERE id = $1
    `,
    [input.memberId],
  );
}

export async function getMemberDashboard(memberId: string): Promise<{
  member: Member;
  appointments: Appointment[];
}> {
  const member = await getMemberById(memberId);

  if (!member) {
    throw new Error("Member not found.");
  }

  const appointments = await loadAppointmentsForMember(memberId);
  return { member, appointments };
}
