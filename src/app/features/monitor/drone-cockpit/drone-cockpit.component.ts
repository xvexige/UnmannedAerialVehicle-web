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
})
export class DroneCockpitComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('miniMapContainer') miniMapContainer!: ElementRef<HTMLDivElement>;

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
}
