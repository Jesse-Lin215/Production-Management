import React, { useState, useMemo, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  QrCode, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  X, 
  Printer, 
  Download, 
  ExternalLink,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface BomMaterialRow {
  id: string;
  seq: string;
  parentSeq?: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  drawingNo: string;
  bomVersion: string;
  unit: string;
  standardUsage: number | string;
  brand: string;
  material: string;
  standardCost: number;
  routing: string;
  scrapRate: string;
  supplyType: '自制' | '销售、采购、自制' | '销售、采购' | '采购';
  imageUrl?: string;
  remark: string;
  isParent?: boolean;
}

// 19 mock items exactly matching user reference images and totals:
// 总用量 = 74, 总成本 = ¥4850.00, 共 19 项物料
const INITIAL_BOM_ROWS: BomMaterialRow[] = [
  {
    id: 'mat-1',
    seq: '1',
    materialCode: 'CG-00007',
    materialName: '换边机',
    category: '核心功能部件类',
    specification: 'GWHU-1829',
    drawingNo: 'DWG-CG-00007',
    bomVersion: 'V1.0',
    unit: '台',
    standardUsage: '-',
    brand: '自主研发',
    material: '铝合金/钣金结构',
    standardCost: 4850.00,
    routing: '整机总装与系统调试工艺...',
    scrapRate: '0%',
    supplyType: '自制',
    remark: '定制双向换边装置'
  },
  {
    id: 'mat-2',
    seq: '2',
    materialCode: '05-00035',
    materialName: '变压器罩子_V1',
    category: '钣金件',
    specification: 'B0033-P460-G06',
    drawingNo: 'DWG-05-00035',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 5,
    brand: '-',
    material: '优质合金钢',
    standardCost: 0.00,
    routing: '钣金工艺路线',
    scrapRate: '0%',
    supplyType: '销售、采购、自制',
    remark: '-'
  },
  {
    id: 'mat-3',
    seq: '3',
    materialCode: 'CG-00002',
    materialName: '2米移栽机',
    category: '高端成品机',
    specification: 'YZ-0043',
    drawingNo: 'YZ-0043',
    bomVersion: 'V4.0',
    unit: '个',
    standardUsage: 1,
    brand: '-',
    material: '优质合金钢',
    standardCost: 0.00,
    routing: '车床路线',
    scrapRate: '0%',
    supplyType: '销售、采购、自制',
    remark: '-',
    isParent: true
  },
  {
    id: 'mat-3-1',
    seq: '3-1',
    parentSeq: '3',
    materialCode: 'ITEM20260703001',
    materialName: '防水接头',
    category: '五金类',
    specification: 'M50-1.5',
    drawingNo: '-',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 1,
    brand: '-',
    material: '304不锈钢',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '销售、采购',
    remark: '-'
  },
  {
    id: 'mat-3-2',
    seq: '3-2',
    parentSeq: '3',
    materialCode: '01-00WJ-00002',
    materialName: '滚花销钉',
    category: '五金类',
    specification: 'M3-6',
    drawingNo: '-',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 2,
    brand: '-',
    material: '304不锈钢',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-4',
    seq: '4',
    materialCode: '02-00108',
    materialName: '主传动同步带轮',
    category: '机加件',
    specification: 'GT2-40T-W10',
    drawingNo: 'DWG-02-00108',
    bomVersion: 'V1.2',
    unit: 'PCS',
    standardUsage: 2,
    brand: '自主研发',
    material: '45#优质碳素结构钢',
    standardCost: 0.00,
    routing: '车铣复合高精机加路线',
    scrapRate: '0%',
    supplyType: '自制',
    remark: '-'
  },
  {
    id: 'mat-5',
    seq: '5',
    materialCode: '08-00219',
    materialName: '高精度直线导轨滑块',
    category: '标准件',
    specification: 'HGH20CA-Z0C',
    drawingNo: 'HG-20-C',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 4,
    brand: '上银 HIWIN',
    material: '高碳铬轴承钢 GCr15',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-6',
    seq: '6',
    materialCode: '03-00045',
    materialName: '低噪音步进电机驱动器',
    category: '电气件',
    specification: 'DM542-PRO-V2',
    drawingNo: 'DWG-E-03-045',
    bomVersion: 'V2.0',
    unit: '台',
    standardUsage: 2,
    brand: '雷赛智能',
    material: '阻燃PC工程塑料',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-7',
    seq: '7',
    materialCode: '07-00331',
    materialName: '漫反射光电传感器开关',
    category: '电气件',
    specification: 'E3Z-D61-2M',
    drawingNo: 'OM-E3Z',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 6,
    brand: '欧姆龙 OMRON',
    material: 'PBT高绝缘工程塑料',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-8',
    seq: '8',
    materialCode: '01-00012',
    materialName: '底盘主承载焊接立柱',
    category: '钣金件',
    specification: '80*80*2400-T3',
    drawingNo: 'DWG-01-00012',
    bomVersion: 'V1.0',
    unit: '件',
    standardUsage: 4,
    brand: '自主研发',
    material: 'Q235低碳钢板',
    standardCost: 0.00,
    routing: '光纤激光下料与CO2焊接',
    scrapRate: '0%',
    supplyType: '自制',
    remark: '-'
  },
  {
    id: 'mat-9',
    seq: '9',
    materialCode: '05-00118',
    materialName: '透明防尘防护罩总成',
    category: '钣金件',
    specification: 'PC-800*600*3',
    drawingNo: 'DWG-05-00118',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 2,
    brand: '自主研发',
    material: '高透聚碳酸酯亚克力',
    standardCost: 0.00,
    routing: '数控雕刻打磨折弯工艺',
    scrapRate: '0%',
    supplyType: '销售、采购、自制',
    remark: '装配时需撕双面防刮覆膜'
  },
  {
    id: 'mat-10',
    seq: '10',
    materialCode: '09-00054',
    materialName: '内六角圆柱头紧固螺栓',
    category: '五金类',
    specification: 'M6*25-12.9',
    drawingNo: '-',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 20,
    brand: '-',
    material: '12.9级合金高强度钢',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-11',
    seq: '11',
    materialCode: '09-00055',
    materialName: '弹簧防松平垫组合垫圈',
    category: '五金类',
    specification: 'M6-GB9074',
    drawingNo: '-',
    bomVersion: '-',
    unit: 'PCS',
    standardUsage: 20,
    brand: '-',
    material: 'SUS304奥氏体不锈钢',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-12',
    seq: '12',
    materialCode: '04-00021',
    materialName: 'PLC总线运动控制器',
    category: '电气件',
    specification: 'FX5U-32MT/ESS',
    drawingNo: 'DWG-FX5U',
    bomVersion: 'V3.1',
    unit: '台',
    standardUsage: 1,
    brand: '三菱电机',
    material: '耐高温ABS阻燃材料',
    standardCost: 0.00,
    routing: '电控柜接线与程序烧录调试',
    scrapRate: '0%',
    supplyType: '销售、采购',
    remark: '-'
  },
  {
    id: 'mat-13',
    seq: '13',
    materialCode: '06-00088',
    materialName: '二位五通先导电磁换向阀',
    category: '气动件',
    specification: '4V210-08-DC24V',
    drawingNo: 'SMC-4V210',
    bomVersion: '-',
    unit: '组',
    standardUsage: 2,
    brand: '亚德客 AIRTAC',
    material: 'ADC12优质铸铝合金',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-14',
    seq: '14',
    materialCode: '06-00092',
    materialName: '气动耐磨PU软管接头组',
    category: '气动件',
    specification: 'PU-φ8-10m套',
    drawingNo: '-',
    bomVersion: '-',
    unit: '套',
    standardUsage: 1,
    brand: '-',
    material: '进口高回弹聚氨酯PU',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-15',
    seq: '15',
    materialCode: '10-00016',
    materialName: '急停安全自锁按钮',
    category: '电气件',
    specification: 'LAY7-11ZS-红色',
    drawingNo: '-',
    bomVersion: '-',
    unit: '个',
    standardUsage: 1,
    brand: '正泰电气',
    material: '阻燃工程塑料',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-16',
    seq: '16',
    materialCode: '11-00008',
    materialName: '设备安全警示反光标识',
    category: '辅料',
    specification: '120*50mm 铝箔背胶',
    drawingNo: '-',
    bomVersion: '-',
    unit: '张',
    standardUsage: 2,
    brand: '-',
    material: '丝网印刷高粘铝箔',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '-'
  },
  {
    id: 'mat-17',
    seq: '17',
    materialCode: '12-00003',
    materialName: '耐高温锂基润滑脂',
    category: '辅料',
    specification: 'NLGI-2 500g罐装',
    drawingNo: '-',
    bomVersion: '-',
    unit: '罐',
    standardUsage: 1,
    brand: '长城润滑油',
    material: '极压复合锂基脂',
    standardCost: 0.00,
    routing: '-',
    scrapRate: '0%',
    supplyType: '采购',
    remark: '导轨丝杠初装润滑填注'
  }
];

interface BomCompositionTableProps {
  defaultBomVersion?: string;
  productName?: string;
  productCode?: string;
}

export default function BomCompositionTable({
  defaultBomVersion = 'V2.1',
  productName,
  productCode
}: BomCompositionTableProps) {
  const [bomVersion, setBomVersion] = useState<string>(() => defaultBomVersion || 'V2.1');
  const [isSeq3Expanded, setIsSeq3Expanded] = useState<boolean>(true);
  
  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [previewImageItem, setPreviewImageItem] = useState<BomMaterialRow | null>(null);
  const [previewQrItem, setPreviewQrItem] = useState<BomMaterialRow | null>(null);

  useEffect(() => {
    if (defaultBomVersion) {
      setBomVersion(defaultBomVersion);
    }
  }, [defaultBomVersion]);

  // Dynamic versions list
  const availableVersions = useMemo(() => {
    const primary = defaultBomVersion || 'V2.1';
    const list = [
      { ver: primary, label: `${primary} - 默认版本 (当前所选产品带出)` }
    ];
    if (!primary.includes('V1.0')) {
      list.push({ ver: 'V1.0', label: 'V1.0 - 基础标准版本' });
    }
    if (!primary.includes('V4.0')) {
      list.push({ ver: 'V4.0', label: 'V4.0 - 高阶定制版本' });
    }
    return list;
  }, [defaultBomVersion]);

  // Visible rows respecting tree expansion
  const visibleRows = useMemo(() => {
    return INITIAL_BOM_ROWS.filter(item => {
      if (item.parentSeq === '3' && !isSeq3Expanded) {
        return false;
      }
      return true;
    });
  }, [isSeq3Expanded]);

  // Total pages
  const totalItemsCount = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / pageSize));

  // Current page items
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return visibleRows.slice(startIndex, startIndex + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  // Totals (sum from all items)
  const totalStandardUsage = useMemo(() => {
    return INITIAL_BOM_ROWS.reduce((sum, item) => {
      const val = typeof item.standardUsage === 'number' ? item.standardUsage : 0;
      return sum + val;
    }, 0);
  }, []);

  const totalStandardCost = useMemo(() => {
    return INITIAL_BOM_ROWS.reduce((sum, item) => sum + item.standardCost, 0);
  }, []);

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Header controls: Filter by BOM Version ONLY (search box completely removed per request) */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {productName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-200/80 text-xs text-blue-900 font-medium shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500">产品:</span>
              <span className="font-bold">{productName}</span>
              {productCode && <span className="font-mono text-slate-400">({productCode})</span>}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">BOM版本:</span>
            <select 
              value={bomVersion}
              onChange={(e) => setBomVersion(e.target.value)}
              className="w-[240px] h-8 px-2.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
            >
              {availableVersions.map(v => (
                <option key={v.ver} value={v.ver}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Natural height, NO internal vertical scroll (overflow-x-auto only for horizontal overflow) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-slate-700 font-bold text-[12px]">
              <th className="py-3 px-4 text-center w-14">序号</th>
              <th className="py-3 px-4 min-w-[220px]">物料编码与名称</th>
              <th className="py-3 px-4 min-w-[100px]">物料分类</th>
              <th className="py-3 px-4 min-w-[120px]">规格</th>
              <th className="py-3 px-4 min-w-[120px]">图号</th>
              <th className="py-3 px-4 min-w-[90px]">BOM版本</th>
              <th className="py-3 px-4 min-w-[70px]">单位</th>
              <th className="py-3 px-4 min-w-[80px]">标准用量</th>
              <th className="py-3 px-4 min-w-[90px]">品牌</th>
              <th className="py-3 px-4 min-w-[130px]">材质</th>
              <th className="py-3 px-4 min-w-[100px]">标准成本</th>
              <th className="py-3 px-4 min-w-[170px]">工艺路线</th>
              <th className="py-3 px-4 min-w-[80px]">损耗率</th>
              <th className="py-3 px-4 min-w-[130px]">生产/采购方式</th>
              <th className="py-3 px-4 min-w-[95px] text-center">物料图片</th>
              <th className="py-3 px-4 min-w-[105px] text-center">物料二维码</th>
              <th className="py-3 px-4 min-w-[140px]">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedRows.map((item) => {
              const isChild = !!item.parentSeq;
              return (
                <tr 
                  key={item.id} 
                  className={cn(
                    "hover:bg-slate-50/60 transition-colors bg-white"
                  )}
                >
                  {/* 序号 */}
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                    {item.seq}
                  </td>

                  {/* 物料编码与名称 */}
                  <td className="py-3 px-4">
                    {item.isParent ? (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setIsSeq3Expanded(!isSeq3Expanded)}
                          className="p-0.5 hover:bg-slate-200/60 rounded text-slate-500 transition-colors cursor-pointer"
                          title={isSeq3Expanded ? "折叠子项" : "展开子项"}
                        >
                          {isSeq3Expanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        <span className="font-bold text-slate-900 font-mono text-xs">{item.materialCode}</span>
                        <span className="font-bold text-slate-800 text-xs">{item.materialName}</span>
                      </div>
                    ) : isChild ? (
                      <div className="flex items-center gap-2 pl-5">
                        <span className="text-slate-400 font-mono text-xs select-none">└</span>
                        <span className="font-bold text-slate-900 font-mono text-xs">{item.materialCode}</span>
                        <span className="font-bold text-slate-800 text-xs">{item.materialName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-xs">{item.materialCode}</span>
                        <span className="font-bold text-slate-800 text-xs">{item.materialName}</span>
                      </div>
                    )}
                  </td>

                  {/* 物料分类 */}
                  <td className="py-3 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 font-medium">
                      {item.category}
                    </span>
                  </td>

                  {/* 规格 */}
                  <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                    {item.specification || '-'}
                  </td>

                  {/* 图号 (不允许交互，取消交互样式) */}
                  <td className="py-3 px-4 text-slate-700 font-mono text-xs select-text">
                    {item.drawingNo && item.drawingNo !== '-' ? (
                      item.drawingNo
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* BOM版本 */}
                  <td className="py-3 px-4">
                    {item.bomVersion && item.bomVersion !== '-' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 font-semibold border border-slate-200/60">
                        {item.bomVersion}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* 单位 */}
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {item.unit}
                  </td>

                  {/* 标准用量 */}
                  <td className="py-3 px-4">
                    {typeof item.standardUsage === 'number' ? (
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {item.standardUsage}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* 品牌 */}
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {item.brand || '-'}
                  </td>

                  {/* 材质 */}
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {item.material || '-'}
                  </td>

                  {/* 标准成本 */}
                  <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                    {item.standardCost > 0 ? `¥${item.standardCost.toFixed(2)}` : '¥0.00'}
                  </td>

                  {/* 工艺路线 */}
                  <td className="py-3 px-4 text-slate-600 text-xs max-w-[200px] truncate" title={item.routing}>
                    {item.routing || '-'}
                  </td>

                  {/* 损耗率 */}
                  <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                    {item.scrapRate}
                  </td>

                  {/* 生产/采购方式 */}
                  <td className="py-3 px-4">
                    {item.supplyType === '自制' && (
                      <span className="inline-block px-2.5 py-0.5 rounded border border-blue-200 bg-blue-50/80 text-blue-600 text-xs font-medium">
                        自制
                      </span>
                    )}
                    {item.supplyType === '销售、采购、自制' && (
                      <span className="inline-block px-2.5 py-0.5 rounded border border-emerald-200 bg-emerald-50/80 text-emerald-600 text-xs font-medium">
                        销售、采购、自制
                      </span>
                    )}
                    {item.supplyType === '销售、采购' && (
                      <span className="inline-block px-2.5 py-0.5 rounded border border-amber-200 bg-amber-50/90 text-amber-700 text-xs font-medium">
                        销售、采购
                      </span>
                    )}
                    {item.supplyType === '采购' && (
                      <span className="inline-block px-2.5 py-0.5 rounded border border-amber-200 bg-amber-50/80 text-amber-700 text-xs font-medium">
                        采购
                      </span>
                    )}
                  </td>

                  {/* 物料图片 */}
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => setPreviewImageItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>图片</span>
                    </button>
                  </td>

                  {/* 物料二维码 */}
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => setPreviewQrItem(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>二维码</span>
                    </button>
                  </td>

                  {/* 备注 */}
                  <td className="py-3 px-4 text-slate-500 text-xs max-w-[200px] truncate" title={item.remark}>
                    {item.remark || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching User Reference Image 2 */}
      <div className="w-full px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white text-xs text-slate-600">
        {/* Left Totals: 总用量 74, 总成本 ¥4850.00 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">总用量:</span>
            <span className="font-bold text-slate-900 font-mono text-[13px]">{totalStandardUsage}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">总成本:</span>
            <span className="font-bold text-blue-600 font-mono text-[13px]">
              ¥{totalStandardCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right Pagination controls */}
        <div className="flex items-center gap-4 ml-auto">
          <span className="text-slate-500">
            共 <span className="font-bold text-slate-800">{totalItemsCount}</span> 项物料
          </span>

          {/* Page Size Select */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none pl-3 pr-7 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:border-blue-400 cursor-pointer shadow-2xs"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Page Display */}
          <span className="text-slate-600">
            第 {currentPage} / {totalPages} 页
          </span>

          {/* Prev / Next Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: 物料图片预览弹窗 */}
      {previewImageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">物料图片预览</h3>
              </div>
              <button 
                onClick={() => setPreviewImageItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              <div className="w-full h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden group">
                {/* SVG Blueprint Mock Render */}
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                    <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{previewImageItem.materialName}</span>
                  <span className="font-mono text-xs text-slate-400 mt-1">{previewImageItem.materialCode} · {previewImageItem.specification}</span>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-2">
                    高清物料图已通过 PDM/PLM 系统同步
                  </span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400">物料分类:</span>{' '}
                  <span className="font-medium text-slate-700">{previewImageItem.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">材质规格:</span>{' '}
                  <span className="font-medium text-slate-700">{previewImageItem.material}</span>
                </div>
                <div>
                  <span className="text-slate-400">供应方式:</span>{' '}
                  <span className="font-medium text-slate-700">{previewImageItem.supplyType}</span>
                </div>
                <div>
                  <span className="text-slate-400">图纸关联:</span>{' '}
                  <span className="font-mono text-slate-700 font-medium">{previewImageItem.drawingNo || '-'}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setPreviewImageItem(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 物料二维码预览与打印弹窗 */}
      {previewQrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">物料标识二维码标签</h3>
              </div>
              <button 
                onClick={() => setPreviewQrItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* QR Label Card (Printable simulation) */}
              <div className="w-64 p-4 rounded-xl border-2 border-slate-800 bg-white shadow-md flex flex-col items-center text-center">
                <div className="text-[11px] font-bold tracking-widest text-slate-800 border-b border-slate-300 w-full pb-1 mb-2">
                  MES 车间在制品流转标签
                </div>

                {/* Simulated high-clarity SVG QR code */}
                <div className="w-36 h-36 bg-slate-900 p-2.5 rounded-lg flex items-center justify-center relative my-1">
                  <div className="w-full h-full bg-white p-1 rounded flex items-center justify-center">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                </div>

                <div className="w-full mt-2 text-left space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">编码:</span>
                    <span className="font-mono font-bold text-slate-900">{previewQrItem.materialCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">名称:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{previewQrItem.materialName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">规格:</span>
                    <span className="font-mono text-slate-700">{previewQrItem.specification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">BOM版本:</span>
                    <span className="font-mono text-slate-700">{previewQrItem.bomVersion}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[11px] text-slate-400">支持斑马/得力标签机打印</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewQrItem(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    alert(`已向车间工位标签打印机发送打印任务：${previewQrItem.materialName} (${previewQrItem.materialCode})`);
                    setPreviewQrItem(null);
                  }}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  打印标签
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}