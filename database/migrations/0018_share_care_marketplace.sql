CREATE TABLE IF NOT EXISTS share_care_listings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id varchar REFERENCES users(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  source_type varchar(30) NOT NULL CHECK (source_type IN ('restaurant','home','retail','production','event')),
  name text NOT NULL,
  category varchar(80) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit varchar(40) NOT NULL,
  is_free boolean NOT NULL DEFAULT true,
  price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'GBP' CHECK (currency = 'GBP'),
  location text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  emoji varchar(20) NOT NULL DEFAULT '🎁',
  urgency varchar(20) NOT NULL DEFAULT 'safe' CHECK (urgency IN ('urgent','medium','safe')),
  status varchar(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','claimed','expired','cancelled')),
  expires_at timestamptz NOT NULL,
  listing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_free AND price_minor = 0) OR (NOT is_free AND price_minor > 0))
);

CREATE INDEX IF NOT EXISTS share_care_available_idx
  ON share_care_listings(status, is_free, expires_at);
CREATE INDEX IF NOT EXISTS share_care_donor_idx
  ON share_care_listings(donor_id, created_at);

CREATE TABLE IF NOT EXISTS share_care_reservations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id varchar NOT NULL REFERENCES share_care_listings(id) ON DELETE CASCADE,
  reserver_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','collected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS share_care_active_listing_reservation_idx
  ON share_care_reservations(listing_id);
CREATE INDEX IF NOT EXISTS share_care_reserver_idx
  ON share_care_reservations(reserver_id, created_at);

INSERT INTO share_care_listings
  (id, donor_name, source_type, name, category, quantity, unit, is_free, price_minor,
   location, latitude, longitude, emoji, urgency, status, expires_at, listing_data, created_at)
VALUES
  ('sc-1','Rachel Green','home','Heritage Tomatoes','vegetables',4,'kg',true,0,'Chelmsford, Essex',51.7356,0.4685,'🍅','urgent','available',now()+interval '45 minutes','{"dietaryTags":[]}',now()-interval '2 minutes'),
  ('sc-2','Tom Hart','home','Fresh Kale Bundles','vegetables',6,'bundle',true,0,'Norwich, Norfolk',52.6309,1.2974,'🥬','medium','available',now()+interval '2 hours','{"dietaryTags":[]}',now()-interval '8 minutes'),
  ('sc-3','Anna Bell','home','Duck Eggs (free-range)','dairy',2,'dozen',true,0,'Bath, Somerset',51.3811,-2.359,'🥚','safe','available',now()+interval '5 hours','{"dietaryTags":[]}',now()-interval '15 minutes'),
  ('sc-4','Liam Walker','home','Organic Apples','fruits',5,'kg',true,0,'Canterbury, Kent',51.2802,1.0789,'🍎','safe','available',now()+interval '1 day','{"dietaryTags":[]}',now()-interval '22 minutes'),
  ('sc-5','Sue Moore','home','Wild Garlic Leaves','medicinal',8,'bunch',true,0,'York, Yorkshire',53.959,-1.0815,'🌿','medium','available',now()+interval '3 hours','{"dietaryTags":[]}',now()-interval '35 minutes'),
  ('sc-6','Paul Evans','home','Surplus Courgettes','vegetables',3,'kg',true,0,'Oxford, Oxfordshire',51.752,-1.2577,'🥒','medium','available',now()+interval '2 hours','{"dietaryTags":[]}',now()-interval '41 minutes'),
  ('sc-7','Claire James','home','Homemade Plum Jam','pickles',10,'jar',true,0,'Exeter, Devon',50.7184,-3.5339,'🫙','safe','available',now()+interval '30 days','{"dietaryTags":[]}',now()-interval '55 minutes'),
  ('sc-8','Mark Singh','production','Sunflower Seedlings','seeds',3,'tray',true,0,'Cambridge, Cambs',52.2053,0.1218,'🌻','safe','available',now()+interval '7 days','{"dietaryTags":[]}',now()-interval '1 hour'),
  ('sc-9','Fiona Black','production','Raw Honey (uncapped)','honey',4,'jar',true,0,'Bury St Edmunds, Suffolk',52.2452,0.7104,'🍯','safe','available',now()+interval '60 days','{"dietaryTags":[]}',now()-interval '1 hour'),
  ('sc-10','George Ali','home','Mixed Salad Greens','vegetables',7,'bag',true,0,'Lincoln, Lincolnshire',53.2307,-0.5406,'🥗','urgent','available',now()+interval '50 minutes','{"dietaryTags":[]}',now()-interval '2 hours'),
  ('sc-11','Priya Shah','home','Runner Beans (fresh)','pulses',2,'kg',true,0,'Colchester, Essex',51.8959,0.8919,'🫘','medium','available',now()+interval '2 hours','{"dietaryTags":[]}',now()-interval '2 hours'),
  ('sc-12','David Owen','home','Butternut Squash','vegetables',5,'each',true,0,'Kings Lynn, Norfolk',52.751,0.3924,'🎃','safe','available',now()+interval '5 days','{"dietaryTags":[]}',now()-interval '3 hours'),
  ('sc-13','Holt Bakery','retail','Sourdough Loaves','bakery',6,'loaf',true,0,'Brighton, East Sussex',50.8225,-0.1372,'🍞','urgent','available',now()+interval '40 minutes','{"dietaryTags":[]}',now()-interval '20 minutes'),
  ('sc-14','Hartley Farm','production','Beef Mince (frozen)','meat',4,'kg',true,0,'Reading, Berkshire',51.4543,-0.9781,'🥩','safe','available',now()+interval '30 days','{"dietaryTags":[]}',now()-interval '30 minutes'),
  ('sc-15','Dales Dairy','retail','Surplus Yoghurt Pots','dairy',12,'pack',true,0,'Manchester',53.4808,-2.2426,'🥣','medium','available',now()+interval '90 minutes','{"dietaryTags":[]}',now()-interval '1 hour')
ON CONFLICT (id) DO NOTHING;
