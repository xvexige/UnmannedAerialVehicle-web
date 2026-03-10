import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Alert } from '../../shared/models/api.model';
import { Store } from '@ngrx/store';
import { AlertActions } from '../../store/alert/alert.actions';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerts.component.html',
})
export class AlertsComponent implements OnInit {
  private http = inject(HttpClient);
  private store = inject(Store);

  alerts = signal<Alert[]>([]);
  total = signal(0);
  loading = signal(true);
  page = signal(1);
  filterStatus = signal('');
  filterLevel = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params = new URLSearchParams({ page: String(this.page()), size: '20' });
    if (this.filterStatus()) params.set('status', this.filterStatus());
    if (this.filterLevel()) params.set('level', this.filterLevel());

    this.http.get<any>(`/alerts?${params}`).subscribe({
      next: res => {
        if (res.code === 200) { this.alerts.set(res.data.list); this.total.set(res.data.total); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http.get<any>('/alerts/count/unread').subscribe(res => {
      if (res.code === 200) {
        this.store.dispatch(AlertActions.setUnreadCount({ count: res.data.count }));
      }
    });
  }

  resolve(id: string) {
    this.http.patch<any>(`/alerts/${id}/resolve`, { remark: '已处理' }).subscribe(() => this.load());
  }

  getLevelClass(level: string) {
    return { critical: 'text-red-400 bg-red-900/20 border-red-800', warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-800', info: 'text-blue-400 bg-blue-900/20 border-blue-800' }[level] || '';
  }
  getTypeLabel(type: string) {
    return { illegal_parking: '违停', congestion: '拥堵', intrusion: '入侵', other: '其他' }[type] || type;
  }
  getStatusLabel(s: string) {
    return { unread: '未读', read: '已读', resolved: '已处理' }[s] || s;
  }
}
