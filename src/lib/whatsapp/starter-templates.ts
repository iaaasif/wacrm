import type { TemplateButton } from '@/types';

export interface StarterTemplate {
  name: string;
  category: 'Marketing' | 'Utility';
  language: string;
  title: string;
  description: string;
  header_type?: 'text';
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: TemplateButton[];
  sample_values?: { body?: string[]; header?: string[] };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'property_inquiry_welcome',
    category: 'Marketing',
    language: 'en_US',
    title: 'Property Inquiry Welcome',
    description: 'Greets prospective buyers inquiring about apartments, plots, or commercial spaces.',
    header_type: 'text',
    header_content: 'Welcome to Prime Real Estate 🏡',
    body_text: 'Hello {{1}}, thank you for your interest in {{2}}! We have curated detailed floor plans, pricing sheets, and project amenities for you. Would you like to schedule a private site visit?',
    footer_text: 'Your Trusted Property Advisor',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Schedule Viewing' },
      { type: 'QUICK_REPLY', text: 'Download Brochure' },
    ],
    sample_values: { body: ['Rahim', 'Green Valley Luxury Apartments'] },
  },
  {
    name: 'site_visit_invitation',
    category: 'Marketing',
    language: 'en_US',
    title: 'Site Visit / Property Tour',
    description: 'Invites serious buyers to view sample apartments or inspect project sites.',
    header_type: 'text',
    header_content: 'Exclusive Property Viewing 📍',
    body_text: 'Hi {{1}}, we would love to invite you to view our model apartment at {{2}} this week! Location: {{3}}. Our senior property consultant will be there to guide you.',
    footer_text: 'Complimentary refreshments provided',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm Visit' },
      { type: 'QUICK_REPLY', text: 'Change Date' },
    ],
    sample_values: { body: ['Karim', 'Skyline Towers, Banani', 'Road 11, Block D'] },
  },
  {
    name: 'site_visit_reminder',
    category: 'Utility',
    language: 'en_US',
    title: 'Site Visit Reminder',
    description: 'Sends a reminder before a scheduled property visit or inspection.',
    header_type: 'text',
    header_content: 'Upcoming Property Viewing 📅',
    body_text: 'Hello {{1}}, this is a friendly reminder for your scheduled property visit on {{2}} at {{3}} for {{4}}. Our representative {{5}} will meet you at the site.',
    footer_text: 'Please reply if you need directions',
    buttons: [
      { type: 'QUICK_REPLY', text: "I'll Be There" },
      { type: 'QUICK_REPLY', text: 'Reschedule' },
    ],
    sample_values: { body: ['Tanvir', 'October 16, 2026', '11:00 AM', 'Gulshan Lakefront Penthouse', 'Arman'] },
  },
  {
    name: 'new_project_launch',
    category: 'Marketing',
    language: 'en_US',
    title: 'New Project Pre-Launch',
    description: 'Broadcasts new residential or commercial developments with early-bird pricing.',
    header_type: 'text',
    header_content: 'Pre-Launch VIP Access 🚀',
    body_text: 'Hi {{1}}, be the first to explore our brand new residential development: *{{2}}* located in {{3}}! Early-bird pricing starts from {{4}} with flexible {{5}}-year installment plans.',
    footer_text: 'Limited units available at launch price',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Get Floor Plans' },
      { type: 'QUICK_REPLY', text: 'Speak with Agent' },
    ],
    sample_values: { body: ['Farhan', 'The Grand Vista', 'Bashundhara R/A', '$150,000', '5'] },
  },
  {
    name: 'booking_token_confirmation',
    category: 'Utility',
    language: 'en_US',
    title: 'Unit Booking Confirmation',
    description: 'Confirms receipt of booking token/deposit for an apartment or plot.',
    header_type: 'text',
    header_content: 'Unit Booking Confirmed 📑',
    body_text: 'Dear {{1}}, congratulations on reserving unit #{{2}} at {{3}}! We have successfully received your token deposit of {{4}}. Our allotment agreement is being prepared.',
    footer_text: 'Sales & Allotment Team',
    buttons: [
      { type: 'QUICK_REPLY', text: 'View Booking Form' },
      { type: 'QUICK_REPLY', text: 'Contact Advisor' },
    ],
    sample_values: { body: ['Nazmul', 'A-702', 'Sunrise Heights', '$5,000'] },
  },
  {
    name: 'price_drop_special_deal',
    category: 'Marketing',
    language: 'en_US',
    title: 'Exclusive Price Drop Alert',
    description: 'Alerts interested leads when a property seller reduces the asking price.',
    header_type: 'text',
    header_content: 'Exclusive Price Drop Alert 🏷️',
    body_text: 'Hi {{1}}, exciting news! The owner of {{2}} has just reduced the asking price to *{{3}}* (previously {{4}}). This prime property is ready for immediate handover.',
    footer_text: 'First come, first served basis',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Make an Offer' },
      { type: 'QUICK_REPLY', text: 'Book Inspection' },
    ],
    sample_values: { body: ['Sultan', '3-BHK Apartment in Dhanmondi', '$180,000', '$210,000'] },
  },
  {
    name: 'installment_payment_reminder',
    category: 'Utility',
    language: 'en_US',
    title: 'Installment Due Reminder',
    description: 'Reminds buyers about upcoming monthly/quarterly construction installments.',
    header_type: 'text',
    header_content: 'Property Installment Due 💳',
    body_text: 'Dear {{1}}, this is a gentle reminder that installment #{{2}} for unit {{3}} at {{4}} amounting to {{5}} is due on {{6}}. Please let us know once the transfer is completed.',
    footer_text: 'Accounts & Customer Relations',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Payment Details' },
      { type: 'QUICK_REPLY', text: 'Already Transferred' },
    ],
    sample_values: { body: ['Hasan', '4th Installment', 'Flat 4B', 'Oasis Residences', '$4,200', 'October 30'] },
  },
  {
    name: 'seller_property_valuation',
    category: 'Marketing',
    language: 'en_US',
    title: 'Free Property Valuation',
    description: 'Engages homeowners and property sellers seeking to sell or lease.',
    header_type: 'text',
    header_content: 'Thinking of Selling or Renting? 📈',
    body_text: 'Hello {{1}}, buyer demand in {{2}} is currently at an all-time high! Would you like a complimentary market valuation report for your property? We have verified buyers ready.',
    footer_text: 'Fast & Transparent Transactions',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Get Free Valuation' },
      { type: 'QUICK_REPLY', text: 'List My Property' },
    ],
    sample_values: { body: ['Zubair', 'Uttara Sector 7'] },
  },
];
