import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Drone } from '../../shared/models/api.model';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DroneActions } from '../../store/drone/drone.actions';

@Component({
  selector: 'app-drones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './drones.component.html',
})
export class DronesComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private store = inject(Store);

  drones = signal<Drone[]>([]);
  total = signal(0);
  loading = signal(true);
  page = signal(1);
  showBindModal = signal(false);
  bindError = signal('');
  bindLoading = signal(false);
  unbindingId = signal<string | null>(null);

  bindForm = this.fb.group({
    name: ['', Validators.required],
    sn: ['', Validators.required],
    secret_key: ['', Validators.required],
    model: [''],
    compute_mode: ['cloud'],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>(`/drones?page=${this.page()}&size=20`).subscribe({
      next: res => {
        if (res.code === 200) {
          this.drones.set(res.data.list);
          this.total.set(res.data.total);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  bind() {
    if (this.bindForm.invalid) return;
    this.bindLoading.set(true);
    this.bindError.set('');
    this.http.post<any>('/drones', this.bindForm.value).subscribe({
      next: res => {
        if (res.code === 200) { this.showBindModal.set(false); this.load(); this.store.dispatch(DroneActions.reloadDrones()); }
        else this.bindError.set(res.message);
        this.bindLoading.set(false);
      },
      error: err => { this.bindError.set(err.bizMessage || '绑定失败'); this.bindLoading.set(false); },
    });
  }

  unbind(id: string) {
    if (!confirm('确认解绑该设备？')) return;

    const originalDrones = [...this.drones()];
    this.drones.update(drones => drones.filter(d => d.id !== id));
    this.unbindingId.set(id);

    this.http.delete<any>(`/drones/${id}`).subscribe({
      next: () => {
        this.total.update(t => t - 1);
        this.unbindingId.set(null);
      },
      error: () => {
        this.drones.set(originalDrones);
        this.unbindingId.set(null);
        alert('解绑失败，请重试');
      },
    });
  }

  goMonitor(id: string) { this.router.navigate(['/monitor', id]); }

  getStatusLabel(s: string) {
    return { online: '在线', offline: '离线', in_task: '任务中' }[s] || s;
  }
  getStatusClass(s: string) {
    return { online: 'text-cyan-400', offline: 'text-gray-500', in_task: 'text-green-400' }[s] || '';
  }
}
