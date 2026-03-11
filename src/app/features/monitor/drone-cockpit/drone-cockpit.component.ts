import {
  Component, OnInit, OnDestroy, inject, signal,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { WsService } from '../../../core/websocket/ws.service';
import { Map2dUtilService } from '../../../core/map/map2d-util.service';
import { MapService } from '../../../core/map/map.service';
import { DroneMapMarker } from '../../../core/models/map.model';
import Map from 'ol/Map';
import Hls from 'hls.js';

interface Detection {
  class: string; confidence: number;
  x: number; y: number; width: number; height: number;
}

@Component({
  selector: 'app-drone-cockpit',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './drone-cockpit.component.html',
  styles: [
    `
      .pie-slice {
        transform-origin: 80px 80px;
      }
      .pie-slice-hover {
        transform: scale(1.08);
        filter: brightness(1.2);
      }
      .bar-item .bar-fill {
        transform-origin: left center;
      }
      .bar-item:hover .bar-fill {
        box-shadow: 0 -1px 0 rgba(255,255,255,0.15), 2px 2px 10px rgba(6,182,212,0.4);
      }
    `,
  ],
})
export class DroneCockpitComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('miniMapContainer') miniMapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('uploadFileInput') uploadFileInput!: ElementRef<HTMLInputElement>;

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private ws = inject(WsService);
  private mapUtil = inject(Map2dUtilService);
  private mapService = inject(MapService);
  private destroy$ = new Subject<void>();

  private miniMap!: Map;
  currentTheme = signal<'dark' | 'light'>('dark');

  droneId = signal('');
  drone = signal<any>(null);
  telemetry = signal<any>(null);
  streamInfo = signal<any>(null);
  detections = signal<Detection[]>([]);
  showAI = signal(true);
  leftPanelOpen = signal(true);
  rightPanelOpen = signal(true);
  videoLoading = signal(true);
  recentEvents = signal<any[]>([]);

  /** 本机上传识别：是否正在上传 */
  uploadDetecting = signal(false);
  /** 上传识别结果：标注图 base64 */
  annotatedImageBase64 = signal<string | null>(null);
  /** 上传识别得到的检测列表（用于右侧图表） */
  uploadDetections = signal<Detection[]>([]);
  /** 右侧统计图类型：bar | pie */
  chartType = signal<'bar' | 'pie'>('bar');
  /** 饼图当前悬停的类别（用于高亮对应扇形与图例） */
  hoveredPieSlice = signal<string | null>(null);
  /** 上传识别错误信息 */
  uploadError = signal<string | null>(null);

  private hls: Hls | null = null;
  private animFrame: number | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('droneId') || '';
    this.droneId.set(id);
    this.loadDroneData(id);
    this.subscribeRealtime(id);
  }

  ngAfterViewInit() {
    if (this.streamInfo()) this.initVideoPlayer();
    this.initMiniMap();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.hls?.destroy();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.miniMap) {
      this.mapService.removeMapInstance(`/monitor/${this.droneId()}`);
      this.mapUtil.destroyMap(this.miniMap);
    }
  }

  toggleMapTheme() {
    this.currentTheme.update(theme => theme === 'dark' ? 'light' : 'dark');
    this.mapUtil.setMapStyle(this.miniMap, this.currentTheme());
  }

  loadDroneData(id: string) {
    this.http.get<any>(`/drones/${id}`).subscribe(res => {
      if (res.code === 200) this.drone.set(res.data);
    });
    this.http.get<any>(`/monitor/${id}/stream-info`).subscribe(res => {
      if (res.code === 200) {
        this.streamInfo.set(res.data);
        setTimeout(() => this.initVideoPlayer(), 100);
      }
    });
    this.http.get<any>(`/monitor/${id}/telemetry/latest`).subscribe(res => {
      if (res.code === 200) this.telemetry.set(res.data);
    });
  }

  private initMiniMap() {
    if (!this.miniMapContainer) return;
    this.miniMap = this.mapUtil.initMap(this.miniMapContainer.nativeElement, [116.397, 39.909], 12);
    this.mapUtil.setMapStyle(this.miniMap, this.currentTheme());
    this.mapService.setMapInstance(`/monitor/${this.droneId()}`, this.miniMap);
  }

  subscribeRealtime(id: string) {
    this.ws.subscribeTelemetry(id).pipe(takeUntil(this.destroy$)).subscribe(msg => {
      this.telemetry.set(msg);
      // 实时更新小地图上的无人机位置
      if (this.miniMap && msg['longitude'] && msg['latitude']) {
        const drone = this.drone();
        const marker: DroneMapMarker = {
          id, name: drone?.name ?? id,
          longitude: msg['longitude'], latitude: msg['latitude'],
          status: drone?.status ?? 'online', battery_level: msg['battery_level'],
        };
        const existing = this.miniMap.get('droneLayer');
        if (existing) {
          this.mapUtil.updateDroneMarker(this.miniMap, marker);
        } else {
          this.mapUtil.addDroneMarkers(this.miniMap, [marker]);
        }
        this.mapUtil.locateTo(this.miniMap, [msg['longitude'], msg['latitude']], 14);
      }
    });
    this.ws.subscribeDetections(id).pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (msg['detections']) {
        this.detections.set(msg['detections']);
        this.drawDetections();
        if (msg['detections'].length > 0) {
          this.addEvent(msg);
        }
      }
    });
  }

  initVideoPlayer() {
    const info = this.streamInfo();
    if (!info?.hls_url || !this.videoEl) return;

    this.videoLoading.set(true);
    const video = this.videoEl.nativeElement;

    if (Hls.isSupported()) {
      this.hls = new Hls({ liveSyncDuration: 2, liveMaxLatencyDuration: 5 });
      this.hls.loadSource(info.hls_url);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
        this.videoLoading.set(false);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = info.hls_url;
      video.play();
      this.videoLoading.set(false);
    }
  }

  drawDetections() {
    if (!this.showAI() || !this.canvasEl || !this.videoEl) return;
    const canvas = this.canvasEl.nativeElement;
    const video = this.videoEl.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colorMap: Record<string, string> = {
      car: '#00d4ff', truck: '#ff6b35', bus: '#ffd23f',
      pedestrian: '#06ffa5', motorcycle: '#c77dff',
    };

    this.detections().forEach(det => {
      const color = colorMap[det.class.toLowerCase()] || '#ffffff';
      const x = det.x * canvas.width;
      const y = det.y * canvas.height;
      const w = det.width * canvas.width;
      const h = det.height * canvas.height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(x, y - 18, label.length * 7 + 8, 18);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(label, x + 4, y - 4);
    });
  }

  addEvent(msg: any) {
    const classes = (msg.detections as Detection[]).map(d => d.class);
    const counts: Record<string, number> = {};
    classes.forEach(c => counts[c] = (counts[c] || 0) + 1);
    const desc = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join('，');
    const events = [
      { time: new Date().toLocaleTimeString(), desc, snapshot: null },
      ...this.recentEvents()
    ].slice(0, 20);
    this.recentEvents.set(events);
  }

  getSignalBars(strength: number | null): number {
    if (!strength) return 0;
    if (strength > -50) return 4;
    if (strength > -70) return 3;
    if (strength > -85) return 2;
    return 1;
  }

  getBatteryClass(level: number | null): string {
    if (!level) return 'bg-gray-500';
    if (level > 50) return 'bg-green-500';
    if (level > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getDetectionSummary(): { class: string; count: number }[] {
    const counts: Record<string, number> = {};
    this.detections().forEach(d => {
      counts[d.class] = (counts[d.class] || 0) + 1;
    });
    return Object.entries(counts).map(([cls, count]) => ({ class: cls, count }));
  }

  getClassName(cls: string): string {
    const map: Record<string, string> = {
      car: '轿车', truck: '货车', bus: '公交', pedestrian: '行人', motorcycle: '摩托'
    };
    return map[cls] || cls;
  }

  requestFullscreen(): void {
    this.videoEl?.nativeElement?.requestFullscreen?.();
  }

  /** 是否正在显示上传识别结果（中央显示标注图） */
  hasUploadResult(): boolean {
    return this.annotatedImageBase64() != null;
  }

  /** 打开本机图片/视频选择器进行识别 */
  openUploadPicker(): void {
    this.uploadError.set(null);
    this.uploadFileInput?.nativeElement?.click();
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadDetecting.set(true);
    this.uploadError.set(null);
    this.annotatedImageBase64.set(null);
    this.uploadDetections.set([]);

    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<{ code: number; message?: string; data?: { detections: Detection[]; image_base64?: string } }>(
        '/ai/detect',
        formData
      )
      .subscribe({
        next: (res) => {
          if (res.code === 200 && res.data) {
            this.uploadDetections.set(res.data.detections ?? []);
            this.annotatedImageBase64.set(res.data.image_base64 ?? null);
          } else {
            this.uploadError.set(res.message ?? '识别失败');
          }
          this.uploadDetecting.set(false);
        },
        error: (err) => {
          this.uploadError.set(err.error?.message ?? err.message ?? '请求失败');
          this.uploadDetecting.set(false);
        },
      });
    input.value = '';
  }

  /** 关闭标注图，返回实时画面 */
  clearUploadResult(): void {
    this.annotatedImageBase64.set(null);
    this.uploadDetections.set([]);
    this.uploadError.set(null);
  }

  /** 上传识别结果按类别汇总（用于右侧图表） */
  getUploadSummary(): { class: string; count: number }[] {
    const counts: Record<string, number> = {};
    this.uploadDetections().forEach((d) => {
      counts[d.class] = (counts[d.class] ?? 0) + 1;
    });
    return Object.entries(counts).map(([cls, count]) => ({ class: cls, count }));
  }

  /** 上传识别汇总中的最大 count（柱状图比例用） */
  getUploadSummaryMaxCount(): number {
    const s = this.getUploadSummary();
    return s.length ? Math.max(...s.map((i) => i.count)) : 0;
  }

  /** 饼图 conic-gradient 所需：每段占比与颜色 */
  getPieSegments(): { class: string; count: number; startPct: number; endPct: number; color: string }[] {
    const summary = this.getUploadSummary();
    const total = summary.reduce((s, i) => s + i.count, 0);
    if (total === 0) return [];
    const colors: Record<string, string> = {
      car: '#00d4ff',
      truck: '#ff6b35',
      bus: '#ffd23f',
      pedestrian: '#06ffa5',
      motorcycle: '#c77dff',
    };
    let acc = 0;
    return summary.map((s) => {
      const startPct = (acc / total) * 100;
      acc += s.count;
      const endPct = (acc / total) * 100;
      return {
        ...s,
        startPct,
        endPct,
        color: colors[s.class.toLowerCase()] ?? '#94a3b8',
      };
    });
  }

  /** 饼图 SVG 每段 path d（圆心 80,80 半径 72，从顶部顺时针） */
  getPieSegmentPath(seg: { startPct: number; endPct: number }): string {
    const cx = 80;
    const cy = 80;
    const r = 72;
    const startAngle = (seg.startPct / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (seg.endPct / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  /** 饼图每段 3D 渐变 id（避免重复） */
  pieGradientId(seg: { class: string }): string {
    return 'pie-grad-' + seg.class.replace(/\s/g, '_');
  }

  /** 柱状图/饼图类别对应颜色 */
  getChartColor(cls: string): string {
    const colors: Record<string, string> = {
      car: '#06b6d4',
      truck: '#f97316',
      bus: '#eab308',
      pedestrian: '#22c55e',
      motorcycle: '#a855f7',
    };
    return colors[cls.toLowerCase()] ?? '#64748b';
  }

  toggleChartType(): void {
    this.chartType.update((t) => (t === 'bar' ? 'pie' : 'bar'));
  }
}
