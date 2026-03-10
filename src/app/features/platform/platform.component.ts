import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-platform',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform.component.html',
})
export class PlatformComponent implements OnInit {
  private http = inject(HttpClient);
  stats = signal<any>(null);
  tenants = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.http.get<any>('/platform/stats').subscribe(res => { if (res.code === 200) this.stats.set(res.data); });
    this.http.get<any>('/platform/tenants?size=20').subscribe({
      next: res => { if (res.code === 200) this.tenants.set(res.data.list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  freeze(id: string) {
    const reason = prompt('冻结原因');
    if (!reason) return;
    this.http.post<any>(`/platform/tenants/${id}/freeze`, { reason }).subscribe(() => {
      this.tenants.update(list => list.map(t => t.id === id ? { ...t, status: 'frozen' } : t));
    });
  }

  unfreeze(id: string) {
    this.http.post<any>(`/platform/tenants/${id}/unfreeze`, {}).subscribe(() => {
      this.tenants.update(list => list.map(t => t.id === id ? { ...t, status: 'active' } : t));
    });
  }
}
