import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-5">
      <h1 class="text-xl font-bold text-white">套餐商城</h1>
      <p class="text-gray-400 text-sm">选择适合您企业的服务套餐</p>
      <div class="grid grid-cols-3 gap-5">
        @for (plan of plans(); track plan.id) {
          <div class="bg-gray-900 border rounded-2xl p-6 flex flex-col"
            [class.border-cyan-500]="plan.id === 'plan_professional'"
            [class.border-gray-800]="plan.id !== 'plan_professional'"
            [class.ring-1]="plan.id === 'plan_professional'"
            [class.ring-cyan-500]="plan.id === 'plan_professional'">
            @if (plan.id === 'plan_professional') {
              <div class="text-center mb-4">
                <span class="px-3 py-1 bg-cyan-600 text-white text-xs rounded-full">推荐</span>
              </div>
            }
            <h3 class="text-white text-lg font-bold">{{ plan.name }}</h3>
            <div class="mt-2 mb-4">
              @if (plan.price_monthly > 0) {
                <span class="text-3xl font-bold text-white">¥{{ (plan.price_monthly / 100).toFixed(0) }}</span>
                <span class="text-gray-500 text-sm">/月</span>
              } @else {
                <span class="text-3xl font-bold text-cyan-400">商务定制</span>
              }
            </div>
            <p class="text-gray-400 text-sm mb-5">{{ plan.description }}</p>
            <ul class="space-y-2 flex-1 text-sm text-gray-300">
              <li class="flex gap-2"><span class="text-green-400">✓</span> 最多 {{ plan.max_drones === -1 ? '无限' : plan.max_drones }} 台无人机</li>
              <li class="flex gap-2"><span class="text-green-400">✓</span> 视频解析 {{ plan.video_hours_monthly === -1 ? '无限' : plan.video_hours_monthly + 'h' }}/月</li>
              <li class="flex gap-2"><span class="text-green-400">✓</span> 存储 {{ plan.storage_gb === -1 ? '无限' : plan.storage_gb + 'GB' }}</li>
              <li class="flex gap-2">
                <span [class.text-green-400]="plan.night_detection" [class.text-gray-600]="!plan.night_detection">{{ plan.night_detection ? '✓' : '✗' }}</span>
                夜间红外识别
              </li>
              <li class="flex gap-2">
                <span [class.text-green-400]="plan.edge_computing" [class.text-gray-600]="!plan.edge_computing">{{ plan.edge_computing ? '✓' : '✗' }}</span>
                边缘推理支持
              </li>
            </ul>
            <button class="mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition"
              [class.bg-cyan-600]="plan.id === 'plan_professional'"
              [class.hover:bg-cyan-500]="plan.id === 'plan_professional'"
              [class.text-white]="plan.id === 'plan_professional'"
              [class.bg-gray-800]="plan.id !== 'plan_professional'"
              [class.hover:bg-gray-700]="plan.id !== 'plan_professional'"
              [class.text-gray-300]="plan.id !== 'plan_professional'">
              {{ plan.price_monthly === 0 ? '联系商务' : '立即订阅' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class PlansComponent implements OnInit {
  private http = inject(HttpClient);
  plans = signal<any[]>([]);

  ngOnInit() {
    this.http.get<any>('/plans').subscribe(res => { if (res.code === 200) this.plans.set(res.data); });
  }
}
