import { Injectable, ElementRef } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Overlay from 'ol/Overlay';
import * as olProj from 'ol/proj';
import { defaults as defaultControls } from 'ol/control/defaults';

import mapUrlsConfig from '../config/map-urls.config';
import { DroneMapMarker } from '../models/map.model';

@Injectable({ providedIn: 'root' })
export class Map2dUtilService {
  private lastPointermoveFeature: any;

  // 无人机图标样式缓存
  private droneStyleCache: Record<string, Style> = {};

  // 无人机状态对应颜色
  private readonly STATUS_COLORS: Record<string, string> = {
    online: '#06b6d4',    // 青色
    in_task: '#10b981',   // 绿色（执行任务中）
    offline: '#6b7280',   // 灰色
  };

  // ─── 地图初始化 ──────────────────────────────────────────────────────────────

  /**
   * 初始化 OpenLayers 地图实例
   * @param id 目标 DOM 元素的 id 或 HTMLElement
   * @param coordinate 初始中心经纬度 [lng, lat]（WGS84）
   * @param zoom 初始缩放级别
   */
  initMap(id: string | HTMLElement, coordinate?: [number, number], zoom?: number): Map {
    const center = coordinate
      ? olProj.fromLonLat(coordinate)
      : olProj.fromLonLat([116.397, 39.909]); // 默认北京

    const map = new Map({
      target: id,
      layers: [],
      view: new View({
        center,
        zoom: zoom ?? 5,
        constrainResolution: true,
        smoothResolutionConstraint: false,
      }),
      controls: defaultControls({ rotate: false, zoom: false }),
    });

    return map;
  }

  /**
   * 销毁 OpenLayers 地图实例，释放内存
   */
  destroyMap(mapInstance: Map) {
    if (!mapInstance) return;
    (mapInstance as any).setTarget(null);
    mapInstance.getOverlays().clear();
    mapInstance.getLayers().clear();
    mapInstance.dispose();
  }

  // ─── 底图图层 ─────────────────────────────────────────────────────────────────

  /**
   * 添加天地图图层
   * @param type 'raster' 影像底图 | 'vector' 矢量底图
   * @param dark 是否应用暗色样式（矢量底图有效）
   */
  addTdtLayer(map: Map, type: 'raster' | 'vector' = 'vector', dark = true) {
    const maxZoom = 18;

    if (type === 'raster') {
      map.addLayer(new TileLayer({ source: new XYZ({ url: mapUrlsConfig.img_w_url, maxZoom }) }));
      map.addLayer(new TileLayer({ source: new XYZ({ url: mapUrlsConfig.cia_w_url, maxZoom }) }));
    } else {
      map.addLayer(new TileLayer({
        source: new XYZ({ url: mapUrlsConfig.vec_w_url, maxZoom }),
        className: dark ? 'dark-map-layer' : '',
      }));
      map.addLayer(new TileLayer({
        source: new XYZ({ url: mapUrlsConfig.cva_w_url, maxZoom }),
        className: dark ? 'dark-map-layer' : '',
      }));
    }
  }

  // ─── 定位 ─────────────────────────────────────────────────────────────────────

  /** 定位到指定经纬度 */
  locateTo(map: Map, coordinate: [number, number], zoom = 14) {
    const center = olProj.fromLonLat(coordinate);
    map.getView().setCenter(center);
    map.getView().setZoom(zoom);
  }

  /** 定位到中国范围 */
  locateToChina(map: Map) {
    const chinaExtent = [8182244, 378392, 15038781, 7087874];
    map.getView().fit(chinaExtent);
  }

  /** 定位到矢量图层范围 */
  locateToLayer(map: Map, layer: VectorLayer<VectorSource>) {
    const extent = layer.getSource()?.getExtent();
    if (!extent) return;
    map.getView().fit(extent, { maxZoom: 14, padding: [80, 50, 80, 50] });
  }

  // ─── 无人机标注 ───────────────────────────────────────────────────────────────

  /**
   * 向地图添加无人机标注图层
   * @param map OL 地图实例
   * @param drones 无人机数据列表
   * @param clickCallback 点击标注回调
   * @returns 标注图层
   */
  addDroneMarkers(
    map: Map,
    drones: DroneMapMarker[],
    clickCallback?: (drone: DroneMapMarker) => void
  ): VectorLayer<VectorSource> {
    const features = drones
      .filter(d => d.longitude && d.latitude)
      .map(d => {
        const feature = new Feature({
          geometry: new Point(olProj.fromLonLat([d.longitude, d.latitude])),
          ...d,
        });
        return feature;
      });

    const source = new VectorSource({ features });
    const layer = new VectorLayer({
      source,
      style: (feature: any) => this.getDroneStyle(feature.get('status'), feature.get('name'), map),
    });

    map.addLayer(layer);
    map.set('droneLayer', layer);

    // 绑定缩放时更新图标大小
    map.getView().on('change:resolution', () => {
      this.droneStyleCache = {};
      layer.changed();
    });

    if (clickCallback) {
      this.registerDroneClickListener(map, clickCallback);
    }
    this.registerDroneHoverListener(map);

    return layer;
  }

  /**
   * 刷新地图上的无人机位置（局部更新，不重建图层）
   */
  updateDroneMarker(map: Map, drone: DroneMapMarker) {
    const layer: VectorLayer<VectorSource> = map.get('droneLayer');
    if (!layer) return;

    const source = layer.getSource()!;
    const feature = source.getFeatures().find(f => f.get('id') === drone.id);

    if (feature) {
      if (drone.longitude && drone.latitude) {
        (feature.getGeometry() as Point).setCoordinates(
          olProj.fromLonLat([drone.longitude, drone.latitude])
        );
      }
      feature.set('status', drone.status);
      feature.set('battery_level', drone.battery_level);
    }
  }

  /**
   * 更新所有无人机标注
   */
  refreshDroneMarkers(map: Map, drones: DroneMapMarker[]) {
    const layer: VectorLayer<VectorSource> = map.get('droneLayer');
    if (!layer) return;

    const source = layer.getSource()!;
    source.clear();
    this.droneStyleCache = {};

    const features = drones
      .filter(d => d.longitude && d.latitude)
      .map(d => {
        const feature = new Feature({
          geometry: new Point(olProj.fromLonLat([d.longitude, d.latitude])),
          ...d,
        });
        return feature;
      });

    source.addFeatures(features);
  }

  // ─── 弹出框 Overlay ───────────────────────────────────────────────────────────

  /** 向地图添加一个 Overlay（关联 DOM 元素与地图坐标） */
  addPopupOverlay(map: Map, el: ElementRef | HTMLElement): Overlay {
    const element = el instanceof ElementRef ? el.nativeElement : el;
    const overlay = new Overlay({ element, stopEvent: false });
    map.addOverlay(overlay);
    return overlay;
  }

  /** 显示 Overlay 到指定经纬度 */
  showOverlay(overlay: Overlay, coordinate: [number, number]) {
    overlay.setPosition(olProj.fromLonLat(coordinate));
  }

  /** 隐藏 Overlay */
  hideOverlay(overlay: Overlay) {
    overlay.setPosition(undefined);
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────────

  private getDroneStyle(status: string, name: string, map: Map): Style {
    const color = this.STATUS_COLORS[status] ?? this.STATUS_COLORS['offline'];
    const zoom = map.getView().getZoom() ?? 5;
    const radius = Math.max(6, Math.min(12, zoom - 2));

    const cacheKey = `${status}-${Math.round(radius)}`;
    if (this.droneStyleCache[cacheKey]) return this.droneStyleCache[cacheKey];

    const style = new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
      text: new Text({
        text: name,
        offsetY: -(radius + 8),
        font: '11px sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: '#000000', width: 3 }),
      }),
    });

    this.droneStyleCache[cacheKey] = style;
    return style;
  }

  private registerDroneClickListener(map: Map, callback: (drone: DroneMapMarker) => void) {
    map.on('singleclick', (e) => {
      const feature = map.forEachFeatureAtPixel(
        map.getEventPixel(e.originalEvent),
        (f) => f
      );
      if (feature) {
        const props = feature.getProperties() as DroneMapMarker;
        callback(props);
      }
    });
  }

  private registerDroneHoverListener(map: Map) {
    map.on('pointermove', (e) => {
      const pixel = map.getEventPixel(e.originalEvent);
      const feature = map.forEachFeatureAtPixel(pixel, (f) => f);
      map.getTargetElement().style.cursor = feature ? 'pointer' : 'default';

      if (feature === this.lastPointermoveFeature) return;
      this.lastPointermoveFeature = feature ?? null;
    });
  }
}
