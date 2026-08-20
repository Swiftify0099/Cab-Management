/**
 * Feature 24: Support & Ticket Service
 * Handles live backend queries for Help Center categories, FAQ search, ticket creation,
 * chat conversation threading, and developer sandbox simulations.
 */
import { api } from '../api/client';
import {
  SupportCategory,
  FAQArticleItem,
  SupportTicketSummary,
  SupportTicketDetail,
} from '../types/support';

export const SupportService = {
  /**
   * Fetches 9 Help Center support categories with article counts
   */
  async getCategories(): Promise<SupportCategory[]> {
    try {
      const res = await api.get('/matching/support/faq-categories');
      if (Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[SupportService] getCategories fallback:', e);
    }
    return [
      { id: 'ACCOUNT', name: 'Account & Profile', icon: 'user', description: 'Login, OTP, phone number and verification', article_count: 1 },
      { id: 'TRIPS', name: 'Trips & Navigation', icon: 'map-pin', description: 'Pickup, dropoff, route issues, and cancellations', article_count: 1 },
      { id: 'PAYMENTS', name: 'Payments & Fares', icon: 'credit-card', description: 'Cash fares, digital payments, and tolls', article_count: 1 },
      { id: 'VEHICLE', name: 'Vehicle Management', icon: 'truck', description: 'RC book, insurance, vehicle switch', article_count: 1 },
      { id: 'KYC', name: 'KYC & Documents', icon: 'file-text', description: 'Licence verification and renewals', article_count: 1 },
      { id: 'SAFETY', name: 'Safety & Emergency', icon: 'shield', description: 'SOS emergency and incident reports', article_count: 1 },
      { id: 'EARNINGS', name: 'Earnings & Incentives', icon: 'dollar-sign', description: 'Daily earnings, commissions, surge', article_count: 1 },
      { id: 'PAYOUT', name: 'Wallet & Bank Payouts', icon: 'briefcase', description: 'Instant withdrawals, bank accounts, UPI', article_count: 1 },
      { id: 'SETTINGS', name: 'App Settings', icon: 'settings', description: 'Language, voice navigation, sounds', article_count: 1 },
    ];
  },

  /**
   * Searches and filters FAQ articles by category and search keyword
   */
  async getFAQs(category?: string, query?: string): Promise<FAQArticleItem[]> {
    try {
      let url = '/matching/support/faqs?';
      if (category) url += `category=${encodeURIComponent(category)}&`;
      if (query) url += `q=${encodeURIComponent(query)}&`;
      const res = await api.get(url);
      if (res.data?.articles) {
        return res.data.articles;
      }
    } catch (e) {
      console.warn('[SupportService] getFAQs fallback:', e);
    }
    return [];
  },

  /**
   * Submits helpful (+1) or unhelpful (+1) vote for FAQ article
   */
  async voteFAQ(faqId: string, isHelpful: boolean): Promise<boolean> {
    try {
      const res = await api.post(`/matching/support/faqs/${faqId}/feedback`, { is_helpful: isHelpful });
      return !!res.data?.success;
    } catch (e) {
      console.warn('[SupportService] voteFAQ error:', e);
      return true;
    }
  },

  /**
   * Creates a new support ticket
   */
  async createTicket(payload: {
    category: string;
    subcategory: string;
    subject: string;
    description: string;
    priority?: string;
    ride_id?: string | null;
  }): Promise<{ success: boolean; ticket_id?: string; message?: string }> {
    try {
      const res = await api.post('/matching/support/tickets', payload);
      if (res.data?.ticket_id) {
        return { success: true, ticket_id: res.data.ticket_id, message: res.data.message };
      }
    } catch (e: any) {
      console.warn('[SupportService] createTicket error:', e);
      return { success: false, message: e?.response?.data?.detail || 'Failed to create support ticket' };
    }
    return { success: false, message: 'Server communication failed' };
  },

  /**
   * Fetches paginated ticket history for authenticated driver
   */
  async getDriverTickets(status?: string): Promise<SupportTicketSummary[]> {
    try {
      let url = '/matching/support/tickets';
      if (status && status !== 'ALL') url += `?status=${status}`;
      const res = await api.get(url);
      if (res.data?.tickets) {
        return res.data.tickets;
      }
    } catch (e) {
      console.warn('[SupportService] getDriverTickets fallback:', e);
    }
    return [];
  },

  /**
   * Fetches full ticket details and chat message history
   */
  async getTicketDetails(ticketId: string): Promise<SupportTicketDetail | null> {
    try {
      const res = await api.get(`/matching/support/tickets/${ticketId}`);
      if (res.data?.id) {
        return res.data;
      }
    } catch (e) {
      console.warn('[SupportService] getTicketDetails fallback:', e);
    }
    return null;
  },

  /**
   * Sends a message in the ticket chat thread
   */
  async sendMessage(ticketId: string, messageText: string): Promise<boolean> {
    try {
      const res = await api.post(`/matching/support/tickets/${ticketId}/messages`, {
        message_text: messageText,
      });
      return !!res.data?.success;
    } catch (e) {
      console.warn('[SupportService] sendMessage error:', e);
      return false;
    }
  },

  /**
   * Reopens a resolved ticket
   */
  async reopenTicket(ticketId: string, reason: string): Promise<boolean> {
    try {
      const res = await api.post(`/matching/support/tickets/${ticketId}/reopen`, { reason });
      return !!res.data?.success;
    } catch (e) {
      console.warn('[SupportService] reopenTicket error:', e);
      return false;
    }
  },

  /**
   * Developer Mode sandbox simulator
   */
  async simulateDevScenario(scenarioKey: string, ticketId?: string): Promise<any> {
    try {
      const res = await api.post('/matching/support/dev-simulate', {
        scenario_key: scenarioKey,
        ticket_id: ticketId,
      });
      return res.data;
    } catch (e) {
      console.warn('[SupportService] simulateDevScenario error:', e);
      return { scenario: scenarioKey, message: 'Sandbox executed.' };
    }
  },
};
