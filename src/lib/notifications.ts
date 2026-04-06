import { query, queryOne } from "./db";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  hotelId?: string;
  link?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** Create a notification for a single user */
export async function notify(userId: string, payload: NotificationPayload): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, hotel_id, type, title, message, link)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, payload.hotelId ?? null, payload.type, payload.title, payload.message, payload.link ?? null]
  );
}

/** Notify all users with access to a hotel */
export async function notifyHotelUsers(hotelId: string, payload: Omit<NotificationPayload, "hotelId">): Promise<void> {
  // Users who own this hotel + chain managers with access
  const users = await query<{ id: string }>(
    `SELECT id FROM users WHERE hotel_id = $1
     UNION
     SELECT user_id AS id FROM chain_hotel_access WHERE hotel_id = $1`,
    [hotelId]
  );

  for (const user of users) {
    await notify(user.id, { ...payload, hotelId });
  }
}

/** Get unread notifications for a user (most recent 20) */
export async function getUnread(userId: string): Promise<Notification[]> {
  return query<Notification>(
    `SELECT id, type, title, message, link, read, created_at::text
     FROM notifications
     WHERE user_id = $1 AND NOT read
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
}

/** Mark a single notification as read */
export async function markRead(notificationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

/** Mark all notifications as read for a user */
export async function markAllRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND NOT read`,
    [userId]
  );
}
