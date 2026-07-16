import { readFile } from "fs/promises";
import pg from "pg";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
const apply = args.includes("--apply");

if (!file) {
  console.error("Usage: npm run student:registry:import -- --file <students.csv> [--apply]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

function parseLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

const source = await readFile(file, "utf8");
const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
const expected = ["institutional_email", "student_number", "study_level", "programme", "department", "enrolment_status", "access_expires_at"];
const header = parseLine(lines.shift() || "");
if (header.join(",") !== expected.join(",")) throw new Error(`CSV header must be: ${expected.join(",")}`);

const records = lines.map((line, index) => {
  const values = parseLine(line);
  if (values.length !== expected.length) throw new Error(`Row ${index + 2}: expected ${expected.length} columns`);
  const record = Object.fromEntries(expected.map((key, column) => [key, values[column]]));
  record.institutional_email = record.institutional_email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.institutional_email)) throw new Error(`Row ${index + 2}: invalid email`);
  if (!record.student_number) throw new Error(`Row ${index + 2}: student number is required`);
  if (!new Set(["UG", "PG", "PhD"]).has(record.study_level)) throw new Error(`Row ${index + 2}: study level must be UG, PG, or PhD`);
  if (!new Set(["active", "suspended", "completed", "withdrawn", "expired"]).has(record.enrolment_status)) throw new Error(`Row ${index + 2}: invalid enrolment status`);
  const expiry = new Date(record.access_expires_at);
  if (Number.isNaN(expiry.getTime())) throw new Error(`Row ${index + 2}: invalid access expiry`);
  record.access_expires_at = expiry;
  return record;
});

const emails = new Set(records.map((record) => record.institutional_email));
const numbers = new Set(records.map((record) => record.student_number));
if (emails.size !== records.length) throw new Error("CSV contains duplicate institutional emails");
if (numbers.size !== records.length) throw new Error("CSV contains duplicate student numbers");

console.log(`Validated ${records.length} student registry row(s).`);
if (!apply) {
  console.log("Dry run only. Add --apply to write these rows.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  for (const record of records) {
    await client.query(
      `INSERT INTO student_registry
        (institutional_email, student_number, study_level, programme, department, enrolment_status, access_expires_at)
       VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
       ON CONFLICT (institutional_email) DO UPDATE SET
        student_number=EXCLUDED.student_number,
        study_level=EXCLUDED.study_level,
        programme=EXCLUDED.programme,
        department=EXCLUDED.department,
        enrolment_status=EXCLUDED.enrolment_status,
        access_expires_at=EXCLUDED.access_expires_at,
        updated_at=NOW()`,
      [record.institutional_email, record.student_number, record.study_level, record.programme, record.department, record.enrolment_status, record.access_expires_at],
    );
  }
  await client.query("COMMIT");
  console.log(`Imported ${records.length} student registry row(s).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
