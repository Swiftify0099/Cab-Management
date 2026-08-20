export interface SupportCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  article_count: number;
}

export interface FAQArticleItem {
  id: string;
  category: string;
  title: string;
  content_markdown: string;
  helpful_count: number;
  unhelpful_count: number;
  tags: string[];
}

export interface SupportTicketSummary {
  id: string;
  category: string;
  subcategory: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_DRIVER' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  ride_id?: string | null;
  created_at: string;
  last_message_at: string;
  unread_driver_count: number;
}

export interface SupportMessageItem {
  id: string;
  sender_type: 'DRIVER' | 'SUPPORT_AGENT' | 'SYSTEM' | 'BOT';
  sender_name: string;
  message_text: string;
  created_at: string;
  is_driver: boolean;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  description: string;
  messages: SupportMessageItem[];
}
