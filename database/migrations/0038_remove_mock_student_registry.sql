-- Remove the runtime-seeded Organisation Control Centre student and researcher
-- records. Real registry entries, entitlements, users, support requests, and
-- administrator-created records are not matched by these identifiers.

DELETE FROM student_registry
WHERE id IN (
  'stud-harper-01',
  'stud-rau-02',
  'stud-reading-03',
  'stud-nottingham-04',
  'stud-aberystwyth-05',
  'stud-sruc-06',
  'res-rothamsted-01',
  'res-jic-02',
  'res-reading-03',
  'res-wur-04',
  'res-rau-05',
  'res-harper-06'
);
