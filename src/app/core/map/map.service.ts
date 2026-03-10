import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MapType } from '../models/map.model';

@Injectable({ providedIn: 'root' })
export class MapService {
  private router = inject(Router);

  // ─── 地图实例注册表 ────────────────────────────────────────────────────────────
  private mapInstances = signal<globalThis.Map<string, any>>(new globalThis.Map());

  // ─── 路由信号 ──────────────────────────────────────────────────────────────────
  readonly defaultRoute = '/dashboard';
  currentRoute = signal<string>(this.defaultRoute);

  // 匹配 /dashboard（全局驾驶舱）
  private regGlobal = /^\/?dashboard$/;
  // 匹配 /monitor/:droneId（单机监控舱）
  private regDroneDetail = /^\/?monitor\/([^/]+)$/;

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.isMapRoute(e.urlAfterRedirects ?? e.url)) {
          this.currentRoute.set(e.urlAfterRedirects ?? e.url);
        }
      });
  }

  // ─── 实例管理 ──────────────────────────────────────────────────────────────────

  setMapInstance(key: string, instance: any) {
    this.mapInstances().set(key, instance);
  }

  getMapInstance(key: string): any {
    return this.mapInstances().get(key);
  }

  removeMapInstance(key: string) {
    this.mapInstances().delete(key);
  }

  get currentMapInstance(): any {
    const key = this.currentMapKey();
    return key ? this.mapInstances().get(key) : null;
  }

  // ─── 计算属性 ──────────────────────────────────────────────────────────────────

  /** 当前地图类型 */
  currentMapType = computed<MapType | null>(() => {
    const url = this.currentRoute();
    if (this.regGlobal.test(url)) return MapType.Global;
    if (this.regDroneDetail.test(url)) return MapType.DroneDetail;
    return null;
  });

  /** 当前地图的注册 key */
  currentMapKey = computed<string | null>(() => {
    const url = this.currentRoute();
    if (this.regGlobal.test(url)) return this.defaultRoute;
    if (this.regDroneDetail.test(url)) return url;
    return null;
  });

  /** 当前正在监控的无人机 ID（仅 DroneDetail 有值） */
  currentDroneId = computed<string | null>(() => {
    const url = this.currentRoute();
    const match = url.match(this.regDroneDetail);
    return match ? match[1] : null;
  });

  // ─── 工具方法 ──────────────────────────────────────────────────────────────────

  /** 是否是带地图的路由 */
  isMapRoute(route: string): boolean {
    return this.regGlobal.test(route) || this.regDroneDetail.test(route);
  }

  /** 清理所有实例（登出时调用） */
  clear() {
    this.mapInstances.set(new globalThis.Map());
    this.currentRoute.set(this.defaultRoute);
  }
}
