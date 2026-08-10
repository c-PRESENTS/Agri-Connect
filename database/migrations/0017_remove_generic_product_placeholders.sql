UPDATE commerce_products
SET product_data = jsonb_set(
      product_data,
      '{images}',
      COALESCE(
        (
          SELECT jsonb_agg(image_url)
          FROM jsonb_array_elements(product_data->'images') AS image_url
          WHERE image_url #>> '{}' NOT LIKE '%photo-1540420828642-fca2c5c18abe%'
        ),
        '[]'::jsonb
      ),
      true
    ),
    updated_at = now()
WHERE jsonb_typeof(product_data->'images') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(product_data->'images') AS image_url
    WHERE image_url #>> '{}' LIKE '%photo-1540420828642-fca2c5c18abe%'
  );

ALTER TABLE commerce_products
  DROP CONSTRAINT IF EXISTS commerce_products_no_generic_placeholder;

ALTER TABLE commerce_products
  ADD CONSTRAINT commerce_products_no_generic_placeholder
  CHECK (product_data::text NOT LIKE '%photo-1540420828642-fca2c5c18abe%');
