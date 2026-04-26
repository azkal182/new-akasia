type UnknownRecord = Record<string, unknown>;

export type NormalizedSchedule = {
  scheduleId: string;
  date: string | null;
  programName: string;
  scheduleTime: string | null;
  requirementType: string | null;
  minUploads: number | null;
  sessionStatus: string | null;
  raw: unknown;
};

export type NormalizedSessionDetail = {
  sessionId: string;
  status: string | null;
  scheduleId: string | null;
  requirementType: string | null;
  minUploads: number | null;
  programName: string | null;
  programDescription: string | null;
  divisionName: string | null;
  scheduleDate: string | null;
  scheduleTime: string | null;
  userName: string | null;
  budgetAmount: number | null;
};

export type NormalizedEvidence = {
  id: string;
  url: string | null;
  label: string;
};

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function getString(source: UnknownRecord | null, key: string): string | null {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getRecordString(source: UnknownRecord | null, key: string): string | null {
  return getString(source, key);
}

function getNumber(source: UnknownRecord | null, key: string): number | null {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

export function getRecordNumber(source: UnknownRecord | null, key: string): number | null {
  return getNumber(source, key);
}

export function normalizeSchedules(input: unknown[] = []): NormalizedSchedule[] {
  return input
    .map((item): NormalizedSchedule | null => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }

      const nestedSchedule = asRecord(rec.schedule);
      const program = asRecord(rec.program);
      const session = asRecord(rec.session);
      const sessionsArray = Array.isArray(rec.sessions) ? rec.sessions : [];
      const firstSession = asRecord(sessionsArray[0]);

      const scheduleId =
        getString(rec, 'scheduleId') ??
        getString(rec, 'id') ??
        getString(nestedSchedule, 'id') ??
        null;

      if (!scheduleId) {
        return null;
      }

      const date =
        getString(rec, 'date') ??
        getString(nestedSchedule, 'date') ??
        getString(program, 'date') ??
        null;

      return {
        scheduleId,
        date,
        programName:
          getString(program, 'name') ??
          getString(rec, 'programName') ??
          getString(rec, 'title') ??
          'Program',
        scheduleTime: getString(program, 'scheduleTime') ?? getString(rec, 'scheduleTime') ?? null,
        requirementType:
          getString(program, 'requirementType') ?? getString(rec, 'requirementType') ?? null,
        minUploads: getNumber(program, 'minUploads') ?? getNumber(rec, 'minUploads') ?? null,
        sessionStatus:
          getString(session, 'status') ??
          getString(firstSession, 'status') ??
          getString(rec, 'status') ??
          null,
        raw: item,
      };
    })
    .filter((value): value is NormalizedSchedule => Boolean(value));
}

export function formatScheduleDate(value: string | null) {
  if (!value) {
    return '-';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return value;
}

export function sessionBadgeClass(status: string | null) {
  if (!status) {
    return 'border-border text-muted-foreground';
  }

  if (status === 'COMPLETED') {
    return 'border-emerald-500/50 text-emerald-400';
  }

  if (status === 'COMPLETED_WITH_ISSUE') {
    return 'border-amber-500/50 text-amber-400';
  }

  if (status === 'NOT_EXECUTED') {
    return 'border-red-500/50 text-red-400';
  }

  return 'border-blue-500/50 text-blue-400';
}

export function normalizeSessionDetail(input: unknown): NormalizedSessionDetail | null {
  const rec = asRecord(input);
  if (!rec) {
    return null;
  }

  const schedule = asRecord(rec.schedule);
  const program = asRecord(rec.program) ?? asRecord(schedule?.program);
  const division = asRecord(program?.division);
  const user = asRecord(rec.user);

  const sessionId = getString(rec, 'id');
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    status: getString(rec, 'status') ?? null,
    scheduleId: getString(rec, 'scheduleId') ?? getString(schedule, 'id') ?? null,
    requirementType: getString(program, 'requirementType') ?? null,
    minUploads: getNumber(program, 'minUploads') ?? null,
    programName: getString(program, 'name') ?? null,
    programDescription: getString(program, 'description') ?? null,
    divisionName: getString(division, 'name') ?? null,
    scheduleDate: getString(schedule, 'date') ?? null,
    scheduleTime: getString(program, 'scheduleTime') ?? null,
    userName: getString(user, 'name') ?? null,
    budgetAmount:
      getNumber(program, 'budgetAmount') ??
      getNumber(program, 'budget') ??
      getNumber(program, 'dana') ??
      getNumber(program, 'amount') ??
      null,
  };
}

export function normalizeEvidenceList(input: unknown[]): NormalizedEvidence[] {
  return input
    .map((item): NormalizedEvidence | null => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }

      const id = getString(rec, 'id');
      if (!id) {
        return null;
      }

      return {
        id,
        url: getString(rec, 'url'),
        label:
          getString(rec, 'filename') ??
          getString(rec, 'name') ??
          getString(rec, 'caption') ??
          id,
      };
    })
    .filter((item): item is NormalizedEvidence => Boolean(item));
}
