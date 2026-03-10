import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center">
      <div class="text-center">
        <div class="text-8xl font-bold text-cyan-500 mb-4">403</div>
        <h2 class="text-2xl text-white font-semibold mb-2">无权限访问</h2>
        <p class="text-gray-400 mb-8">您没有访问该页面的权限，请联系管理员</p>
        <a routerLink="/dashboard"
          class="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition">
          返回首页
        </a>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {}
