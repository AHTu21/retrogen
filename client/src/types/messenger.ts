export type ChatListItemDto = {
  id: string;
  kind: string;
  title: string;
  description: string;
  avatarUrl: string | null;
  systemKey: string | null;
  isSaved?: boolean;
  createdById?: string | null;
  viewerRole?: string | null;
  isGroupCreator?: boolean;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    authorName: string;
  } | null;
  members: Array<{ userId: string; displayName: string; role: string }>;
};

export type MessageAttachmentDto = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  previewable: boolean;
};

export type MessageDto = {
  id: string;
  chatId: string;
  kind: string;
  text: string;
  replyToMessageId: string | null;
  clientMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: { id: string; displayName: string; email: string } | null;
  replyPreview: { id: string; text: string; authorName: string } | null;
  attachments?: MessageAttachmentDto[];
};

export type MessengerUserSearchDto = {
  id: string;
  email: string;
  displayName: string;
};

export type SupportQuickCommandDto = {
  id: string;
  label: string;
  userPrompt: string;
};
