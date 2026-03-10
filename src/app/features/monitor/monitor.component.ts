import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-xl font-bold text-white mb-2">实时监控</h1>
      <p class="text-gray-400 text-sm mb-6">请在全局大屏点击无人机图标进入单机监控舱，或直接输入设备ID</p>
      <a routerLink="/dashboard" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition">
        前往全局大屏
      </a>
    </div>
  `,
})
export class MonitorComponent {}
