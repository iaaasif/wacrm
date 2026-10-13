-- ============================================================
-- 048_seed_starter_message_templates.sql
--
-- Provides 8 battle-tested starter WhatsApp message templates
-- for Marketing and Utility use-cases.
-- Includes an idempotent RPC `seed_starter_message_templates`
-- and seeds templates for existing accounts with zero templates.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_starter_message_templates(
  p_account_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  -- 1. Welcome Greeting
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'welcome_greeting', 'Marketing', 'en_US', 'text', 'Welcome to Our Store! 👋',
    'Hello {{1}}, welcome! Thank you for contacting us. We are thrilled to have you here. How can our team assist you today?',
    'Reply to chat with our team',
    '[{"type": "QUICK_REPLY", "text": "Browse Catalog"}, {"type": "QUICK_REPLY", "text": "Talk to Agent"}]'::jsonb,
    '{"body": ["Customer"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'welcome_greeting'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 2. Order Confirmation
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'order_confirmation', 'Utility', 'en_US', 'text', 'Order Confirmed ✅',
    'Hi {{1}}, great news! Your order #{{2}} for {{3}} has been confirmed and is being processed. We will notify you once shipped.',
    'Thank you for your purchase',
    '[{"type": "QUICK_REPLY", "text": "Track Order"}, {"type": "QUICK_REPLY", "text": "Customer Support"}]'::jsonb,
    '{"body": ["Sarah", "ORD-9842", "$50.00"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'order_confirmation'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 3. Shipping Update
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'shipping_dispatch', 'Utility', 'en_US', 'text', 'Your Order is on the Way 🚚',
    'Hello {{1}}, your order #{{2}} is on its way! Tracking Number: {{3}}. Expected delivery: {{4}}.',
    'Fast & Secure Delivery',
    '[{"type": "QUICK_REPLY", "text": "Track Shipment"}]'::jsonb,
    '{"body": ["Alex", "ORD-9842", "TRK-55420", "Tomorrow"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'shipping_dispatch'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 4. Appointment Reminder
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'appointment_reminder', 'Utility', 'en_US', 'text', 'Appointment Reminder 📅',
    'Hi {{1}}, this is a friendly reminder for your appointment on {{2}} at {{3}} with {{4}}. Please let us know if you can make it.',
    'Please confirm attendance',
    '[{"type": "QUICK_REPLY", "text": "Confirm"}, {"type": "QUICK_REPLY", "text": "Reschedule"}]'::jsonb,
    '{"body": ["David", "Oct 15, 2026", "02:30 PM", "Consultant"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'appointment_reminder'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 5. Payment Reminder
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'payment_reminder', 'Utility', 'en_US', 'text', 'Payment Reminder 💳',
    'Dear {{1}}, this is a gentle reminder that invoice #{{2}} amounting to {{3}} is due on {{4}}. Please complete your payment.',
    'Accounts & Billing Department',
    '[{"type": "QUICK_REPLY", "text": "Pay Now"}, {"type": "QUICK_REPLY", "text": "Already Paid"}]'::jsonb,
    '{"body": ["Michael", "INV-1092", "$120.00", "October 25"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'payment_reminder'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 6. Promotional Offer
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'special_discount_promo', 'Marketing', 'en_US', 'text', 'Special Offer For You! 🎉',
    'Hi {{1}}, enjoy an exclusive {{2}}% discount on your next purchase! Use voucher code *{{3}}* at checkout. Valid until {{4}}.',
    'Limited time offer',
    '[{"type": "QUICK_REPLY", "text": "Shop Now"}, {"type": "QUICK_REPLY", "text": "Unsubscribe"}]'::jsonb,
    '{"body": ["Emily", "20", "SAVE20", "Sunday midnight"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'special_discount_promo'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 7. Feedback Review Request
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'feedback_review_request', 'Marketing', 'en_US', 'text', 'How was your experience? ⭐',
    'Hi {{1}}, thank you for shopping with us! We would love to know how your experience was. Please rate us below:',
    'We value your feedback',
    '[{"type": "QUICK_REPLY", "text": "⭐⭐⭐⭐⭐ Excellent"}, {"type": "QUICK_REPLY", "text": "⭐⭐⭐ Good"}, {"type": "QUICK_REPLY", "text": "Needs Improvement"}]'::jsonb,
    '{"body": ["Customer"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'feedback_review_request'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 8. Support Ticket Resolved
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'support_ticket_resolved', 'Utility', 'en_US', 'text', 'Support Ticket Resolved 💬',
    'Hello {{1}}, ticket #{{2}} regarding "{{3}}" has been resolved. If you need any further help, feel free to let us know!',
    'Customer Support Team',
    '[{"type": "QUICK_REPLY", "text": "All Good, Thanks"}, {"type": "QUICK_REPLY", "text": "Reopen Ticket"}]'::jsonb,
    '{"body": ["Robert", "TCK-2041", "Account inquiry"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'support_ticket_resolved'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  RETURN v_inserted;
END;
$$;

-- Seed starter templates for existing accounts that have 0 templates
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT a.id AS account_id, a.owner_id AS user_id
    FROM accounts a
    WHERE NOT EXISTS (
      SELECT 1 FROM message_templates mt WHERE mt.account_id = a.id
    )
  LOOP
    IF rec.user_id IS NOT NULL THEN
      PERFORM seed_starter_message_templates(rec.account_id, rec.user_id);
    END IF;
  END LOOP;
END;
$$;
