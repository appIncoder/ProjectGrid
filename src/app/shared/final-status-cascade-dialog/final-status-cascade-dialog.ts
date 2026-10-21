import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { ActivityStatus } from '../../models';
import { FinalStatusGuardService } from '../../services/final-status-guard.service';

/** Popup globale (placée une fois dans app.html) pilotée par FinalStatusGuardService. */
@Component({
  selector: 'app-final-status-cascade-dialog',
  templateUrl: './final-status-cascade-dialog.html',
  styleUrls: ['./final-status-cascade-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class FinalStatusCascadeDialog {
  private readonly guard = inject(FinalStatusGuardService);

  readonly request = this.guard.request;
  readonly itemCountLabel = computed(() => {
    const count = this.request()?.openItems.length ?? 0;
    return count > 1 ? `${count} items` : `${count} item`;
  });

  cancel(): void {
    this.guard.resolve(false);
  }

  cascade(): void {
    this.guard.resolve(true);
  }

  onEscape(): void {
    if (this.request()) this.cancel();
  }

  statusTone(status: ActivityStatus): string {
    switch (status) {
      case 'inprogress': return 'inprogress';
      case 'onhold': return 'review';
      case 'done': return 'done';
      case 'notdone': return 'alert';
      default: return 'neutral';
    }
  }
}
