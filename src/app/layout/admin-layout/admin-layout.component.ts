import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-950 text-white">
      <aside class="w-52 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div class="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
          <div class="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-xs font-bold">超</div>
          <span class="font-bold text-sm text-white">运营后台</span>
        </div>
        <nav class="flex-1 py-3 px-2 space-y-0.5">
          <a routerLink="/platform" routerLinkActive="bg-purple-600/20 text-purple-400"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition text-sm">
            运营统计
          </a>
        </nav>
        <div class="p-3 border-t border-gray-800">
          <button (click)="auth.logout()"
            class="w-full text-left text-sm text-gray-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-800 transition">
            退出登录
          </button>
        </div>
      </aside>
      <main class="flex-1 overflow-auto"><router-outlet/></main>
    </div>
  `,
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
}
