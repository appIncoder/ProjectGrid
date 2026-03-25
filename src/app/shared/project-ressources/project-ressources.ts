import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { ProjectDataService } from '../../services/project-data.service';
import type { DayOffType, ProjectDetail, ProjectMember } from '../../models';

// ── Jours fériés français 2026 & 2027 ────────────────────────────────────────
const PUBLIC_HOLIDAYS = new Set<string>([
  // 2026
  '2026-01-01', // Jour de l'An
  '2026-04-06', // Lundi de Pâques
  '2026-05-01', // Fête du Travail
  '2026-05-08', // Victoire 1945
  '2026-05-14', // Ascension
  '2026-05-25', // Lundi de Pentecôte
  '2026-07-14', // Fête Nationale
  '2026-08-15', // Assomption
  '2026-11-01', // Toussaint
  '2026-11-11', // Armistice
  '2026-12-25', // Noël
  // 2027
  '2027-01-01', // Jour de l'An
  '2027-03-29', // Lundi de Pâques
  '2027-05-01', // Fête du Travail
  '2027-05-06', // Ascension
  '2027-05-08', // Victoire 1945
  '2027-05-17', // Lundi de Pentecôte
  '2027-07-14', // Fête Nationale
  '2027-08-15', // Assomption
  '2027-11-01', // Toussaint
  '2027-11-11', // Armistice
  '2027-12-25', // Noël
]);

// ── Interfaces ────────────────────────────────────────────────────────────────

interface WeekPopupState {
  memberId: string;
  weekDays: Date[];
  x: number;
  y: number;
}

interface MemberEditPopupState {
  memberId: string;
  x: number;
  y: number;
}

interface BulkPopupState {
  memberId: string;
  weekIndices: number[];
  x: number;
  y: number;
}

interface DragState {
  memberId: string;
  startIndex: number;
  currentIndex: number;
}

export const DAY_OFF_OPTIONS: { type: DayOffType | null; label: string; cssClass: string }[] = [
  { type: null,      label: 'Travaillé', cssClass: 'type-work'    },
  { type: 'holiday', label: 'Férié',     cssClass: 'type-holiday' },
  { type: 'sick',    label: 'Maladie',   cssClass: 'type-sick'    },
  { type: 'off',     label: 'Congé',     cssClass: 'type-off'     },
];

// ── Composant ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-project-ressources',
  imports: [],
  templateUrl: './project-ressources.html',
  styleUrl: './project-ressources.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectRessources {
  readonly project = input<ProjectDetail | null>(null);

  private readonly data       = inject(ProjectDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly members   = signal<ProjectMember[]>([]);
  readonly isLoading = signal(false);

  // ── Drag multi-select ──────────────────────────────────────────────────────
  /** Vrai dès que la souris s'est déplacée vers une autre cellule pendant le drag */
  private isDragging = false;
  readonly dragState = signal<DragState | null>(null);

  readonly selectedRange = computed<{ memberId: string; indices: Set<number> } | null>(() => {
    const drag = this.dragState();
    if (!drag) return null;
    const lo = Math.min(drag.startIndex, drag.currentIndex);
    const hi = Math.max(drag.startIndex, drag.currentIndex);
    return {
      memberId: drag.memberId,
      indices: new Set(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)),
    };
  });

  // ── Popups ────────────────────────────────────────────────────────────────
  readonly weekPopup       = signal<WeekPopupState | null>(null);
  readonly memberEditPopup = signal<MemberEditPopupState | null>(null);
  readonly bulkPopup       = signal<BulkPopupState | null>(null);

  readonly weekPopupMember = computed<ProjectMember | null>(() => {
    const p = this.weekPopup();
    return p ? (this.members().find((m) => m.userId === p.memberId) ?? null) : null;
  });

  readonly memberEditPopupMember = computed<ProjectMember | null>(() => {
    const p = this.memberEditPopup();
    return p ? (this.members().find((m) => m.userId === p.memberId) ?? null) : null;
  });

  readonly bulkPopupMember = computed<ProjectMember | null>(() => {
    const p = this.bulkPopup();
    return p ? (this.members().find((m) => m.userId === p.memberId) ?? null) : null;
  });

  /** Valeurs du formulaire d'édition membre */
  readonly editAvailability = signal<number>(100);
  readonly editDailyRate    = signal<number | null>(null);

  readonly dayOffOptions = DAY_OFF_OPTIONS;

  // ── Calendrier ────────────────────────────────────────────────────────────
  readonly projectStartDate = computed<Date>(() => {
    const p = this.project();
    if (p?.phaseDefinitions) {
      const dates = Object.values(p.phaseDefinitions)
        .map((def) => def.startDate)
        .filter(Boolean)
        .sort();
      if (dates.length) return new Date(dates[0]);
    }
    return new Date();
  });

  readonly weeks = computed<Date[]>(() => {
    const monday = this.getMondayOf(this.projectStartDate());
    return Array.from({ length: 52 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i * 7);
      return d;
    });
  });

  readonly yearSpans = computed<{ year: number; colspan: number }[]>(() => {
    const spans: { year: number; colspan: number }[] = [];
    for (const week of this.weeks()) {
      const year = week.getFullYear();
      const last = spans[spans.length - 1];
      if (last && last.year === year) {
        last.colspan++;
      } else {
        spans.push({ year, colspan: 1 });
      }
    }
    return spans;
  });

  constructor() {
    // Rechargement des membres à chaque changement de projet
    effect(() => {
      const p = this.project();
      if (p?.id) {
        this.loadMembers(p.id);
      } else {
        this.members.set([]);
      }
    });

    // Listener document pour détecter la fin du drag (mouseup hors composant)
    const onMouseUp = (e: MouseEvent) => this.onDocumentMouseUp(e);
    document.addEventListener('mouseup', onMouseUp);
    this.destroyRef.onDestroy(() => document.removeEventListener('mouseup', onMouseUp));
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  private async loadMembers(projectId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      this.members.set(await this.data.listProjectMembers(projectId));
    } catch {
      this.members.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Drag multi-select ─────────────────────────────────────────────────────

  onWeekCellMouseDown(member: ProjectMember, weekIndex: number): void {
    this.closeAllPopups();
    this.isDragging = false;
    this.dragState.set({ memberId: member.userId, startIndex: weekIndex, currentIndex: weekIndex });
  }

  onWeekCellMouseEnter(member: ProjectMember, weekIndex: number): void {
    const drag = this.dragState();
    if (!drag || drag.memberId !== member.userId) return;
    if (weekIndex !== drag.startIndex) this.isDragging = true;
    this.dragState.update((d) => d ? { ...d, currentIndex: weekIndex } : null);
  }

  private onDocumentMouseUp(event: MouseEvent): void {
    const range    = this.selectedRange();
    const wasDrag  = this.isDragging;
    this.isDragging = false;
    this.dragState.set(null);

    if (!range || !wasDrag || range.indices.size < 2) return;

    const sortedIndices = [...range.indices].sort((a, b) => a - b);
    this.bulkPopup.set({
      memberId: range.memberId,
      weekIndices: sortedIndices,
      x: event.clientX,
      y: event.clientY + 12,
    });
  }

  onWeekCellClick(event: MouseEvent, member: ProjectMember, week: Date): void {
    // Si la bulk popup vient d'apparaître (fin de drag ≥ 2 semaines), on ne rouvre pas la week popup
    if (this.bulkPopup()) return;
    this.openWeekPopup(event, member, week);
  }

  isInSelection(memberId: string, weekIndex: number): boolean {
    const range = this.selectedRange();
    return range?.memberId === memberId && range.indices.has(weekIndex);
  }

  // ── Popup bulk ────────────────────────────────────────────────────────────

  closeBulkPopup(): void {
    this.bulkPopup.set(null);
  }

  applyBulkClear(popup: BulkPopupState): void {
    // Tous les jours ouvrables (non fériés) des semaines sélectionnées → 'off'
    this.members.update((list) =>
      list.map((m) => {
        if (m.userId !== popup.memberId) return m;
        const dayOffs = { ...(m.dayOffs ?? {}) };
        for (const idx of popup.weekIndices) {
          for (const day of this.getWeekDays(this.weeks()[idx])) {
            const key = this.toDateKey(day);
            if (!PUBLIC_HOLIDAYS.has(key)) dayOffs[key] = 'off';
          }
        }
        return { ...m, dayOffs };
      })
    );
    this.saveMembers();
    this.bulkPopup.set(null);
  }

  applyBulkSet(popup: BulkPopupState): void {
    // Tous les jours ouvrables (non fériés) des semaines sélectionnées → travaillé
    this.members.update((list) =>
      list.map((m) => {
        if (m.userId !== popup.memberId) return m;
        const dayOffs = { ...(m.dayOffs ?? {}) };
        for (const idx of popup.weekIndices) {
          for (const day of this.getWeekDays(this.weeks()[idx])) {
            const key = this.toDateKey(day);
            if (!PUBLIC_HOLIDAYS.has(key)) delete dayOffs[key];
          }
        }
        return { ...m, dayOffs };
      })
    );
    this.saveMembers();
    this.bulkPopup.set(null);
  }

  // ── Popup semaine ─────────────────────────────────────────────────────────

  openWeekPopup(event: MouseEvent, member: ProjectMember, week: Date): void {
    event.stopPropagation();
    this.memberEditPopup.set(null);
    this.bulkPopup.set(null);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.weekPopup.set({ memberId: member.userId, weekDays: this.getWeekDays(week), x: rect.left, y: rect.bottom + 6 });
  }

  closeWeekPopup(): void {
    this.weekPopup.set(null);
  }

  // ── Popup édition membre ───────────────────────────────────────────────────

  openMemberEditPopup(event: MouseEvent, member: ProjectMember): void {
    event.stopPropagation();
    this.weekPopup.set(null);
    this.bulkPopup.set(null);
    this.editAvailability.set(member.availability ?? 100);
    this.editDailyRate.set(member.dailyRate ?? null);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.memberEditPopup.set({ memberId: member.userId, x: rect.left, y: rect.bottom + 6 });
  }

  closeMemberEditPopup(): void {
    this.memberEditPopup.set(null);
  }

  onAvailabilityInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.editAvailability.set(Math.min(100, Math.max(0, isNaN(val) ? 0 : val)));
  }

  onDailyRateInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const val = parseFloat(raw);
    this.editDailyRate.set(raw === '' || isNaN(val) ? null : val);
  }

  saveMemberEdit(): void {
    const popup = this.memberEditPopup();
    if (!popup) return;
    this.members.update((list) =>
      list.map((m) => {
        if (m.userId !== popup.memberId) return m;
        const updated: ProjectMember = { ...m, availability: this.editAvailability() };
        const rate = this.editDailyRate();
        if (rate != null) updated.dailyRate = rate;
        else delete updated.dailyRate;
        return updated;
      })
    );
    this.saveMembers();
    this.closeMemberEditPopup();
  }

  // ── Jours off ────────────────────────────────────────────────────────────

  getDayOff(member: ProjectMember, day: Date): DayOffType | null {
    const key = this.toDateKey(day);
    // Priorité : saisie utilisateur, puis jour férié officiel
    if (member.dayOffs?.[key] != null) return member.dayOffs[key];
    if (PUBLIC_HOLIDAYS.has(key)) return 'holiday';
    return null;
  }

  setDayOff(member: ProjectMember, day: Date, type: DayOffType | null): void {
    const key = this.toDateKey(day);
    // Ne pas écraser un jour férié officiel avec null → on le retire simplement de dayOffs
    this.members.update((list) =>
      list.map((m) => {
        if (m.userId !== member.userId) return m;
        const dayOffs = { ...(m.dayOffs ?? {}) };
        if (type == null) {
          delete dayOffs[key];
        } else {
          dayOffs[key] = type;
        }
        return { ...m, dayOffs };
      })
    );
    this.saveMembers();
  }

  // ── Calculs cellule ───────────────────────────────────────────────────────

  getWorkingDays(member: ProjectMember, week: Date): number {
    return this.getWeekDays(week).filter((d) => this.getDayOff(member, d) == null).length;
  }

  hasAnyDayOff(member: ProjectMember, week: Date): boolean {
    return this.getWeekDays(week).some((d) => this.getDayOff(member, d) != null);
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────

  private async saveMembers(): Promise<void> {
    const projectId = this.project()?.id;
    if (!projectId) return;
    try {
      await this.data.setProjectMembers(projectId, this.members());
    } catch {
      // silent fail
    }
  }

  // ── Utilitaires ──────────────────────────────────────────────────────────

  private closeAllPopups(): void {
    this.weekPopup.set(null);
    this.memberEditPopup.set(null);
    this.bulkPopup.set(null);
  }

  private getWeekDays(monday: Date): Date[] {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  private getMondayOf(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private toDateKey(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  }

  formatWeekHeader(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }

  formatDayLabel(date: Date): string {
    const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${labels[date.getDay()]} ${dd}/${mm}`;
  }

  isPublicHoliday(date: Date): boolean {
    return PUBLIC_HOLIDAYS.has(this.toDateKey(date));
  }

  getAvailability(member: ProjectMember): number {
    return member.availability ?? 100;
  }

  getDailyRate(member: ProjectMember): string {
    return member.dailyRate != null ? member.dailyRate.toLocaleString('fr-FR') : '–';
  }
}
