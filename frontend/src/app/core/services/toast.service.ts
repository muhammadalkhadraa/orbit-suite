import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AudioService } from './audio.service';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private audioService = inject(AudioService);
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  public show(type: ToastType, title: string, message?: string, duration = 4000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const toast: ToastMessage = { id, type, title, message, duration };

    if (this.audioService.isEnabled()) {
      if (type === 'success' || type === 'info') {
        this.audioService.playSuccessChime();
      } else if (type === 'warning') {
        this.audioService.playWarningChime();
      } else if (type === 'error') {
        this.audioService.playErrorChime();
      }
    }

    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  public success(title: string, message?: string, duration = 4000): void {
    this.show('success', title, message, duration);
  }

  public error(title: string, message?: string, duration = 5000): void {
    this.show('error', title, message, duration);
  }

  public info(title: string, message?: string, duration = 4000): void {
    this.show('info', title, message, duration);
  }

  public warning(title: string, message?: string, duration = 4500): void {
    this.show('warning', title, message, duration);
  }

  public remove(id: string): void {
    const updated = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(updated);
  }

  public clear(): void {
    this.toastsSubject.next([]);
  }
}
