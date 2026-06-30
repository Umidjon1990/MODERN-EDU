// @modern-edu/sdk — tipli API mijozi.
import type {
  AuthResult,
  ClassMemberDto,
  CreateClass,
  CreateMessage,
  CreateStudent,
  MessageDto,
  PublicClass,
  PublicUser,
  RequestUpload,
  StudentCredential,
  UploadTicket,
} from '@modern-edu/contracts';

export type ClassroomPayload = {
  class: PublicClass;
  members: ClassMemberDto[];
  messages: MessageDto[];
  pinned: MessageDto[];
  myLastReadSeq: number;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  /** Joriy access tokenni beradi (xotira/localStorage'dan). */
  getAccessToken?: () => string | null;
  /** Tokenlar yangilanganda chaqiriladi (login/refresh). */
  onTokens?: (tokens: { accessToken: string; refreshToken: string }) => void;
  /** Sessiya tugaganda (refresh ham muvaffaqiyatsiz) chaqiriladi. */
  onUnauthorized?: () => void;
};

export class ApiClient {
  private readonly baseUrl: string;

  constructor(private readonly opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
  }

  // ---- Auth ----
  auth = {
    login: (username: string, password: string) =>
      this.request<AuthResult>('POST', '/auth/login', { username, password }, { auth: false }).then(
        (r) => {
          this.opts.onTokens?.(r);
          return r;
        },
      ),
    me: () => this.request<PublicUser>('GET', '/auth/me'),
    logout: () => this.request<{ ok: true }>('POST', '/auth/logout'),
    firstPasswordSet: (newPassword: string) =>
      this.request<AuthResult>('POST', '/auth/password/first-set', { newPassword }).then((r) => {
        this.opts.onTokens?.(r);
        return r;
      }),
  };

  // ---- Classes ----
  classes = {
    list: () => this.request<PublicClass[]>('GET', '/classes'),
    create: (dto: CreateClass) => this.request<PublicClass>('POST', '/classes', dto),
    classroom: (classId: string) => this.request<ClassroomPayload>('GET', `/classes/${classId}`),
    roster: (classId: string) =>
      this.request<ClassMemberDto[]>('GET', `/classes/${classId}/members`),
    createStudents: (classId: string, students: CreateStudent[]) =>
      this.request<StudentCredential[]>('POST', `/classes/${classId}/students`, { students }),
  };

  // ---- Messages ----
  messages = {
    list: (classId: string, params?: { beforeSeq?: number; afterSeq?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.beforeSeq) qs.set('beforeSeq', String(params.beforeSeq));
      if (params?.afterSeq !== undefined) qs.set('afterSeq', String(params.afterSeq));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString();
      return this.request<MessageDto[]>('GET', `/classes/${classId}/messages${q ? `?${q}` : ''}`);
    },
    post: (classId: string, dto: CreateMessage) =>
      this.request<MessageDto>('POST', `/classes/${classId}/messages`, dto),
    edit: (messageId: string, body: string) =>
      this.request<MessageDto>('PATCH', `/messages/${messageId}`, { body }),
    remove: (messageId: string) => this.request<{ ok: true }>('DELETE', `/messages/${messageId}`),
    react: (messageId: string, emoji: string) =>
      this.request<MessageDto>('POST', `/messages/${messageId}/reactions`, { emoji }),
    pin: (classId: string, messageId: string) =>
      this.request<{ ok: true }>('POST', `/classes/${classId}/messages/${messageId}/pin`),
    unpin: (classId: string, messageId: string) =>
      this.request<{ ok: true }>('DELETE', `/classes/${classId}/messages/${messageId}/pin`),
    markRead: (classId: string, seq: number) =>
      this.request<{ lastReadSeq: number }>('POST', `/classes/${classId}/read`, { seq }),
  };

  // ---- Media ----
  media = {
    requestUpload: (dto: RequestUpload) =>
      this.request<UploadTicket>('POST', '/media/upload-url', dto),
    finalize: (mediaId: string) =>
      this.request<{ id: string; status: string }>('POST', `/media/${mediaId}/finalize`),
    /** Kontent uchun to'liq URL (token bilan — <img>/<a> uchun). */
    contentUrl: (relativeUrl: string): string => {
      const token = this.opts.getAccessToken?.() ?? '';
      return `${this.baseUrl}${relativeUrl}?token=${encodeURIComponent(token)}`;
    },
    /** Faylni to'liq yuklash: ticket → PUT → finalize. mediaId qaytaradi. */
    upload: async (file: File, kind: RequestUpload['kind']): Promise<string> => {
      const ticket = await this.media.requestUpload({
        kind,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        fileName: file.name,
      });
      const put = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new ApiError(put.status, 'Fayl yuklab bo‘lmadi');
      await this.media.finalize(ticket.mediaId);
      return ticket.mediaId;
    },
  };

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; retried?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const useAuth = opts?.auth !== false;
    if (useAuth) {
      const token = this.opts.getAccessToken?.();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = { method, headers, credentials: 'include' };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, init);

    // 401 → bir marta refresh urinib ko'rish
    if (res.status === 401 && useAuth && !opts?.retried) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(method, path, body, { ...opts, retried: true });
      this.opts.onUnauthorized?.();
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => undefined);
      const message =
        (errBody && typeof errBody === 'object' && 'message' in errBody
          ? String((errBody as { message: unknown }).message)
          : undefined) ?? `So'rov muvaffaqiyatsiz (${res.status})`;
      throw new ApiError(res.status, message, errBody);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as AuthResult;
      this.opts.onTokens?.(tokens);
      return true;
    } catch {
      return false;
    }
  }
}
