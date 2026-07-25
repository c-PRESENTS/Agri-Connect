INSERT INTO users
  (id, auth_method, first_name, last_name, role, name, avatar, location,
   rating, is_verified, profile_complete)
VALUES
  ('farmer-1', 'catalog_seed', 'James', 'Wilson', 'farmer', 'James Wilson',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=JamesWilson', 'Essex', 4.5, true, true),
  ('farmer-2', 'catalog_seed', 'Sarah', 'Thompson', 'farmer', 'Sarah Thompson',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahThompson', 'Kent', 4.5, true, true),
  ('farmer-3', 'catalog_seed', 'Michael', 'Brown', 'farmer', 'Michael Brown',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelBrown', 'Norfolk', 4.5, true, true),
  ('farmer-4', 'catalog_seed', 'Emma', 'Davies', 'farmer', 'Emma Davies',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=EmmaDavies', 'Suffolk', 4.5, true, true),
  ('farmer-5', 'catalog_seed', 'Thomas', 'Green', 'farmer', 'Thomas Green',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=ThomasGreen', 'Cambridgeshire', 4.5, true, true),
  ('farmer-6', 'catalog_seed', 'Lucy', 'Mitchell', 'farmer', 'Lucy Mitchell',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=LucyMitchell', 'Oxfordshire', 4.5, true, true),
  ('farmer-7', 'catalog_seed', 'William', 'Taylor', 'farmer', 'William Taylor',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=WilliamTaylor', 'Somerset', 4.5, true, true),
  ('farmer-8', 'catalog_seed', 'Sophie', 'Adams', 'farmer', 'Sophie Adams',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=SophieAdams', 'Devon', 4.5, true, true),
  ('farmer-9', 'catalog_seed', 'Oliver', 'White', 'farmer', 'Oliver White',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=OliverWhite', 'Yorkshire', 4.5, true, true),
  ('farmer-10', 'catalog_seed', 'Charlotte', 'Evans', 'farmer', 'Charlotte Evans',
   'https://api.dicebear.com/7.x/avataaars/svg?seed=CharlotteEvans', 'Lincolnshire', 4.5, true, true)
ON CONFLICT (id) DO NOTHING;
