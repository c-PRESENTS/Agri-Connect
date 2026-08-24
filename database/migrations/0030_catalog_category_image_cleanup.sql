UPDATE catalog_categories
SET image_url = CASE
      WHEN image_url = '/category-logos/' || canonical_id || '.svg' THEN NULL
      ELSE image_url
    END,
    published_data = CASE
      WHEN published_data->>'imageUrl' = '/category-logos/' || canonical_id || '.svg'
        THEN jsonb_set(published_data, '{imageUrl}', 'null'::jsonb, true)
      ELSE published_data
    END,
    updated_at = now()
WHERE parent_id IS NOT NULL
  AND content->>'importedFrom' = 'legacy-static-taxonomy'
  AND (
    image_url = '/category-logos/' || canonical_id || '.svg'
    OR published_data->>'imageUrl' = '/category-logos/' || canonical_id || '.svg'
  );
