-- Remove only the six Organisation Control Centre demonstration applications.
-- Genuine applications and organisations are not matched by these identifiers.

DELETE FROM organisation_applications
WHERE id IN (
  'app-org-eastanglia-01',
  'app-org-wessex-02',
  'app-org-yorkshire-03',
  'app-org-highland-04',
  'app-org-kent-05',
  'app-org-midlands-06'
);

-- Earlier versions could create an external organisation while approving one
-- of the demo applications. Remove such an orphan only when nobody belongs to
-- it; organisations with real memberships are deliberately preserved.
DELETE FROM organisations o
WHERE o.type = 'external'
  AND o.metadata->>'applicationId' IN (
    'app-org-eastanglia-01',
    'app-org-wessex-02',
    'app-org-yorkshire-03',
    'app-org-highland-04',
    'app-org-kent-05',
    'app-org-midlands-06'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM organisation_memberships m
    WHERE m.organisation_id = o.id
  );
