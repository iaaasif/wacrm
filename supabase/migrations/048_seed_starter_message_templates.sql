-- ============================================================
-- 048_seed_starter_message_templates.sql
--
-- Provides 8 battle-tested Real Estate WhatsApp message templates
-- for property inquiries, viewings, bookings, launches, and installments.
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
  -- 1. Property Inquiry Welcome
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'property_inquiry_welcome', 'Marketing', 'en_US', 'text', 'Welcome to Prime Real Estate 🏡',
    'Hello {{1}}, thank you for your interest in {{2}}! We have curated detailed floor plans, pricing sheets, and project amenities for you. Would you like to schedule a private site visit?',
    'Your Trusted Property Advisor',
    '[{"type": "QUICK_REPLY", "text": "Schedule Viewing"}, {"type": "QUICK_REPLY", "text": "Download Brochure"}]'::jsonb,
    '{"body": ["Rahim", "Green Valley Luxury Apartments"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'property_inquiry_welcome'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 2. Site Visit Invitation
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'site_visit_invitation', 'Marketing', 'en_US', 'text', 'Exclusive Property Viewing 📍',
    'Hi {{1}}, we would love to invite you to view our model apartment at {{2}} this week! Location: {{3}}. Our senior property consultant will be there to guide you.',
    'Complimentary refreshments provided',
    '[{"type": "QUICK_REPLY", "text": "Confirm Visit"}, {"type": "QUICK_REPLY", "text": "Change Date"}]'::jsonb,
    '{"body": ["Karim", "Skyline Towers, Banani", "Road 11, Block D"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'site_visit_invitation'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 3. Site Visit Reminder
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'site_visit_reminder', 'Utility', 'en_US', 'text', 'Upcoming Property Viewing 📅',
    'Hello {{1}}, this is a friendly reminder for your scheduled property visit on {{2}} at {{3}} for {{4}}. Our representative {{5}} will meet you at the site.',
    'Please reply if you need directions',
    '[{"type": "QUICK_REPLY", "text": "I''ll Be There"}, {"type": "QUICK_REPLY", "text": "Reschedule"}]'::jsonb,
    '{"body": ["Tanvir", "October 16, 2026", "11:00 AM", "Gulshan Lakefront Penthouse", "Arman"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'site_visit_reminder'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 4. New Project Pre-Launch
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'new_project_launch', 'Marketing', 'en_US', 'text', 'Pre-Launch VIP Access 🚀',
    'Hi {{1}}, be the first to explore our brand new residential development: *{{2}}* located in {{3}}! Early-bird pricing starts from {{4}} with flexible {{5}}-year installment plans.',
    'Limited units available at launch price',
    '[{"type": "QUICK_REPLY", "text": "Get Floor Plans"}, {"type": "QUICK_REPLY", "text": "Speak with Agent"}]'::jsonb,
    '{"body": ["Farhan", "The Grand Vista", "Bashundhara R/A", "$150,000", "5"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'new_project_launch'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 5. Unit Booking Confirmation
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'booking_token_confirmation', 'Utility', 'en_US', 'text', 'Unit Booking Confirmed 📑',
    'Dear {{1}}, congratulations on reserving unit #{{2}} at {{3}}! We have successfully received your token deposit of {{4}}. Our allotment agreement is being prepared.',
    'Sales & Allotment Team',
    '[{"type": "QUICK_REPLY", "text": "View Booking Form"}, {"type": "QUICK_REPLY", "text": "Contact Advisor"}]'::jsonb,
    '{"body": ["Nazmul", "A-702", "Sunrise Heights", "$5,000"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'booking_token_confirmation'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 6. Exclusive Price Drop Alert
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'price_drop_special_deal', 'Marketing', 'en_US', 'text', 'Exclusive Price Drop Alert 🏷️',
    'Hi {{1}}, exciting news! The owner of {{2}} has just reduced the asking price to *{{3}}* (previously {{4}}). This prime property is ready for immediate handover.',
    'First come, first served basis',
    '[{"type": "QUICK_REPLY", "text": "Make an Offer"}, {"type": "QUICK_REPLY", "text": "Book Inspection"}]'::jsonb,
    '{"body": ["Sultan", "3-BHK Apartment in Dhanmondi", "$180,000", "$210,000"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'price_drop_special_deal'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 7. Installment Due Reminder
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'installment_payment_reminder', 'Utility', 'en_US', 'text', 'Property Installment Due 💳',
    'Dear {{1}}, this is a gentle reminder that installment #{{2}} for unit {{3}} at {{4}} amounting to {{5}} is due on {{6}}. Please let us know once the transfer is completed.',
    'Accounts & Customer Relations',
    '[{"type": "QUICK_REPLY", "text": "Payment Details"}, {"type": "QUICK_REPLY", "text": "Already Transferred"}]'::jsonb,
    '{"body": ["Hasan", "4th Installment", "Flat 4B", "Oasis Residences", "$4,200", "October 30"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'installment_payment_reminder'
  );
  IF FOUND THEN v_inserted := v_inserted + 1; END IF;

  -- 8. Free Property Valuation
  INSERT INTO message_templates (
    account_id, user_id, name, category, language, header_type, header_content,
    body_text, footer_text, buttons, sample_values, status, meta_template_id
  )
  SELECT
    p_account_id, p_user_id, 'seller_property_valuation', 'Marketing', 'en_US', 'text', 'Thinking of Selling or Renting? 📈',
    'Hello {{1}}, buyer demand in {{2}} is currently at an all-time high! Would you like a complimentary market valuation report for your property? We have verified buyers ready.',
    'Fast & Transparent Transactions',
    '[{"type": "QUICK_REPLY", "text": "Get Free Valuation"}, {"type": "QUICK_REPLY", "text": "List My Property"}]'::jsonb,
    '{"body": ["Zubair", "Uttara Sector 7"]}'::jsonb,
    'APPROVED', 'starter-' || gen_random_uuid()::text
  WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE user_id = p_user_id AND name = 'seller_property_valuation'
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
