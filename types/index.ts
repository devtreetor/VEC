export type UserRole = 'client' | 'editor' | 'agency';

export interface User {
  id: string;
  email: string;
  roles: UserRole[];
  full_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  profile_completion_pct: number;
  active_gig_count: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  bio: string | null;
  website_url: string | null;
  location: string | null;
  social_links: Record<string, string>;
  updated_at: string;
}

export type PortfolioType = 'youtube' | 'vimeo' | 'drive' | 'website' | 'social';

export interface PortfolioItem {
  id: string;
  user_id: string;
  type: PortfolioType;
  url: string;
  title: string | null;
  display_order: number;
  created_at: string;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  editor_id: string;
  is_visible: boolean;
  joined_at: string;
  editor?: User;
}

export type GigStatus = 'open' | 'filled' | 'closed';
export type GigType = 'one_time' | 'recurring';

export interface Gig {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: GigStatus;
  gig_type: GigType;
  recur_date: string | null;
  applicant_count: number;
  created_at: string;
  filled_at: string | null;
  updated_at: string;
  client?: User;
}

export type ApplicationStage = 'applied' | 'shortlisted' | 'interviewing' | 'hired';

export interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
  stage: ApplicationStage;
  cover_note: string | null;
  is_withdrawn: boolean;
  applied_at: string;
  updated_at: string;
  applicant?: User;
  gig?: Gig;
}

export interface Thread {
  id: string;
  gig_id: string;
  client_id: string;
  applicant_id: string;
  created_at: string;
  last_message_at: string | null;
  gig?: Gig;
  client?: User;
  applicant?: User;
  last_message?: Message;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  sent_at: string;
  sender?: User;
}

export type NotificationType = 'application' | 'shortlist' | 'message' | 'hired' | 'gig_reopen';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
