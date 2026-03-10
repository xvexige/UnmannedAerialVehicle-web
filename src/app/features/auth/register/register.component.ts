import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  success = signal(false);

  form = this.fb.group({
    tenant_name: ['', Validators.required],
    tenant_code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]{3,32}$/)]],
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    real_name: ['', Validators.required],
    phone: [''],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    this.http.post<any>('/auth/register', this.form.value).subscribe({
      next: (res) => {
        if (res.code === 200) {
          this.success.set(true);
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        } else {
          this.error.set(res.message);
        }
      },
      error: (err) => {
        this.error.set(err.bizMessage || '注册失败');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
