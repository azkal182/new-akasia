'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  asRecord,
  formatScheduleDate,
  getRecordString,
  normalizeEvidenceList,
  normalizeSessionDetail,
  sessionBadgeClass,
  type NormalizedEvidence,
  type NormalizedSessionDetail,
} from '@/lib/integration-ui';

type ReportStatus = 'COMPLETED' | 'COMPLETED_WITH_ISSUE';

type SessionState = {
  detail: NormalizedSessionDetail;
  photos: NormalizedEvidence[];
  documents: NormalizedEvidence[];
};

function countEvidences(state: SessionState | null) {
  if (!state) {
    return 0;
  }

  return state.photos.length + state.documents.length;
}

function getStoredSessionKey(scheduleId: string) {
  return `integration-session:${scheduleId}`;
}

export default function ProgramKerjaTodaySubmitPage() {
  const params = useParams<{ scheduleId: string }>();
  const scheduleIdFromRoute = decodeURIComponent(params.scheduleId ?? '');

  const [session, setSession] = useState<SessionState | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [status, setStatus] = useState<ReportStatus>('COMPLETED');
  const [issueNote, setIssueNote] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const requirementType = session?.detail.requirementType ?? null;
  const budgetLabel =
    session?.detail.budgetAmount !== null && session?.detail.budgetAmount !== undefined
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(session.detail.budgetAmount)
      : '-';
  const totalEvidences = countEvidences(session);
  const minUploads = session?.detail.minUploads ?? null;
  const isFinalSession = Boolean(session?.detail.status && session.detail.status !== 'DRAFT');
  const isEvidenceEnough = minUploads === null || totalEvidences >= minUploads;

  const canSubmit = useMemo(() => {
    if (!session) {
      return false;
    }

    return !isFinalSession && isEvidenceEnough;
  }, [isEvidenceEnough, isFinalSession, session]);

  const findSessionIdFromToday = useCallback(async () => {
    try {
      const response = await fetch('/api/integration/field/today');
      const body = await response.json();
      if (!response.ok) {
        return null;
      }

      const schedules = Array.isArray(body)
        ? body
        : Array.isArray(asRecord(body)?.schedules)
          ? (asRecord(body)?.schedules as unknown[])
          : [];

      const target = schedules.find((item) => {
        const rec = asRecord(item);
        return (
          getRecordString(rec, 'id') === scheduleIdFromRoute ||
          getRecordString(rec, 'scheduleId') === scheduleIdFromRoute
        );
      });

      const targetRecord = asRecord(target);
      const sessionIdFromSingle = getRecordString(asRecord(targetRecord?.session), 'id');
      if (sessionIdFromSingle) {
        return sessionIdFromSingle;
      }

      const sessions = Array.isArray(targetRecord?.sessions) ? targetRecord.sessions : [];
      const firstSession = asRecord(sessions[0]);
      return getRecordString(firstSession, 'id');
    } catch {
      return null;
    }
  }, [scheduleIdFromRoute]);

  async function loadSession(
    sessionId: string,
    options: { manageLoading?: boolean; persist?: boolean } = {},
  ) {
    const { manageLoading = true, persist = true } = options;
    if (manageLoading) {
      setLoadingSession(true);
    }
    setSessionError('');

    try {
      const [detailRes, photosRes, docsRes] = await Promise.all([
        fetch(`/api/integration/sessions/${encodeURIComponent(sessionId)}`),
        fetch(`/api/integration/sessions/${encodeURIComponent(sessionId)}/photos`),
        fetch(`/api/integration/sessions/${encodeURIComponent(sessionId)}/documents`),
      ]);

      const detailBody = await detailRes.json();
      if (!detailRes.ok) {
        setSessionError(typeof detailBody?.error === 'string' ? detailBody.error : 'Gagal mengambil detail session');
        return false;
      }

      const normalizedDetail = normalizeSessionDetail(detailBody);
      if (!normalizedDetail) {
        setSessionError('Response detail session tidak valid.');
        return false;
      }

      const photosBody = photosRes.ok ? await photosRes.json() : [];
      const documentsBody = docsRes.ok ? await docsRes.json() : [];

      setSession({
        detail: normalizedDetail,
        photos: normalizeEvidenceList(Array.isArray(photosBody) ? photosBody : []),
        documents: normalizeEvidenceList(Array.isArray(documentsBody) ? documentsBody : []),
      });

      if (persist && typeof window !== 'undefined') {
        window.sessionStorage.setItem(getStoredSessionKey(scheduleIdFromRoute), normalizedDetail.sessionId);
      }

      return true;
    } catch {
      setSessionError('Terjadi kesalahan jaringan saat memuat session.');
      return false;
    } finally {
      if (manageLoading) {
        setLoadingSession(false);
      }
    }
  }

  const ensureSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError('');
    setSubmitSuccess('');

    try {
      if (typeof window !== 'undefined') {
        const stored = window.sessionStorage.getItem(getStoredSessionKey(scheduleIdFromRoute));
        if (stored) {
          const loaded = await loadSession(stored, { manageLoading: false, persist: false });
          if (loaded) {
            return;
          }
        }
      }

      const response = await fetch('/api/integration/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId: scheduleIdFromRoute }),
      });

      const body = await response.json();
      if (!response.ok) {
        const bodyRecord = asRecord(body);
        const maybeSessionId =
          getRecordString(bodyRecord, 'sessionId') ??
          getRecordString(asRecord(bodyRecord?.session), 'id');

        if (maybeSessionId) {
          await loadSession(maybeSessionId, { manageLoading: false });
          return;
        }

        const fromToday = await findSessionIdFromToday();
        if (fromToday) {
          await loadSession(fromToday, { manageLoading: false });
          return;
        }

        setSessionError(typeof body?.error === 'string' ? body.error : 'Gagal memulai session');
        return;
      }

      const normalized = normalizeSessionDetail(body);
      if (!normalized) {
        setSessionError('Response start session tidak valid.');
        return;
      }

      await loadSession(normalized.sessionId, { manageLoading: false });
    } catch {
      setSessionError('Terjadi kesalahan jaringan saat start session.');
    } finally {
      setLoadingSession(false);
    }
  }, [findSessionIdFromToday, scheduleIdFromRoute]);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !photoFile) {
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      const form = new FormData();
      form.set('file', photoFile);
      if (photoCaption.trim()) {
        form.set('caption', photoCaption.trim());
      }

      const response = await fetch(`/api/integration/sessions/${encodeURIComponent(session.detail.sessionId)}/photos`, {
        method: 'POST',
        body: form,
      });
      const body = await response.json();

      if (!response.ok) {
        setUploadError(typeof body?.error === 'string' ? body.error : 'Upload foto gagal');
        return;
      }

      setPhotoFile(null);
      setPhotoCaption('');
      await loadSession(session.detail.sessionId);
    } catch {
      setUploadError('Terjadi kesalahan jaringan saat upload foto.');
    } finally {
      setUploadLoading(false);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !documentFile) {
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      const form = new FormData();
      form.set('file', documentFile);
      if (documentName.trim()) {
        form.set('name', documentName.trim());
      }

      const response = await fetch(
        `/api/integration/sessions/${encodeURIComponent(session.detail.sessionId)}/documents`,
        {
          method: 'POST',
          body: form,
        },
      );
      const body = await response.json();

      if (!response.ok) {
        setUploadError(typeof body?.error === 'string' ? body.error : 'Upload dokumen gagal');
        return;
      }

      setDocumentFile(null);
      setDocumentName('');
      await loadSession(session.detail.sessionId);
    } catch {
      setUploadError('Terjadi kesalahan jaringan saat upload dokumen.');
    } finally {
      setUploadLoading(false);
    }
  }

  async function deleteEvidence(type: 'photos' | 'documents', id: string) {
    if (!session) {
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      const isPhoto = type === 'photos';
      const queryKey = isPhoto ? 'photoId' : 'documentId';
      const response = await fetch(
        `/api/integration/sessions/${encodeURIComponent(session.detail.sessionId)}/${type}?${queryKey}=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      );
      const body = await response.json();

      if (!response.ok) {
        setUploadError(typeof body?.error === 'string' ? body.error : 'Gagal menghapus bukti');
        return;
      }

      await loadSession(session.detail.sessionId);
    } catch {
      setUploadError('Terjadi kesalahan jaringan saat menghapus bukti.');
    } finally {
      setUploadLoading(false);
    }
  }

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const payload: Record<string, unknown> = { status };
      if (status === 'COMPLETED_WITH_ISSUE') {
        payload.issueNote = issueNote;
      }

      const response = await fetch(`/api/integration/sessions/${encodeURIComponent(session.detail.sessionId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        setSubmitError(typeof body?.error === 'string' ? body.error : 'Gagal submit session');
        return;
      }

      const statusAfterSubmit = getRecordString(asRecord(body), 'status') ?? 'COMPLETED';
      setSubmitSuccess(`Session berhasil disubmit (${statusAfterSubmit}).`);
      await loadSession(session.detail.sessionId);
    } catch {
      setSubmitError('Terjadi kesalahan jaringan saat submit session.');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Session Laporan</h1>
          <p className="text-sm text-muted-foreground">Flow parity: start session, upload evidence, lalu submit.</p>
        </div>
        <Link href="/dashboard/program-kerja/today">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Today
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">1) Start / Load Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => void ensureSession()} disabled={loadingSession} className="bg-blue-600 hover:bg-blue-500">
            {loadingSession ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              'Refresh Session'
            )}
          </Button>

          {sessionError ? <p className="text-sm text-red-300">{sessionError}</p> : null}

          {session ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Program</p>
                  <p className="font-medium text-foreground">{session.detail.programName ?? '-'}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Divisi</p>
                  <p className="font-medium text-foreground">{session.detail.divisionName ?? '-'}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">PIC</p>
                  <p className="font-medium text-foreground">{session.detail.userName ?? '-'}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Dana</p>
                  <p className="font-medium text-foreground">{budgetLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={sessionBadgeClass(session.detail.status)}>
                    {session.detail.status ?? 'DRAFT'}
                  </Badge>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium text-foreground">{formatScheduleDate(session.detail.scheduleDate)}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Jam</p>
                  <p className="font-medium text-foreground">{session.detail.scheduleTime ?? '-'}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                  <p className="text-muted-foreground">Evidence</p>
                  <p className="font-medium text-foreground">
                    {totalEvidences}
                    {minUploads !== null ? ` / min ${minUploads}` : ''}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-muted/60 p-3 text-sm">
                <p className="text-muted-foreground">Deskripsi Program</p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {session.detail.programDescription ?? '-'}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {session ? (
        <Card className="border-border bg-card/60">
          <CardHeader>
            <CardTitle className="text-foreground">2) Upload Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {requirementType === 'PHOTO' ? (
              <form onSubmit={uploadPhoto} className="space-y-3">
                <p className="text-sm font-medium text-foreground">Upload Foto</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  required
                />
                <Input
                  value={photoCaption}
                  onChange={(event) => setPhotoCaption(event.target.value)}
                  placeholder="Caption (opsional)"
                />
                <Button type="submit" disabled={uploadLoading || !photoFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Foto
                </Button>
              </form>
            ) : null}

            {requirementType === 'DOCUMENT' ? (
              <form onSubmit={uploadDocument} className="space-y-3">
                <p className="text-sm font-medium text-foreground">Upload Dokumen</p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                  required
                />
                <Input
                  value={documentName}
                  onChange={(event) => setDocumentName(event.target.value)}
                  placeholder="Nama dokumen (opsional)"
                />
                <Button type="submit" disabled={uploadLoading || !documentFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Dokumen
                </Button>
              </form>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Daftar Foto ({session.photos.length})</p>
                <div className="space-y-2 sm:space-y-3">
                  {session.photos.map((photo) => (
                    <div key={photo.id} className="rounded-md bg-muted/60 p-2 text-sm">
                      <a href={photo.url ?? '#'} target="_blank" rel="noreferrer" className="block">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="h-32 w-full rounded-md bg-black/20 object-contain sm:h-40"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                            Preview tidak tersedia
                          </div>
                        )}
                      </a>
                      <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2">
                        <a
                          href={photo.url ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-[75%] truncate text-blue-300 hover:underline"
                        >
                          {photo.label}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void deleteEvidence('photos', photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {session.photos.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada foto.</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Daftar Dokumen ({session.documents.length})</p>
                <div className="space-y-2">
                  {session.documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 p-2 text-sm">
                      <a href={document.url ?? '#'} target="_blank" rel="noreferrer" className="truncate text-blue-300 hover:underline">
                        {document.label}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteEvidence('documents', document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {session.documents.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada dokumen.</p> : null}
                </div>
              </div>
            </div>

            {uploadError ? <p className="text-sm text-red-300">{uploadError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {session ? (
        <Card className="border-border bg-card/60">
          <CardHeader>
            <CardTitle className="text-foreground">3) Submit Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ReportStatus)}
                  className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  disabled={isFinalSession}
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="COMPLETED_WITH_ISSUE">COMPLETED_WITH_ISSUE</option>
                </select>
              </div>

              {status === 'COMPLETED_WITH_ISSUE' ? (
                <div className="space-y-2">
                  <Label htmlFor="issueNote">Issue Note</Label>
                  <Textarea
                    id="issueNote"
                    value={issueNote}
                    onChange={(event) => setIssueNote(event.target.value)}
                    placeholder="Jelaskan kendala di lapangan"
                    disabled={isFinalSession}
                  />
                </div>
              ) : null}

              <Button type="submit" disabled={submitLoading || !canSubmit} className="bg-blue-600 hover:bg-blue-500">
                {submitLoading
                  ? 'Mengirim...'
                  : isFinalSession
                    ? 'Laporan Sudah Disubmit'
                    : 'Submit Session'}
              </Button>
              {!isFinalSession && !isEvidenceEnough ? (
                <p className="text-xs text-amber-300">
                  Session belum bisa disubmit karena evidence belum memenuhi minimum upload.
                </p>
              ) : null}
              {isFinalSession ? (
                <p className="text-xs text-blue-300">
                  Session sudah final. Anda masih bisa melihat bukti dan status terbaru.
                </p>
              ) : null}
              {submitError ? <p className="text-sm text-red-300">{submitError}</p> : null}
              {submitSuccess ? <p className="text-sm text-emerald-300">{submitSuccess}</p> : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
