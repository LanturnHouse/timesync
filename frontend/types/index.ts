export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "pro_plus";
  timezone: string;
  date_joined: string;
}

export interface Group {
  id: string;
  name: string;
  owner: string;
  boost_count: number;
  tier: "starter" | "lv1" | "lv2" | "lv3";
  max_members: number | null;
  webhook_limit: number | null;
  poll_limit: number | null;
  banner_url: string | null;
  bg_url: string | null;
  invite_code: string;
  members: GroupMember[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  plan: "lv1" | "lv2" | "lv3";
  label: string;
  amount: number;
  order_name: string;
}

export interface SubscriptionPaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  status: "success" | "failed";
  created_at: string;
}

export interface BoostTransfer {
  id: string;
  status: "pending" | "completed" | "cancelled";
  apply_at: string;
  source_group_name: string;
  target_group_name: string;
  target_group_id: string;
  created_at: string;
}

export interface BoostSubscription {
  id: string;
  user: string;
  user_email: string;
  user_display_name: string;
  group: string;
  group_name: string;
  quantity: number;
  amount: number;
  status: "active" | "past_due" | "expired" | "cancelled";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  failed_attempts: number;
  pending_transfer: BoostTransfer | null;
  payments: SubscriptionPaymentRecord[];
  created_at: string;
}

export interface GroupMember {
  user: string;
  user_email: string;
  user_display_name: string;
  role: "admin" | "editor" | "member";
  share_mode: "all" | "selective";
  joined_at: string;
}

export interface Event {
  id: string;
  creator: string;
  creator_email: string;
  creator_display_name: string;
  group: string | null;
  group_name: string | null;
  title: string;
  start_at: string;
  end_at: string;
  description: string | null;
  category: string;
  color: string;
  is_template: boolean;
  is_tombstone: boolean;
  status: "confirmed" | "tentative";
  reminder_minutes: number | null;
  bg_image_url: string | null;
  shared_to_groups: string[];
  // RSVP
  my_rsvp_status: "accepted" | "declined" | "tentative" | null;
  rsvp_counts: { accepted: number; declined: number; tentative: number };
  rsvp_details: {
    accepted: RsvpUser[];
    tentative: RsvpUser[];
    declined: RsvpUser[];
  };
  // Recurrence
  rrule: string;
  recurrence_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventLog {
  id: string;
  action: "updated" | "status_changed" | "rsvp_changed";
  detail: Record<string, unknown>;
  actor: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  created_at: string;
}

export interface RsvpUser {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export interface EventRSVP {
  id: string;
  event: string;
  user: string;
  user_email: string;
  user_display_name: string;
  status: "accepted" | "declined" | "tentative";
  created_at: string;
}

export interface EventReminder {
  id: number;
  event: string;
  user: string;
  remind_before_minutes: number;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface MemberAvailability {
  user_email: string;
  user_display_name: string;
  busy: { start: string; end: string }[];
}

export type AvailabilityData = Record<string, MemberAvailability>;

export interface EventShare {
  id: number;
  event: string;
  group: string;
  group_name: string;
  created_at: string;
}

export interface GroupInvitation {
  id: string;
  group: string;
  group_name: string;
  invited_by: string;
  invited_by_email: string;
  invitee_email: string;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  created_at: string;
}

export interface Boost {
  id: string;
  user: string;
  user_email: string;
  user_display_name: string;
  group: string;
  created_at: string;
}

export interface Comment {
  id: string;
  event: string;
  author: string;
  author_email: string;
  author_display_name: string;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PollOption {
  id: string;
  text: string;
  order: number;
  vote_count: number;
  voted_by_me: boolean;
}

export interface Poll {
  id: string;
  group: string;
  event: string | null;
  creator: string;
  creator_email: string;
  creator_display_name: string;
  question: string;
  is_multiple_choice: boolean;
  closes_at: string | null;
  is_closed: boolean;
  options: PollOption[];
  total_votes: number;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  group: string;
  created_by: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string;
  success: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  opacity?: number;
  classNames?: string[];
  extendedProps: {
    creator: string;
    creator_email: string;
    group: string | null;
    group_name: string | null;
    description: string | null;
    category: string;
    is_template: boolean;
    is_tombstone: boolean;
    status: "confirmed" | "tentative";
  };
}
