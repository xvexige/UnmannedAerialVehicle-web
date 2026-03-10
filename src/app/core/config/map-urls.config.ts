/**
 * 天地图瓦片 URL 配置
 * 需要替换 tk 参数为自己申请的天地图 API Key
 * 申请地址：https://console.tianditu.gov.cn/
 */
const TDT_KEY = 'your_tianditu_key_here';
const TDT_BASE = 'https://t{0-7}.tianditu.gov.cn';

const mapUrlsConfig = {
  // 影像底图
  img_w_url: `${TDT_BASE}/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  // 影像注记
  cia_w_url: `${TDT_BASE}/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  // 矢量底图
  vec_w_url: `${TDT_BASE}/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  // 矢量注记
  cva_w_url: `${TDT_BASE}/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
};

export default mapUrlsConfig;
