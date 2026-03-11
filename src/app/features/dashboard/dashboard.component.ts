import {
  Component, OnInit, OnDestroy, AfterViewInit,
  inject, signal, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { Map2dUtilService } from '../../core/map/map2d-util.service';
import { MapService } from '../../core/map/map.service';
import { DroneMapMarker } from '../../core/models/map.model';
import { selectRecentAlerts, selectUnreadCount } from '../../store/alert/alert.selectors';
import { DroneActions } from '../../store/drone/drone.actions';
import { DashboardOverview } from '../../shared/models/api.model';
import Map from 'ol/Map';

import { Actions, ofType } from '@ngrx/effects';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private store = inject(Store);
  private router = inject(Router);
  private mapUtil = inject(Map2dUtilService);
  private mapService = inject(MapService);
  private actions$ = inject(Actions);
  private destroy$ = new Subject<void>();

  overview = signal<DashboardOverview | null>(null);
  drones = signal<DroneMapMarker[]>([]);
  loading = signal(true);

  recentAlerts$ = this.store.select(selectRecentAlerts);
  unreadCount$ = this.store.select(selectUnreadCount);

  readonly today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  private map!: Map;
  currentTheme = signal<'dark' | 'light'>('dark');

  ngOnInit() {
    this.loadData();
    this.actions$.pipe(
      ofType(DroneActions.reloadDrones),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadData());
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // 保留地图实例供 mapService 管理，不直接销毁
  }

  toggleMapTheme() {
    this.currentTheme.update(theme => theme === 'dark' ? 'light' : 'dark');
    this.mapUtil.setMapStyle(this.map, this.currentTheme());
  }

  loadData() {
    forkJoin({
      overview: this.http.get<any>('/dashboard/overview'),
      drones: this.http.get<any>('/dashboard/drones/map'),
    }).subscribe({
      next: ({ overview, drones }) => {
        if (overview.code === 200) this.overview.set(overview.data);
        if (drones.code === 200) {
          const list: DroneMapMarker[] = drones.data ?? [];
          this.drones.set(list);
          this.store.dispatch(DroneActions.setDrones({ drones: list }));

          if (this.map) {
            this.mapUtil.refreshDroneMarkers(this.map, list);
            if (list.length > 0) {
              this.mapUtil.locateToChina(this.map);
            }
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private initMap() {
    this.map = this.mapUtil.initMap(
      this.mapContainer.nativeElement,
      [116.397, 39.909],
      5,
    );

    // 注册到 MapService，其他组件可通过 mapService.getMapInstance 访问
    this.mapService.setMapInstance('/dashboard', this.map);

    // 设置初始底图样式
    this.mapUtil.setMapStyle(this.map, this.currentTheme());

    // 添加无人机标注，点击进入单机监控舱
    this.mapUtil.addDroneMarkers(this.map, this.drones(), (drone) => {
      this.router.navigate(['/monitor', drone.id]);
    });

    // WebSocket 实时更新无人机位置
    // DroneActions.updateLocation 已在 ws.service 中 dispatch，这里直接用 store 订阅
  }

  navigateToMonitor(droneId: string) {
    this.router.navigate(['/monitor', droneId]);
  }

  getAlertLevelClass(level: string): string {
    return level === 'critical' ? 'text-red-400'
         : level === 'warning'  ? 'text-yellow-400'
         : 'text-blue-400';
  }

  getAlertTypeName(type: string): string {
    const map: Record<string, string> = {
      illegal_parking: '违停告警',
      congestion: '拥堵告警',
      intrusion: '入侵告警',
      other: '其他告警',
    };
    return map[type] ?? type;
  }
}
