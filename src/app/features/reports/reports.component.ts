import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Report } from '../../shared/models/api.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);

  reports = signal<Report[]>([]);
  total = signal(0);
  loading = signal(true);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>('/reports?page=1&size=20').subscribe({
      next: res => {
        if (res.code === 200) { this.reports.set(res.data.list); this.total.set(res.data.total); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
