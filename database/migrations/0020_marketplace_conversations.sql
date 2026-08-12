CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  buyer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_conversation_not_self CHECK (buyer_id <> seller_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_conversation_parties_product_idx
  ON marketplace_conversations(product_id, buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS marketplace_conversation_buyer_idx
  ON marketplace_conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_conversation_seller_idx
  ON marketplace_conversations(seller_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_conversation_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id varchar NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_messages_conversation_idx
  ON marketplace_conversation_messages(conversation_id, created_at DESC);
