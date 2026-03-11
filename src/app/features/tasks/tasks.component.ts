import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Task } from '../../shared/models/api.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  tasks = signal<Task[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = computed(() => Math.ceil(this.total() / 10));
  loading = signal(true);
  showCreateModal = signal(false);
  createLoading = signal(false);
  createError = signal('');
  drones = signal<any[]>([]);
  users = signal<any[]>([]);

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    drone_id: ['', Validators.required],
    assignee_id: ['', Validators.required],
    scheduled_at: ['', Validators.required],
    remark: [''],
  });

  ngOnInit() {
    this.load();
    this.http.get<any>('/drones?size=100').subscribe(r => { if (r.code === 200) this.drones.set(r.data.list); });
    this.http.get<any>('/users?size=100').subscribe(r => { if (r.code === 200) this.users.set(r.data.list); });
  }

  load() {
    this.loading.set(true);
    this.http.get<any>(`/tasks?page=${this.page()}&size=10`).subscribe({
      next: res => {
        if (res.code === 200) {
          this.tasks.set(res.data.list);
          this.total.set(res.data.total);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePage(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page.set(newPage);
    this.load();
  }

  create() {
    if (this.form.invalid) return;
    this.createLoading.set(true);
    this.http.post<any>('/tasks', this.form.value).subscribe({
      next: res => {
        if (res.code === 200) { this.showCreateModal.set(false); this.load(); }
        else this.createError.set(res.message);
        this.createLoading.set(false);
      },
      error: err => { this.createError.set(err.bizMessage || '创建失败'); this.createLoading.set(false); },
    });
  }

  updateStatus(id: string, status: string) {
    this.http.patch<any>(`/tasks/${id}/status`, { status }).subscribe(() => this.load());
  }

  getStatusLabel(s: string) {
    return { pending: '待开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s;
  }
  getStatusClass(s: string) {
    return {
      pending: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
      in_progress: 'text-green-400 bg-green-900/20 border-green-800',
      completed: 'text-gray-400 bg-gray-800 border-gray-700',
      cancelled: 'text-red-400 bg-red-900/20 border-red-800',
    }[s] || '';
  }
}
