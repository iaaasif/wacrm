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
    name: 'welcome_greeting',
    category: 'Marketing',
    language: 'en_US',
    title: 'Welcome Message',
    description: 'Greets new customers and introduces your business with quick actions.',
    header_type: 'text',
    header_content: 'Welcome to Our Store! 👋',
    body_text: 'Hello {{1}}, welcome! Thank you for contacting us. We are thrilled to have you here. How can our team assist you today?',
    footer_text: 'Reply to chat with our team',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Browse Catalog' },
      { type: 'QUICK_REPLY', text: 'Talk to Agent' },
    ],
    sample_values: { body: ['Customer'] },
  },
  {
    name: 'order_confirmation',
    category: 'Utility',
    language: 'en_US',
    title: 'Order Confirmation',
    description: 'Instant confirmation after a customer places an order.',
    header_type: 'text',
    header_content: 'Order Confirmed ✅',
    body_text: 'Hi {{1}}, great news! Your order #{{2}} for {{3}} has been confirmed and is being processed. We will notify you once shipped.',
    footer_text: 'Thank you for your purchase',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Track Order' },
      { type: 'QUICK_REPLY', text: 'Customer Support' },
    ],
    sample_values: { body: ['Sarah', 'ORD-9842', '$50.00'] },
  },
  {
    name: 'shipping_dispatch',
    category: 'Utility',
    language: 'en_US',
    title: 'Shipping Update',
    description: 'Notifies customers when their order has been dispatched.',
    header_type: 'text',
    header_content: 'Your Order is on the Way 🚚',
    body_text: 'Hello {{1}}, your order #{{2}} is on its way! Tracking Number: {{3}}. Expected delivery: {{4}}.',
    footer_text: 'Fast & Secure Delivery',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Track Shipment' },
    ],
    sample_values: { body: ['Alex', 'ORD-9842', 'TRK-55420', 'Tomorrow'] },
  },
  {
    name: 'appointment_reminder',
    category: 'Utility',
    language: 'en_US',
    title: 'Appointment Reminder',
    description: 'Reminds clients about an upcoming booking or meeting.',
    header_type: 'text',
    header_content: 'Appointment Reminder 📅',
    body_text: 'Hi {{1}}, this is a friendly reminder for your appointment on {{2}} at {{3}} with {{4}}. Please let us know if you can make it.',
    footer_text: 'Please confirm attendance',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirm' },
      { type: 'QUICK_REPLY', text: 'Reschedule' },
    ],
    sample_values: { body: ['David', 'Oct 15, 2026', '02:30 PM', 'Consultant'] },
  },
  {
    name: 'payment_reminder',
    category: 'Utility',
    language: 'en_US',
    title: 'Payment & Invoice Reminder',
    description: 'Gentle reminder about an open invoice or due payment.',
    header_type: 'text',
    header_content: 'Payment Reminder 💳',
    body_text: 'Dear {{1}}, this is a gentle reminder that invoice #{{2}} amounting to {{3}} is due on {{4}}. Please complete your payment.',
    footer_text: 'Accounts & Billing Department',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Pay Now' },
      { type: 'QUICK_REPLY', text: 'Already Paid' },
    ],
    sample_values: { body: ['Michael', 'INV-1092', '$120.00', 'October 25'] },
  },
  {
    name: 'special_discount_promo',
    category: 'Marketing',
    language: 'en_US',
    title: 'Promotional Offer',
    description: 'Special discount code for marketing campaigns and broadcasts.',
    header_type: 'text',
    header_content: 'Special Offer For You! 🎉',
    body_text: 'Hi {{1}}, enjoy an exclusive {{2}}% discount on your next purchase! Use voucher code *{{3}}* at checkout. Valid until {{4}}.',
    footer_text: 'Limited time offer',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Shop Now' },
      { type: 'QUICK_REPLY', text: 'Unsubscribe' },
    ],
    sample_values: { body: ['Emily', '20', 'SAVE20', 'Sunday midnight'] },
  },
  {
    name: 'feedback_review_request',
    category: 'Marketing',
    language: 'en_US',
    title: 'Customer Feedback & Rating',
    description: 'Requests a quick rating after purchase or support interaction.',
    header_type: 'text',
    header_content: 'How was your experience? ⭐',
    body_text: 'Hi {{1}}, thank you for shopping with us! We would love to know how your experience was. Please rate us below:',
    footer_text: 'We value your feedback',
    buttons: [
      { type: 'QUICK_REPLY', text: '⭐⭐⭐⭐⭐ Excellent' },
      { type: 'QUICK_REPLY', text: '⭐⭐⭐ Good' },
      { type: 'QUICK_REPLY', text: 'Needs Improvement' },
    ],
    sample_values: { body: ['Customer'] },
  },
  {
    name: 'support_ticket_resolved',
    category: 'Utility',
    language: 'en_US',
    title: 'Customer Support Follow-up',
    description: 'Closing message when a customer ticket or inquiry is resolved.',
    header_type: 'text',
    header_content: 'Support Ticket Resolved 💬',
    body_text: 'Hello {{1}}, ticket #{{2}} regarding "{{3}}" has been resolved. If you need any further help, feel free to let us know!',
    footer_text: 'Customer Support Team',
    buttons: [
      { type: 'QUICK_REPLY', text: 'All Good, Thanks' },
      { type: 'QUICK_REPLY', text: 'Reopen Ticket' },
    ],
    sample_values: { body: ['Robert', 'TCK-2041', 'Account inquiry'] },
  },
];
