-- Migration 0037: Clean up hardcoded mock farmers and catalog seed users

-- 1. Remove child records referencing mock farmers
DELETE FROM protected_allocations
 WHERE seller_id IN (SELECT id FROM users WHERE auth_method = 'catalog_seed' OR id LIKE 'farmer-%');

DELETE FROM marketplace_conversations
 WHERE seller_id IN (SELECT id FROM users WHERE auth_method = 'catalog_seed' OR id LIKE 'farmer-%');

DELETE FROM seller_verification_cases
 WHERE seller_id IN (SELECT id FROM users WHERE auth_method = 'catalog_seed' OR id LIKE 'farmer-%');

DELETE FROM seller_region_assignments
 WHERE seller_id IN (SELECT id FROM users WHERE auth_method = 'catalog_seed' OR id LIKE 'farmer-%');

-- 2. Remove mock farmers from users table
DELETE FROM users
 WHERE auth_method = 'catalog_seed'
    OR id IN ('farmer-1', 'farmer-2', 'farmer-3', 'farmer-4', 'farmer-5',
              'farmer-6', 'farmer-7', 'farmer-8', 'farmer-9', 'farmer-10');

-- 3. Reset test accounts to buyers so there are no mock/accidental farmers
UPDATE users
   SET role = 'buyer',
       seller_enabled = false
 WHERE email IN ('harsh.gavand.tech@gmail.com', 'hgavand22it@student.mes.ac.in')
   AND role = 'farmer';
