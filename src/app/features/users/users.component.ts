import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  users = signal<any[]>([]);
  total = signal(0);
  loading = signal(true);
  showCreateModal = signal(false);
  showInviteModal = signal(false);
  inviteCode = signal('');
  createLoading = signal(false);
  createError = signal('');

  form = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    real_name: ['', Validators.required],
    role: ['pilot', Validators.required],
    phone: [''],
  });

  inviteForm = this.fb.group({ role: ['pilot'], expire_hours: [72] });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>('/users?page=1&size=50').subscribe({
      next: res => {
        if (res.code === 200) { this.users.set(res.data.list); this.total.set(res.data.total); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create() {
    if (this.form.invalid) return;
    this.createLoading.set(true);
    this.http.post<any>('/users', this.form.value).subscribe({
      next: res => {
        if (res.code === 200) { this.showCreateModal.set(false); this.load(); }
        else this.createError.set(res.message);
        this.createLoading.set(false);
      },
      error: err => { this.createError.set(err.bizMessage || '创建失败'); this.createLoading.set(false); },
    });
  }

  generateInvite() {
    this.http.post<any>('/users/invite-codes', this.inviteForm.value).subscribe(res => {
      if (res.code === 200) this.inviteCode.set(res.data.code);
    });
  }

  getRoleLabel(r: string) {
    return { enterprise_admin: '管理员', pilot: '飞手', analyst: '数据员' }[r] || r;
  }
  getRoleClass(r: string) {
    return { enterprise_admin: 'text-purple-400 bg-purple-900/20', pilot: 'text-cyan-400 bg-cyan-900/20', analyst: 'text-green-400 bg-green-900/20' }[r] || '';
  }
}
