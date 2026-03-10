import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AIModel } from '../../shared/models/api.model';

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './models.component.html',
})
export class ModelsComponent implements OnInit {
  private http = inject(HttpClient);
  models = signal<AIModel[]>([]);
  loading = signal(true);
  compareJobLoading = signal(false);
  compareResult = signal<any>(null);
  selectedA = signal('');
  selectedB = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('/models?size=20').subscribe({
      next: res => { if (res.code === 200) this.models.set(res.data.list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startCompare() {
    if (!this.selectedA() || !this.selectedB()) return;
    this.compareJobLoading.set(true);
    this.http.post<any>('/models/compare', { model_a_id: this.selectedA(), model_b_id: this.selectedB() })
      .subscribe({
        next: res => { if (res.code === 200) this.compareResult.set(res.data); this.compareJobLoading.set(false); },
        error: () => this.compareJobLoading.set(false),
      });
  }

  getSceneLabel(s: string) {
    return { highway: '高速公路', intersection: '十字路口', night: '夜间', bad_weather: '恶劣天气', general: '通用' }[s] || s;
  }
}
