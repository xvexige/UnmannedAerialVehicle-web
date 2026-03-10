import { Injectable, inject } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, filter, retry, delay, Subject, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AlertActions } from '../../store/alert/alert.actions';
import { DroneActions } from '../../store/drone/drone.actions';

export interface WsMessage {
  channel: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WsService {
  private socket$: WebSocketSubject<WsMessage> | null = null;
  private store = inject(Store);
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();

  connect(): void {
    if (this.socket$) return;
    const token = this.auth.getToken();
    if (!token) return;

    this.socket$ = webSocket<WsMessage>({
      url: `${environment.wsUrl}?token=${token}`,
      openObserver: {
        next: () => {
          console.log('WebSocket 已连接');
          this.startHeartbeat();
        },
      },
      closeObserver: {
        next: () => console.log('WebSocket 已断开'),
      },
    });

    this.socket$.pipe(
      retry({ count: 10, delay: (_err, count) => of(null).pipe(delay(Math.min(count * 1000, 30000))) })
    ).subscribe({
      next: (msg) => this.dispatch(msg),
      error: (err) => console.error('WebSocket 错误', err),
    });
  }

  disconnect(): void {
    this.destroy$.next();
    this.socket$?.complete();
    this.socket$ = null;
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.socket$?.next({ channel: 'ping', action: 'ping' });
    }, 30000);
  }

  private dispatch(msg: WsMessage): void {
    switch (msg.channel) {
      case 'alerts':
        this.store.dispatch(AlertActions.newAlert({ alert: msg as any }));
        break;
      case 'telemetry':
        this.store.dispatch(DroneActions.updateLocation({ telemetry: msg as any }));
        break;
    }
  }

  subscribeTelemetry(droneId: string): Observable<WsMessage> {
    return this.socket$!.pipe(
      filter((msg) => msg.channel === 'telemetry' && msg['drone_id'] === droneId)
    );
  }

  subscribeAlerts(): Observable<WsMessage> {
    return this.socket$!.pipe(
      filter((msg) => msg.channel === 'alerts')
    );
  }

  subscribeDetections(droneId: string): Observable<WsMessage> {
    return this.socket$!.pipe(
      filter((msg) => msg.channel === 'detections' && msg['drone_id'] === droneId)
    );
  }
}
