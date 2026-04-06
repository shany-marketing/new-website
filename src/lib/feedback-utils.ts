export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  selectedText: string | null;
  startOffset: number | null;
  endOffset: number | null;
  parentId: string | null;
  resolved: boolean;
  createdAt: string;
  replies: FeedbackItem[];
}

export interface FeedbackRaw {
  id: string;
  user_id: string;
  user_name: string;
  comment: string;
  selected_text: string | null;
  start_offset: number | null;
  end_offset: number | null;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
}

function rawToItem(raw: FeedbackRaw): FeedbackItem {
  return {
    id: raw.id,
    userId: raw.user_id,
    userName: raw.user_name,
    comment: raw.comment,
    selectedText: raw.selected_text,
    startOffset: raw.start_offset,
    endOffset: raw.end_offset,
    parentId: raw.parent_id,
    resolved: raw.resolved,
    createdAt: raw.created_at,
    replies: [],
  };
}

export function nestFeedback(flat: FeedbackRaw[]): FeedbackItem[] {
  const map = new Map<string, FeedbackItem>();
  const roots: FeedbackItem[] = [];

  for (const raw of flat) {
    map.set(raw.id, rawToItem(raw));
  }

  for (const raw of flat) {
    const node = map.get(raw.id)!;
    if (raw.parent_id && map.has(raw.parent_id)) {
      map.get(raw.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
