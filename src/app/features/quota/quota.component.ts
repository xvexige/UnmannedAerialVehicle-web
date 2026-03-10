import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-quota',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-5">
      <h1 class="text-xl font-bold text-white">额度管理</h1>
      @if (quota(); as q) {
        <div class="grid grid-cols-3 gap-4">
          @for (item of quotaItems(); track item.label) {
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div class="flex justify-between items-start mb-3">
                <span class="text-gray-400 text-sm">{{ item.label }}</span>
                <span class="text-white text-sm font-mono">{{ item.used }} / {{ item.total === -1 ? '∞' : item.total }}</span>
              </div>
              <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  [class.bg-green-500]="item.percent < 60"
                  [class.bg-yellow-500]="item.percent >= 60 && item.percent < 80"
                  [class.bg-red-500]="item.percent >= 80"
                  [style.width.%]="item.total === -1 ? 0 : item.percent">
                </div>
              </div>
              <div class="text-right text-xs mt-1"
                [class.text-green-400]="item.percent < 60"
                [class.text-yellow-400]="item.percent >= 60 && item.percent < 80"
                [class.text-red-400]="item.percent >= 80">
                {{ item.total === -1 ? '无限额度' : item.percent + '%' }}
              </div>
            </div>
          }
        </div>
        <p class="text-gray-500 text-sm">账期：{{ q.billing_cycle_start }} ~ {{ q.billing_cycle_end }}</p>
      } @else if (!loading()) {
        <div class="text-gray-500 text-center py-12">暂无额度记录</div>
      }
    </div>
  `,
})
export class QuotaComponent implements OnInit {
  private http = inject(HttpClient);
  quota = signal<any>(null);
  loading = signal(true);

  ngOnInit() {
    this.http.get<any>('/quota/current').subscribe({
      next: res => { if (res.code === 200) this.quota.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  quotaItems() {
    const q = this.quota();
    if (!q) return [];
    return [
      { label: '视频解析时长 (小时)', used: q.video_hours_used, total: q.video_hours_total, percent: q.video_hours_percent },
      { label: '存储空间 (GB)', used: q.storage_gb_used, total: q.storage_gb_total, percent: q.storage_gb_percent },
      { label: 'API 调用次数', used: q.api_calls_used, total: q.api_calls_total, percent: q.api_calls_percent },
    ];
  }
}
