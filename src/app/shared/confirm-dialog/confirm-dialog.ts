import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.scss'],
})
export class ConfirmDialog {
  @Input() open = false;
  @Input() title = 'Confirmation';
  @Input() message = '';
  @Input() cancelLabel = 'Annuler';
  @Input() confirmLabel = 'Confirmer';
  @Input() tone: 'default' | 'danger' | 'success' = 'default';
  @Input() showCancel = true;
  @Input() showConfirm = true;
  @Input() busy = false;
  @Input() error: string | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open || this.busy) return;
    this.cancel.emit();
  }
}
