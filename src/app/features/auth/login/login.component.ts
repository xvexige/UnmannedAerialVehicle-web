import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { WsService } from '../../../core/websocket/ws.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ws = inject(WsService);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    tenant_code: [''],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { username, password, tenant_code } = this.form.value;
    this.auth.login(username!, password!, tenant_code || undefined).subscribe({
      next: (res) => {
        if (res.code === 200) {
          this.ws.connect();
          const user = this.auth.getCurrentUser();
          if (user?.role === 'super_admin') {
            this.router.navigate(['/platform']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) => {
        this.error.set(err.bizMessage || '登录失败，请检查账号密码');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
