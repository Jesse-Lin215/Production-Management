import React, { useState, useMemo, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Home, RefreshCw, LayoutGrid,
  Printer, FileText, Cpu, X, Copy, ExternalLink, RotateCcw, XCircle, CheckCircle2,
  ArrowLeft, Calendar, Clock, User, Search, Filter, SlidersHorizontal, Check, Move
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getOutsourcingOrderByNo,
  getOutsourcingOrders,
  updateOutsourcingOrders,
  saveOutsourcingOrder,
  OutsourcingOrderItem
} from '../outsourcingStore';
import { ContractorReportModal } from '../components/ContractorReportModal';

interface OutsourcingDetailsProps {
  orderNo: string;
  onBack: () => void;
  onEditOrder?: (orderNo: string) => void;
  onNavigateOrders?: () => void;
}

interface ProdColConfigItem {
  key: string;
  label: string;
  visible: boolean;
  fixed?: 'left' | 'right' | null;
  type: 'search' | 'filter';
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
  onlyFor?: '工序外协' | '整单外协';
}

const DEFAULT_PROD_COLS: ProdColConfigItem[] = [
  { key: 'salesOrder', label: '销售订单号', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[150px]' },
  { key: 'salesOrderLine', label: '项次', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[80px]' },
  { key: 'productCode', label: '产品编码', visible: true, fixed: null, type: 'search', sortable: true, align: 'left', widthClass: 'min-w-[140px]' },
  { key: 'productName', label: '产品名称', visible: true, fixed: null, type: 'search', sortable: true, align: 'left', widthClass: 'min-w-[160px]' },
  { key: 'productCategory', label: '产品分类', visible: true, fixed: null, type: 'filter', sortable: true, align: 'center', widthClass: 'min-w-[115px]' },
  { key: 'productSpec', label: '产品规格', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[150px]' },
  { key: 'bomVersion', label: 'BOM版本', visible: true, fixed: null, type: 'filter', sortable: true, align: 'center', widthClass: 'min-w-[105px]' },
  { key: 'materialCode', label: '物料编码', visible: true, fixed: null, type: 'search', sortable: true, align: 'left', widthClass: 'min-w-[150px]', onlyFor: '工序外协' },
  { key: 'materialName', label: '物料名称', visible: true, fixed: null, type: 'search', sortable: true, align: 'left', widthClass: 'min-w-[180px]', onlyFor: '工序外协' },
  { key: 'category', label: '物料分类', visible: true, fixed: null, type: 'filter', sortable: true, align: 'center', widthClass: 'min-w-[115px]', onlyFor: '工序外协' },
  { key: 'specification', label: '规格', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[150px]', onlyFor: '工序外协' },
  { key: 'unit', label: '单位', visible: true, fixed: null, type: 'filter', sortable: true, align: 'center', widthClass: 'min-w-[86px]' },
  { key: 'currentStock', label: '当前库存', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[105px]' },
  { key: 'plannedQty', label: '计划数量', visible: true, fixed: null, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[110px]' },
  { key: 'taxIncludedUnitPrice', label: '含税单价', visible: true, fixed: null, type: 'search', sortable: true, align: 'right', widthClass: 'min-w-[115px]' },
  { key: 'taxRate', label: '税率', visible: true, fixed: null, type: 'filter', sortable: true, align: 'center', widthClass: 'min-w-[95px]' },
  { key: 'taxIncludedAmount', label: '含税金额', visible: true, fixed: null, type: 'search', sortable: true, align: 'right', widthClass: 'min-w-[115px]' },
  { key: 'remark', label: '备注', visible: true, fixed: null, type: 'search', sortable: false, align: 'left', widthClass: 'min-w-[150px]' }
];

function SortTriangles({ activeDir }: { activeDir: 'asc' | 'desc' | null }) {
  return (
    <span className="inline-flex flex-col items-center justify-center leading-none ml-0.5">
      <span
        className={cn(
          "text-[7px] leading-[7px]",
          activeDir === 'asc' ? "text-blue-600" : "text-slate-300"
        )}
      >
        ▲
      </span>
      <span
        className={cn(
          "text-[7px] leading-[7px]",
          activeDir === 'desc' ? "text-blue-600" : "text-slate-300"
        )}
      >
        ▼
      </span>
    </span>
  );
}

interface BomDetailItem {
  id: string;
  salesOrder: string;
  salesOrderLine: string;
  productCode: string;
  productName: string;
  productSpec: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  drawingNo: string;
  bomVersion: string;
  unit: string;
  standardUsage: number;
  brand: string;
  materialTexture: string;
  standardCost: string;
  processRoute: string;
  lossRate: string;
  supplyMethod: string;
  remark: string;
}

type BomColumnKey =
  | 'seq'
  | 'salesOrder'
  | 'salesOrderLine'
  | 'productCode'
  | 'productName'
  | 'productSpec'
  | 'materialCode'
  | 'materialName'
  | 'category'
  | 'specification'
  | 'drawingNo'
  | 'bomVersion'
  | 'unit'
  | 'standardUsage'
  | 'brand'
  | 'materialTexture'
  | 'standardCost'
  | 'processRoute'
  | 'lossRate'
  | 'supplyMethod'
  | 'materialImage'
  | 'materialQrCode'
  | 'remark';

interface BomColumnConfig {
  key: BomColumnKey;
  label: string;
  visible: boolean;
  align?: 'left' | 'right' | 'center';
  filterType?: 'search' | 'filter';
  sortable?: boolean;
}

const DEFAULT_BOM_COLUMNS: BomColumnConfig[] = [
  { key: 'seq', label: '序号', visible: true, align: 'left' },
  { key: 'salesOrder', label: '销售订单', visible: true, align: 'left', filterType: 'search', sortable: true },
  { key: 'salesOrderLine', label: '项次', visible: true, align: 'center', filterType: 'search', sortable: true },
  { key: 'productCode', label: '产品编码', visible: true, align: 'left', filterType: 'search', sortable: true },
  { key: 'productName', label: '产品名称', visible: true, align: 'left', filterType: 'search' },
  { key: 'productSpec', label: '产品规格', visible: true, align: 'left', filterType: 'search' },
  { key: 'materialCode', label: '物料编码', visible: true, align: 'left', filterType: 'search', sortable: true },
  { key: 'materialName', label: '物料名称', visible: true, align: 'left', filterType: 'search' },
  { key: 'category', label: '物料分类', visible: true, align: 'left', filterType: 'filter' },
  { key: 'specification', label: '规格', visible: true, align: 'left', filterType: 'search' },
  { key: 'drawingNo', label: '图号', visible: true, align: 'left', filterType: 'search' },
  { key: 'bomVersion', label: 'BOM版本', visible: true, align: 'left', filterType: 'filter' },
  { key: 'unit', label: '单位', visible: true, align: 'left', filterType: 'filter' },
  { key: 'standardUsage', label: '标准用量', visible: true, align: 'right', filterType: 'search', sortable: true },
  { key: 'brand', label: '品牌', visible: true, align: 'left', filterType: 'filter' },
  { key: 'materialTexture', label: '材质', visible: true, align: 'left', filterType: 'search' },
  { key: 'standardCost', label: '标准成本', visible: true, align: 'right', filterType: 'search', sortable: true },
  { key: 'processRoute', label: '工艺路线', visible: true, align: 'left', filterType: 'search' },
  { key: 'lossRate', label: '损耗率', visible: true, align: 'right', filterType: 'search' },
  { key: 'supplyMethod', label: '生产/采购方式', visible: true, align: 'left', filterType: 'filter' },
  { key: 'materialImage', label: '物料图片', visible: true, align: 'center' },
  { key: 'materialQrCode', label: '物料二维码', visible: true, align: 'center' },
  { key: 'remark', label: '备注', visible: true, align: 'left', filterType: 'search' }
];

function getBomDetailsForMaterial(
  materialCode: string,
  materialName: string,
  bomVer = 'V1.0',
  parentInfo?: {
    rowKeyPrefix?: string;
    salesOrder?: string;
    salesOrderLine?: string;
    productCode?: string;
    productName?: string;
    productSpec?: string;
  }
): BomDetailItem[] {
  const baseCode = materialCode || '02-00DX-02161';
  const prefix = parentInfo?.rowKeyPrefix ? `${parentInfo.rowKeyPrefix}-${baseCode}` : baseCode;
  const salesOrder = parentInfo?.salesOrder || 'HY-26C-085';
  const salesOrderLine = parentInfo?.salesOrderLine || '1';
  const productCode = parentInfo?.productCode || baseCode;
  const productName = parentInfo?.productName || materialName || '核心组件';
  const productSpec = parentInfo?.productSpec || 'HY-LD250';

  return [
    {
      id: `${prefix}-bom-1`,
      salesOrder,
      salesOrderLine,
      productCode,
      productName,
      productSpec,
      materialCode: `${baseCode}-01`,
      materialName: `${materialName || '核心组件'}主结构件`,
      category: '机加件',
      specification: '650×420×18mm 精密加工',
      drawingNo: `DWG-${baseCode.replace(/[^A-Z0-9]/gi, '').slice(-5)}-01`,
      bomVersion: bomVer || 'V1.0',
      unit: '件',
      standardUsage: 1,
      brand: '自制精工',
      materialTexture: 'AL6061-T6',
      standardCost: '128.00',
      processRoute: 'CNC粗加工 -> 五轴精雕 -> 表面阳极氧化',
      lossRate: '1.50%',
      supplyMethod: '自制/工序外协',
      remark: '关键尺寸全检'
    },
    {
      id: `${prefix}-bom-2`,
      salesOrder,
      salesOrderLine,
      productCode,
      productName,
      productSpec,
      materialCode: `${baseCode}-02`,
      materialName: `${materialName || '核心组件'}钣金防护罩`,
      category: '钣金件',
      specification: 't=2.0mm 冷轧钢板折弯',
      drawingNo: `DWG-${baseCode.replace(/[^A-Z0-9]/gi, '').slice(-5)}-02`,
      bomVersion: bomVer || 'V1.0',
      unit: '件',
      standardUsage: 2,
      brand: '华东钣金',
      materialTexture: 'SPCC',
      standardCost: '45.00',
      processRoute: '激光切割外协 -> 钣金折弯外协 -> 表面喷涂',
      lossRate: '2.00%',
      supplyMethod: '外协采购',
      remark: '表面静电喷塑哑光灰'
    },
    {
      id: `${prefix}-bom-3`,
      salesOrder,
      salesOrderLine,
      productCode,
      productName,
      productSpec,
      materialCode: `${baseCode}-03`,
      materialName: '高精度导轨滑块组件',
      category: '标准件',
      specification: 'HGH20CA / L=800mm',
      drawingNo: `DWG-${baseCode.replace(/[^A-Z0-9]/gi, '').slice(-5)}-03`,
      bomVersion: bomVer || 'V1.0',
      unit: '套',
      standardUsage: 2,
      brand: 'HIWIN上银',
      materialTexture: '轴承钢GCr15',
      standardCost: '260.00',
      processRoute: '外购检验 -> 装配调试',
      lossRate: '0.00%',
      supplyMethod: '外购',
      remark: '配对安装'
    }
  ];
}

export default function OutsourcingDetails({
  orderNo,
  onBack,
  onEditOrder,
  onNavigateOrders
}: OutsourcingDetailsProps) {
  const [detailData, setDetailData] = useState<OutsourcingOrderItem>(
    () => getOutsourcingOrderByNo(orderNo) || getOutsourcingOrders()[0]
  );

  const [anchorStep, setAnchorStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isBasicCollapsed, setIsBasicCollapsed] = useState<boolean>(false);
  const [linkActive, setLinkActive] = useState<boolean>(detailData.securityLink.active);
  const [linkUrl, setLinkUrl] = useState<string>(detailData.securityLink.url);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef<boolean>(false);
  const scrollTimerRef = useRef<number | null>(null);

  const scrollToStep = (step: 1 | 2 | 3 | 4 | 5) => {
    setAnchorStep(step);
    programmaticScrollRef.current = true;
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 650);

    const refMap = {
      1: step1Ref,
      2: step2Ref,
      3: step3Ref,
      4: step4Ref,
      5: step5Ref
    };
    const target = refMap[step].current;
    if (target && scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + scrollContainerRef.current.scrollTop;
      scrollContainerRef.current.scrollTo({ top: Math.max(0, offset - 4), behavior: 'smooth' });
    }
  };

  // Production Details table filter/search/sort & column config state
  const [prodCols, setProdCols] = useState<ProdColConfigItem[]>(() =>
    DEFAULT_PROD_COLS.map(c => ({ ...c }))
  );
  const [isProdColConfigOpen, setIsProdColConfigOpen] = useState<boolean>(false);
  const [draggedProdColIdx, setDraggedProdColIdx] = useState<number | null>(null);
  const [prodColFilters, setProdColFilters] = useState<Record<string, string>>({});
  const [activeProdHeaderMenu, setActiveProdHeaderMenu] = useState<string | null>(null);
  const [prodSortConfig, setProdSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  // BOM Details table filter/search/sort, column config & pagination state (synced with OutsourcingWizard)
  const [selectedBomMaterialId, setSelectedBomMaterialId] = useState<string | null>(null);
  const [bomColumns, setBomColumns] = useState<BomColumnConfig[]>(() =>
    DEFAULT_BOM_COLUMNS.map(col => ({ ...col }))
  );
  const [isBomColConfigOpen, setIsBomColConfigOpen] = useState<boolean>(false);
  const [draggedBomColIdx, setDraggedBomColIdx] = useState<number | null>(null);
  const [bomColFilters, setBomColFilters] = useState<Record<string, string>>({});
  const [activeBomHeaderMenu, setActiveBomHeaderMenu] = useState<string | null>(null);
  const [bomSortConfig, setBomSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [bomPage, setBomPage] = useState<number>(1);
  const [bomPageSize, setBomPageSize] = useState<number>(10);
  const [bomJumpPage, setBomJumpPage] = useState<string>('1');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const remainingProgress = Math.max(0, 100 - detailData.productionProgress);
  const taxRateNum = Number(detailData.taxRate ?? 13);
  const taxRateDec = taxRateNum / 100;
  const totalInclTax = detailData.taxIncludedAmount || 0;
  const totalExclTax = totalInclTax / (1 + taxRateDec);
  const totalTaxAmount = totalInclTax - totalExclTax;

  const processList: string[] =
    detailData.outsourcingType === '工序外协'
      ? detailData.processes && detailData.processes.length > 0
        ? detailData.processes
        : detailData.processName && detailData.processName !== '--'
        ? detailData.processName.split('、')
        : ['表面阳极氧化']
      : [];

  const activeBomMaterial =
    detailData.materials.find(m => m.id === selectedBomMaterialId) || null;

  const allSectionBomItems: BomDetailItem[] = useMemo(() => {
    if (detailData.outsourcingType !== '整单外协') return [];
    const targetRows = activeBomMaterial
      ? [activeBomMaterial]
      : detailData.materials.length > 0
      ? detailData.materials
      : [
          {
            id: 'default-prod',
            salesOrder: detailData.salesOrder || '-',
            source: detailData.salesOrder || '-',
            salesOrderLine: detailData.salesOrderLine || '1',
            lineNo: detailData.salesOrderLine || '1',
            productCode: detailData.productCode,
            productName: detailData.productName,
            productSpec: detailData.specification,
            materialCode: detailData.productCode,
            materialName: detailData.productName,
            specification: detailData.specification,
            bomVersion: detailData.bomVersion !== '--' ? detailData.bomVersion : 'V1.0',
          }
        ];

    return targetRows.flatMap((mat, matIdx) => {
      const code = mat.materialCode || detailData.productCode;
      const name = mat.materialName || detailData.productName;
      const ver =
        mat.bomVersion ||
        (detailData.bomVersion !== '--' ? detailData.bomVersion : 'V1.0');
      return getBomDetailsForMaterial(code, name, ver, {
        rowKeyPrefix: `${mat.id || matIdx}`,
        salesOrder: mat.source || mat.salesOrder || detailData.salesOrder || '-',
        salesOrderLine: mat.lineNo || mat.salesOrderLine || detailData.salesOrderLine || '1',
        productCode: mat.productCode || detailData.productCode || code || '-',
        productName: mat.productName || detailData.productName || name || '-',
        productSpec: mat.productSpec || detailData.specification || mat.specification || '-',
      });
    });
  }, [detailData, activeBomMaterial]);

  const visibleBomColumns = useMemo(() => bomColumns.filter(col => col.visible), [bomColumns]);

  const toggleBomColumnVisible = (key: BomColumnKey) => {
    setBomColumns(prev =>
      prev.map(col => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const handleSelectAllBomColumns = () => {
    setBomColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleClearAllBomColumns = () => {
    setBomColumns(prev => prev.map(col => ({ ...col, visible: false })));
  };

  const handleResetBomColumns = () => {
    setBomColumns(DEFAULT_BOM_COLUMNS.map(col => ({ ...col })));
  };

  const moveBomColumn = (index: number, direction: 'left' | 'right') => {
    setBomColumns(prev => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleDropBomColumn = (targetIndex: number) => {
    if (draggedBomColIdx === null || draggedBomColIdx === targetIndex) {
      setDraggedBomColIdx(null);
      return;
    }
    setBomColumns(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedBomColIdx, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedBomColIdx(null);
  };

  const getBomFieldValue = (bom: BomDetailItem, colKey: BomColumnKey): string => {
    switch (colKey) {
      case 'salesOrder':
        return bom.salesOrder || '';
      case 'salesOrderLine':
        return bom.salesOrderLine || '';
      case 'productCode':
        return bom.productCode || '';
      case 'productName':
        return bom.productName || '';
      case 'productSpec':
        return bom.productSpec || '';
      case 'materialCode':
        return bom.materialCode || '';
      case 'materialName':
        return bom.materialName || '';
      case 'category':
        return bom.category || '';
      case 'specification':
        return bom.specification || '';
      case 'drawingNo':
        return bom.drawingNo || '';
      case 'bomVersion':
        return bom.bomVersion || '';
      case 'unit':
        return bom.unit || '';
      case 'standardUsage':
        return String(bom.standardUsage ?? 1);
      case 'brand':
        return bom.brand || '';
      case 'materialTexture':
        return bom.materialTexture || '';
      case 'standardCost':
        return String(bom.standardCost || '0.00');
      case 'processRoute':
        return bom.processRoute || '';
      case 'lossRate':
        return bom.lossRate || '';
      case 'supplyMethod':
        return bom.supplyMethod || '';
      case 'remark':
        return bom.remark || '';
      default:
        return '';
    }
  };

  const filteredAndSortedBomItems = useMemo(() => {
    const filtered = allSectionBomItems.filter(bom => {
      for (const [colKey, filterVal] of Object.entries(bomColFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getBomFieldValue(bom, colKey as BomColumnKey).toLowerCase();
        if (!cellVal.includes(trimmed)) return false;
      }
      return true;
    });

    if (!bomSortConfig) return filtered;
    const { key, dir } = bomSortConfig;
    return [...filtered].sort((a, b) => {
      const valA = getBomFieldValue(a, key as BomColumnKey);
      const valB = getBomFieldValue(b, key as BomColumnKey);
      if (key === 'salesOrderLine' || key === 'standardUsage' || key === 'standardCost') {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [allSectionBomItems, bomColFilters, bomSortConfig]);

  const totalBomPages = Math.max(1, Math.ceil(filteredAndSortedBomItems.length / bomPageSize));
  const currentBomPage = Math.min(bomPage, totalBomPages);
  const paginatedSectionBomItems = filteredAndSortedBomItems.slice(
    (currentBomPage - 1) * bomPageSize,
    currentBomPage * bomPageSize
  );

  const renderBomCellContent = (bom: BomDetailItem, rowIdx: number, key: BomColumnKey) => {
    switch (key) {
      case 'seq':
        return <span className="text-slate-500">{rowIdx + 1}</span>;
      case 'salesOrder':
        return <span className="font-mono text-slate-700">{bom.salesOrder || '-'}</span>;
      case 'salesOrderLine':
        return <span className="font-mono text-slate-600">{bom.salesOrderLine || '1'}</span>;
      case 'productCode':
        return <span className="font-mono text-slate-700">{bom.productCode || '-'}</span>;
      case 'productName':
        return <span className="text-slate-800">{bom.productName || '-'}</span>;
      case 'productSpec':
        return <span className="font-mono text-slate-600">{bom.productSpec || '-'}</span>;
      case 'materialCode':
        return <span className="font-mono">{bom.materialCode}</span>;
      case 'materialName':
        return <span className="font-medium text-slate-800">{bom.materialName}</span>;
      case 'category':
        return bom.category;
      case 'specification':
        return bom.specification;
      case 'drawingNo':
        return <span className="font-mono text-slate-600">{bom.drawingNo}</span>;
      case 'bomVersion':
        return bom.bomVersion;
      case 'unit':
        return bom.unit;
      case 'standardUsage':
        return <span className="font-medium">{bom.standardUsage}</span>;
      case 'brand':
        return bom.brand;
      case 'materialTexture':
        return bom.materialTexture;
      case 'standardCost':
        return bom.standardCost;
      case 'processRoute':
        return <span className="text-slate-600">{bom.processRoute}</span>;
      case 'lossRate':
        return bom.lossRate;
      case 'supplyMethod':
        return bom.supplyMethod;
      case 'materialImage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
            缩略图
          </span>
        );
      case 'materialQrCode':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[11px] font-mono">
            QR-{bom.materialCode.slice(-2)}
          </span>
        );
      case 'remark':
        return <span className="text-slate-500">{bom.remark}</span>;
      default:
        return null;
    }
  };

  const renderBomFilterableTh = (col: BomColumnConfig, cIdx: number) => {
    if (!col.filterType) {
      return (
        <th
          key={col.key}
          className={cn(
            "px-3 whitespace-nowrap",
            cIdx < visibleBomColumns.length - 1 && "border-r border-slate-200/60",
            col.align === 'right' && "text-right",
            col.align === 'center' && "text-center"
          )}
        >
          {col.label}
        </th>
      );
    }

    const currentVal = bomColFilters[col.key] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeBomHeaderMenu === col.key;
    const isSorted = bomSortConfig?.key === col.key ? bomSortConfig.dir : null;

    const defaultBomFallbacks: Record<string, string[]> = {
      category: ['机加件', '钣金件', '标准件'],
      bomVersion: ['V1.0', 'V1.5', 'V2.0'],
      unit: ['件', '套', 'PCS'],
      brand: ['自制精工', '华东钣金', 'HIWIN上银'],
      supplyMethod: ['自制/工序外协', '外协采购', '外购']
    };
    const dynamicOpts = Array.from(
      new Set(allSectionBomItems.map(b => getBomFieldValue(b, col.key)).filter(Boolean))
    );
    const uniqueOptions =
      col.filterType === 'filter'
        ? dynamicOpts.length > 0
          ? dynamicOpts
          : defaultBomFallbacks[col.key] || []
        : [];

    return (
      <th
        key={col.key}
        onClick={e => e.stopPropagation()}
        className={cn(
          "px-3 font-bold text-slate-700 whitespace-nowrap relative select-none",
          cIdx < visibleBomColumns.length - 1 && "border-r border-slate-200/60",
          col.align === 'right' && "text-right",
          col.align === 'center' && "text-center"
        )}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 cursor-pointer group",
            col.align === 'right' && "justify-end",
            col.align === 'center' && "justify-center"
          )}
        >
          <button
            type="button"
            onClick={() => {
              setActiveBomHeaderMenu(prev => (prev === col.key ? null : col.key));
              setActiveProdHeaderMenu(null);
            }}
            className="inline-flex items-center gap-1.5 cursor-pointer"
          >
            {col.filterType === 'search' ? (
              <Search
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  isActive || isMenuOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            ) : (
              <Filter
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  isActive || isMenuOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            )}
            <span className={cn("text-[12px] font-bold", isActive ? "text-blue-600" : "text-slate-700")}>
              {col.label}
            </span>
          </button>

          {col.sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setBomSortConfig(prev => {
                  if (prev?.key === col.key) {
                    if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
                    return null;
                  }
                  return { key: col.key, dir: 'asc' };
                });
              }}
              className="cursor-pointer p-0.5 hover:bg-slate-200/60 rounded"
              title="点击排序"
            >
              <SortTriangles activeDir={isSorted} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className={cn(
              "absolute top-full mt-1 z-30 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal",
              col.align === 'right' ? "right-2" : "left-2"
            )}
          >
            {col.filterType === 'search' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={currentVal}
                    onChange={e => {
                      setBomColFilters(prev => ({ ...prev, [col.key]: e.target.value }));
                      setBomPage(1);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveBomHeaderMenu(null);
                    }}
                    placeholder={`搜索${col.label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBomColFilters(prev => ({ ...prev, [col.key]: '' }));
                      setActiveBomHeaderMenu(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBomHeaderMenu(null)}
                    className="h-[24px] px-2.5 rounded bg-blue-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    确定
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setBomColFilters(prev => ({ ...prev, [col.key]: '' }));
                    setActiveBomHeaderMenu(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer",
                    !currentVal ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>全部</span>
                  {!currentVal && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <div className="max-h-[160px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {uniqueOptions.map(opt => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setBomColFilters(prev => ({ ...prev, [col.key]: opt }));
                          setBomPage(1);
                          setActiveBomHeaderMenu(null);
                        }}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer",
                          selected ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className="truncate">{opt}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </th>
    );
  };

  // Enrich production rows with seq and computed fields
  const enrichedProdRows = useMemo(() => {
    return detailData.materials.map((m, idx) => {
      const unitPrice = parseFloat(String(m.taxIncludedUnitPrice ?? '0')) || 0;
      const rowTotal = (Number(m.plannedQty) || 0) * unitPrice;
      return {
        ...m,
        seqNum: idx + 1,
        resolvedSalesOrder: m.source || m.salesOrder || detailData.salesOrder || '-',
        resolvedSalesOrderLine: m.lineNo || m.salesOrderLine || '1',
        resolvedProductCode: m.productCode || detailData.productCode || m.materialCode || '-',
        resolvedProductName: m.productName || detailData.productName || m.materialName || '-',
        resolvedProductCategory: m.productCategory || m.category || '成套设备',
        resolvedProductSpec: m.productSpec || detailData.specification || m.specification || '-',
        resolvedBomVersion: m.bomVersion || detailData.bomVersion || 'V1.0',
        resolvedMaterialCategory: m.materialCategory || m.category || '机加件',
        resolvedCurrentStock: m.currentStock ?? 8,
        unitPriceFormatted: unitPrice.toFixed(2),
        resolvedTaxRate: m.taxRate || `${taxRateNum}%`,
        rowTotalFormatted: rowTotal.toFixed(2),
        resolvedRemark: m.remark || '-'
      };
    });
  }, [detailData, taxRateNum]);

  const getProdFieldValue = (
    row: (typeof enrichedProdRows)[number],
    colKey: string
  ): string => {
    switch (colKey) {
      case 'seq':
        return String(row.seqNum);
      case 'salesOrder':
        return row.resolvedSalesOrder;
      case 'salesOrderLine':
        return row.resolvedSalesOrderLine;
      case 'productCode':
        return row.resolvedProductCode;
      case 'productName':
        return row.resolvedProductName;
      case 'productCategory':
        return row.resolvedProductCategory;
      case 'productSpec':
        return row.resolvedProductSpec;
      case 'bomVersion':
        return row.resolvedBomVersion;
      case 'materialCode':
        return row.materialCode || '';
      case 'materialName':
        return row.materialName || '';
      case 'category':
        return row.resolvedMaterialCategory;
      case 'specification':
        return row.specification || '';
      case 'unit':
        return row.unit || '';
      case 'currentStock':
        return String(row.resolvedCurrentStock);
      case 'plannedQty':
        return String(row.plannedQty ?? 0);
      case 'taxIncludedUnitPrice':
        return row.unitPriceFormatted;
      case 'taxRate':
        return row.resolvedTaxRate;
      case 'taxIncludedAmount':
        return row.rowTotalFormatted;
      case 'remark':
        return row.resolvedRemark;
      default:
        return '';
    }
  };

  const filteredAndSortedProdRows = useMemo(() => {
    const filtered = enrichedProdRows.filter(row => {
      for (const [colKey, filterVal] of Object.entries(prodColFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getProdFieldValue(row, colKey).toLowerCase();
        if (!cellVal.includes(trimmed)) return false;
      }
      return true;
    });

    if (!prodSortConfig) return filtered;
    const { key, dir } = prodSortConfig;
    return [...filtered].sort((a, b) => {
      if (
        key === 'seq' ||
        key === 'salesOrderLine' ||
        key === 'currentStock' ||
        key === 'plannedQty' ||
        key === 'taxIncludedUnitPrice' ||
        key === 'taxIncludedAmount'
      ) {
        const numA = parseFloat(getProdFieldValue(a, key)) || 0;
        const numB = parseFloat(getProdFieldValue(b, key)) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      const valA = getProdFieldValue(a, key);
      const valB = getProdFieldValue(b, key);
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [enrichedProdRows, prodColFilters, prodSortConfig]);

  const totalDetailProdQty = useMemo(
    () => filteredAndSortedProdRows.reduce((sum, row) => sum + (Number(row.plannedQty) || 0), 0),
    [filteredAndSortedProdRows]
  );

  const [prodPage, setProdPage] = useState<number>(1);
  const [prodPageSize, setProdPageSize] = useState<number>(10);
  const [prodJumpPage, setProdJumpPage] = useState<string>('1');
  const totalProdPages = Math.max(1, Math.ceil(filteredAndSortedProdRows.length / prodPageSize));
  const currentProdPage = Math.min(prodPage, totalProdPages);
  const paginatedProdRows = useMemo(
    () =>
      filteredAndSortedProdRows.slice(
        (currentProdPage - 1) * prodPageSize,
        currentProdPage * prodPageSize
      ),
    [filteredAndSortedProdRows, currentProdPage, prodPageSize]
  );

  const totalDetailBomQty = useMemo(
    () => filteredAndSortedBomItems.reduce((sum, item) => sum + (Number(item.standardUsage) || 0), 0),
    [filteredAndSortedBomItems]
  );

  const applicableProdCols = useMemo(
    () => prodCols.filter(c => !c.onlyFor || c.onlyFor === detailData.outsourcingType),
    [prodCols, detailData.outsourcingType]
  );
  const visibleProdCols = useMemo(
    () => applicableProdCols.filter(c => c.visible),
    [applicableProdCols]
  );

  const toggleProdColVisible = (key: string) => {
    setProdCols(prev => prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const selectAllProdCols = () => {
    setProdCols(prev =>
      prev.map(c => (!c.onlyFor || c.onlyFor === detailData.outsourcingType ? { ...c, visible: true } : c))
    );
  };

  const clearAllProdCols = () => {
    setProdCols(prev =>
      prev.map((c, idx) =>
        !c.onlyFor || c.onlyFor === detailData.outsourcingType ? { ...c, visible: idx === 0 } : c
      )
    );
  };

  const resetProdCols = () => {
    setProdCols(DEFAULT_PROD_COLS.map(c => ({ ...c })));
  };

  const moveProdCol = (key: string, direction: 'up' | 'down') => {
    setProdCols(prev => {
      const appKeys = prev
        .filter(c => !c.onlyFor || c.onlyFor === detailData.outsourcingType)
        .map(c => c.key);
      const appIdx = appKeys.indexOf(key);
      const targetAppIdx = direction === 'up' ? appIdx - 1 : appIdx + 1;
      if (appIdx === -1 || targetAppIdx < 0 || targetAppIdx >= appKeys.length) return prev;
      const targetKey = appKeys[targetAppIdx];
      const fromIdx = prev.findIndex(c => c.key === key);
      const toIdx = prev.findIndex(c => c.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const toggleProdColFixed = (key: string, side: 'left' | 'right') => {
    setProdCols(prev => {
      const index = prev.findIndex(c => c.key === key);
      if (index === -1) return prev;
      const next = [...prev];
      const item = { ...next[index] };
      const newFixed = item.fixed === side ? null : side;
      item.fixed = newFixed;
      next.splice(index, 1);
      if (newFixed === 'left') {
        next.unshift(item);
      } else if (newFixed === 'right') {
        next.push(item);
      } else {
        next.splice(index, 0, item);
      }
      return next;
    });
  };

  const renderProdFilterableTh = (col: ProdColConfigItem) => {
    const { key: colKey, label, type, sortable, align, widthClass } = col;
    const currentVal = prodColFilters[colKey] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeProdHeaderMenu === colKey;
    const isSorted = prodSortConfig?.key === colKey ? prodSortConfig.dir : null;

    const dynamicOpts = Array.from(
      new Set(enrichedProdRows.map(r => getProdFieldValue(r, colKey)).filter(Boolean))
    );

    return (
      <th
        key={colKey}
        onClick={e => e.stopPropagation()}
        className={cn(
          "px-3 border-r border-slate-200/60 font-bold text-slate-800 whitespace-nowrap relative select-none",
          widthClass,
          align === 'right' && "text-right",
          align === 'center' && "text-center"
        )}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 cursor-pointer group whitespace-nowrap",
            align === 'right' && "justify-end",
            align === 'center' && "justify-center"
          )}
        >
          <button
            type="button"
            onClick={() => {
              setActiveProdHeaderMenu(prev => (prev === colKey ? null : colKey));
              setActiveBomHeaderMenu(null);
            }}
            className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {type === 'search' ? (
              <Search
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isActive || isMenuOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            ) : (
              <Filter
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isActive || isMenuOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            )}
            <span className={cn("text-[12px] font-bold whitespace-nowrap", isActive ? "text-blue-600" : "text-slate-800")}>
              {label}
            </span>
          </button>

          {sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setProdSortConfig(prev => {
                  if (prev?.key === colKey) {
                    if (prev.dir === 'asc') return { key: colKey, dir: 'desc' };
                    return null;
                  }
                  return { key: colKey, dir: 'asc' };
                });
              }}
              className="cursor-pointer p-0.5 hover:bg-slate-200/60 rounded shrink-0"
              title="点击排序"
            >
              <SortTriangles activeDir={isSorted} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className={cn(
              "absolute top-full mt-1 z-30 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal",
              align === 'right' ? "right-2" : "left-2"
            )}
          >
            {type === 'search' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={currentVal}
                    onChange={e =>
                      setProdColFilters(prev => ({ ...prev, [colKey]: e.target.value }))
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveProdHeaderMenu(null);
                    }}
                    placeholder={`搜索${label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProdColFilters(prev => ({ ...prev, [colKey]: '' }));
                      setActiveProdHeaderMenu(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProdHeaderMenu(null)}
                    className="h-[24px] px-2.5 rounded bg-blue-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    确定
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProdColFilters(prev => ({ ...prev, [colKey]: '' }));
                    setActiveProdHeaderMenu(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer",
                    !currentVal ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>全部</span>
                  {!currentVal && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <div className="max-h-[160px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {dynamicOpts.map(opt => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setProdColFilters(prev => ({ ...prev, [colKey]: opt }));
                          setActiveProdHeaderMenu(null);
                        }}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer",
                          selected ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className="truncate">{opt}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </th>
    );
  };

  return (
    <div
      onClick={() => {
        setActiveProdHeaderMenu(null);
        setIsProdColConfigOpen(false);
        setActiveBomHeaderMenu(null);
        setIsBomColConfigOpen(false);
      }}
      className="flex flex-col h-full bg-[#f4f6f9] w-full overflow-hidden relative"
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Multi-Tab Navigation Bar */}
      <div className="h-[40px] bg-white border-b border-slate-200/80 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <Home className="w-3 h-3 text-blue-600" />
            <span>首页</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer">
            <Printer className="w-3 h-3 text-blue-600" />
            <span>打印模板</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer">
            <FileText className="w-3 h-3 text-blue-600" />
            <span>采购订单</span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>外协工单</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-500 bg-blue-50/70 text-blue-600 font-medium text-[12px] cursor-pointer shadow-2xs">
            <span>外协工单详情 {detailData.orderNo}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-100">
          <button className="p-1 hover:text-slate-600 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><LayoutGrid className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Main Content Container (与新增外协工单页面结构与高度一致) */}
      <div className="flex-1 min-h-0 p-3 pb-0 overflow-hidden flex flex-col">
        {/* Top White Sub-Header Card */}
        <div className="h-[52px] bg-white rounded-t-xl border border-slate-200/80 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer transition-colors shrink-0"
              title="返回列表"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[14px] font-bold text-slate-900 shrink-0">外协工单详情</span>
            <span className="text-[13px] text-blue-600 font-mono font-semibold shrink-0">
              {detailData.orderNo}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium border shrink-0",
                detailData.status === '进行中'
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : detailData.status === '已完成'
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : detailData.status === '待审核' || detailData.status === '待入库'
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : detailData.status === '审批驳回'
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              {detailData.status}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200/80 shrink-0">
              {detailData.outsourcingMethod}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium border shrink-0",
                detailData.outsourcingType === '整单外协'
                  ? "bg-amber-50 text-amber-600 border-amber-200/80"
                  : "bg-blue-50 text-blue-600 border-blue-200/80"
              )}
            >
              {detailData.outsourcingType}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(detailData.status === '草稿' || detailData.status === '审批驳回') && (
              <>
                <button
                  type="button"
                  onClick={() => onEditOrder?.(detailData.orderNo)}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated: OutsourcingOrderItem = {
                      ...detailData,
                      status: '待审核'
                    };
                    saveOutsourcingOrder(updated);
                    setDetailData(updated);
                    setToast('已提交审批，状态流转为待审核');
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="h-[34px] px-5 rounded-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium shadow-[0_2px_8px_rgba(59,130,246,0.3)] cursor-pointer transition-colors"
                >
                  提交审批
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextList = getOutsourcingOrders().filter(o => o.orderNo !== detailData.orderNo);
                    updateOutsourcingOrders(nextList);
                    onBack();
                  }}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  删除
                </button>
              </>
            )}

            {detailData.status === '进行中' && (
              <>
                {Number(detailData.productionProgress) === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated: OutsourcingOrderItem = {
                        ...detailData,
                        status: '草稿'
                      };
                      saveOutsourcingOrder(updated);
                      setDetailData(updated);
                      setToast('外协工单已反审批，状态流转为草稿');
                      setTimeout(() => setToast(null), 2500);
                    }}
                    className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                  >
                    反审批
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const updated: OutsourcingOrderItem = {
                      ...detailData,
                      status: '已作废'
                    };
                    saveOutsourcingOrder(updated);
                    setDetailData(updated);
                    setToast('外协工单已作废');
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  作废
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onBack}
              className="p-1 ml-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Body: Left Anchor Sidebar + Right Scrollable Detail Content */}
        <div className="flex-1 min-h-0 flex gap-3 pt-3 pb-3 overflow-hidden">
          {/* Left Anchor Navigation Sidebar */}
          <div
            className={cn(
              "h-full min-h-0 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shrink-0 transition-all duration-200 overflow-hidden",
              isSidebarCollapsed ? "w-[56px] p-2.5 items-center" : "w-[248px] p-3.5"
            )}
          >
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center w-full h-full min-h-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="展开导航"
                  className="w-8 h-8 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-slate-100 my-2.5 shrink-0" />
                <div className="space-y-2 flex flex-col items-center w-full flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  {[
                    { step: 1 as const, short: '基本', title: '基本信息' },
                    { step: 2 as const, short: '明细', title: detailData.outsourcingType === '整单外协' ? '生产与BOM明细' : '生产明细' },
                    { step: 3 as const, short: '费用', title: '外协费用明细' },
                    { step: 4 as const, short: '进度', title: '生产进度与报工链接' },
                    { step: 5 as const, short: '入库', title: '入库记录' }
                  ].map(item => (
                    <button
                      key={item.step}
                      type="button"
                      title={item.title}
                      onClick={e => {
                        e.stopPropagation();
                        scrollToStep(item.step);
                      }}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold cursor-pointer border shrink-0 transition-all",
                        anchorStep === item.step
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70"
                      )}
                    >
                      {item.short}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-[14px] font-bold text-slate-900">外协工单详情</h2>
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(true)}
                        title="收纳导航"
                        className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-500 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress Indicator Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5 mb-2.5 flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300 rounded-full"
                        style={{ width: `${(anchorStep / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Anchor Steps List (Scrollable if viewport is compact, never overflows sidebar) */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                    {[
                      { step: 1 as const, title: '基本信息' },
                      {
                        step: 2 as const,
                        title: detailData.outsourcingType === '整单外协' ? '生产与BOM明细' : '生产明细'
                      },
                      { step: 3 as const, title: '外协费用明细' },
                      {
                        step: 4 as const,
                        title: '生产进度与报工链接'
                      },
                      {
                        step: 5 as const,
                        title: '入库记录'
                      }
                    ].map(item => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          scrollToStep(item.step);
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center transition-all cursor-pointer border",
                          anchorStep === item.step
                            ? "bg-[#eef5ff] border-blue-200/80 shadow-2xs"
                            : "bg-white border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div
                          className={cn(
                            "text-[12.5px] font-bold truncate leading-tight",
                            anchorStep === item.step ? "text-blue-600" : "text-slate-800"
                          )}
                        >
                          {item.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Summary Boxes */}
                <div className="shrink-0 grid grid-cols-2 gap-2 pt-2.5 mt-2 border-t border-slate-100">
                  <div className="p-2 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">生产进度</div>
                    <div className="text-[16px] font-bold text-blue-600 mt-0.5 leading-tight">
                      {detailData.productionProgress}%
                    </div>
                  </div>
                  <div className="p-2 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">入库进度</div>
                    <div className="text-[16px] font-bold text-emerald-600 mt-0.5 leading-tight">
                      {detailData.receiptProgress}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Scrollable Detail Content */}
          <div
            ref={scrollContainerRef}
            onScroll={() => {
              if (!scrollContainerRef.current || programmaticScrollRef.current) return;
              const el = scrollContainerRef.current;
              const maxScroll = el.scrollHeight - el.clientHeight;
              if (maxScroll > 0 && el.scrollTop >= maxScroll - 24) {
                setAnchorStep(5);
                return;
              }
              const containerTop = el.getBoundingClientRect().top;
              const getTop = (r: React.RefObject<HTMLDivElement | null>) =>
                r.current ? r.current.getBoundingClientRect().top - containerTop : Infinity;
              const s2Top = getTop(step2Ref);
              const s3Top = getTop(step3Ref);
              const s4Top = getTop(step4Ref);
              const s5Top = getTop(step5Ref);
              if (s5Top <= 160) {
                setAnchorStep(5);
              } else if (s4Top <= 160) {
                setAnchorStep(4);
              } else if (s3Top <= 160) {
                setAnchorStep(3);
              } else if (s2Top <= 160) {
                setAnchorStep(2);
              } else {
                setAnchorStep(1);
              }
            }}
            className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-4 pr-1 pb-28 custom-scrollbar"
          >
          {/* Section 1: 基本信息 */}
          <div ref={step1Ref} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div
              className={cn(
                "bg-[#f8fafc] px-5 py-3.5 flex items-center justify-between",
                !isBasicCollapsed && "border-b border-slate-100"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h3 className="text-[14px] font-bold text-slate-900">基本信息</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBasicCollapsed(prev => !prev)}
                className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <span>{isBasicCollapsed ? '展开' : '收起'}</span>
                {isBasicCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

              {!isBasicCollapsed && (
                <div className="p-5 grid grid-cols-4 gap-x-8 gap-y-5">
                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">外协工单编码</div>
                    <div className="text-[13px] text-slate-900 font-mono">{detailData.orderNo}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">外协申请单</div>
                    <div className="text-[13px] text-blue-600 font-mono">
                      {detailData.outsourcingAppNo || '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">外协类型</div>
                    <div className="text-[13px] text-slate-900">{detailData.outsourcingType || '-'}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">外协方式</div>
                    <div className="text-[13px] text-slate-900">{detailData.outsourcingMethod || '-'}</div>
                  </div>

                  {detailData.outsourcingType === '工序外协' && (
                    <>
                      <div>
                        <div className="text-[12px] text-slate-400 mb-1.5">工艺路线</div>
                        <div className="text-[13px] text-slate-900">
                          {detailData.processRoute || '标准机加及表面处理工艺路线'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[12px] text-slate-400 mb-1.5">工序</div>
                        <div className="text-[13px] text-slate-900">
                          {processList.length > 0 ? processList.join(' / ') : '-'}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">需求日期</div>
                    <div className="text-[13px] text-slate-900 font-mono">{detailData.requiredDate || '-'}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">供应商</div>
                    <div className="text-[13px] text-slate-900">
                      {detailData.supplierName}
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">联系人</div>
                    <div className="text-[13px] text-slate-900">{detailData.contactPerson || '-'}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">联系电话</div>
                    <div className="text-[13px] text-slate-900 font-mono">{detailData.contactPhone || '-'}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">计划日期</div>
                    <div className="text-[13px] text-slate-900 font-mono">
                      {detailData.plannedStartDate || '-'} 至 {detailData.plannedDeliveryDate || '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">所属公司</div>
                    <div className="text-[13px] text-slate-900">{detailData.companyName || '智简工厂测试租户'}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-1.5">备注</div>
                    <div className="text-[13px] text-slate-900">{detailData.remark || '-'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: 生产明细 (Per-Column Filter/Search + Field Config Button) */}
            <div ref={step2Ref} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">
                    生产明细
                  </h3>
                </div>

                {/* 字段配置按钮与弹窗 */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProdColConfigOpen(prev => !prev);
                      setIsBomColConfigOpen(false);
                    }}
                    title="字段配置"
                    className={cn(
                      "w-[32px] h-[32px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors",
                      isProdColConfigOpen
                        ? "bg-blue-50 border-blue-400 text-blue-600"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
                  </button>

                  {isProdColConfigOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-40 flex flex-col overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[13px] font-bold text-slate-900">显示字段</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={selectAllProdCols}
                            className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                          >
                            全选
                          </button>
                          <button
                            type="button"
                            onClick={clearAllProdCols}
                            className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                          >
                            清空
                          </button>
                        </div>
                      </div>

                      {/* Column List */}
                      <div className="max-h-[300px] overflow-y-auto px-3 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                        {applicableProdCols.map((col, idx) => (
                          <div
                            key={col.key}
                            draggable
                            onDragStart={() => setDraggedProdColIdx(idx)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => {
                              if (draggedProdColIdx === null || draggedProdColIdx === idx) return;
                              const draggedKey = applicableProdCols[draggedProdColIdx]?.key;
                              const targetKey = col.key;
                              if (!draggedKey || draggedKey === targetKey) return;
                              setProdCols(prev => {
                                const fromIdx = prev.findIndex(c => c.key === draggedKey);
                                const toIdx = prev.findIndex(c => c.key === targetKey);
                                if (fromIdx === -1 || toIdx === -1) return prev;
                                const next = [...prev];
                                const [moved] = next.splice(fromIdx, 1);
                                next.splice(toIdx, 0, moved);
                                return next;
                              });
                              setDraggedProdColIdx(null);
                            }}
                            className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-50/70 rounded-lg transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => toggleProdColVisible(col.key)}
                              className="flex items-center gap-2.5 text-left cursor-pointer"
                            >
                              <span
                                className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0",
                                  col.visible
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "bg-white border-slate-300 text-transparent"
                                )}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span
                                className={cn(
                                  "text-[13px] font-medium",
                                  col.visible ? "text-blue-600" : "text-slate-600"
                                )}
                              >
                                {col.label}
                              </span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveProdCol(col.key, 'up')}
                                title="上移"
                                className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === applicableProdCols.length - 1}
                                onClick={() => moveProdCol(col.key, 'down')}
                                title="下移"
                                className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleProdColFixed(col.key, 'left')}
                                title="置顶到最左"
                                className={cn(
                                  "w-[22px] h-[22px] rounded border flex items-center justify-center text-[11px] cursor-pointer transition-colors",
                                  col.fixed === 'left'
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                左
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleProdColFixed(col.key, 'right')}
                                title="置底到最右"
                                className={cn(
                                  "w-[22px] h-[22px] rounded border flex items-center justify-center text-[11px] cursor-pointer transition-colors",
                                  col.fixed === 'right'
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                右
                              </button>
                              <span
                                className="w-[20px] h-[22px] flex items-center justify-center text-slate-400 cursor-grab active:cursor-grabbing"
                                title="拖拽排序"
                              >
                                <Move className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white">
                        <button
                          type="button"
                          onClick={() => setIsProdColConfigOpen(false)}
                          className="h-[32px] px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium cursor-pointer transition-colors"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={resetProdCols}
                          className="h-[32px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium cursor-pointer transition-colors"
                        >
                          重置
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-200/70 rounded-lg overflow-x-auto custom-scrollbar">
                <table className="w-max min-w-full border-collapse text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                    <tr className="h-[40px]">
                      {visibleProdCols.map(col => renderProdFilterableTh(col))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedProdRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, visibleProdCols.length)}
                          className="h-[64px] text-center text-slate-400"
                        >
                          暂无匹配的生产明细记录
                        </td>
                      </tr>
                    ) : (
                      paginatedProdRows.map(row => {
                        const isSelectedForBom =
                          detailData.outsourcingType === '整单外协' &&
                          activeBomMaterial?.id === row.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => {
                              if (detailData.outsourcingType === '整单外协') {
                                setSelectedBomMaterialId(prev => (prev === row.id ? null : row.id));
                                setBomPage(1);
                                setBomJumpPage('1');
                              }
                            }}
                            className={cn(
                              "h-[42px] transition-colors",
                              detailData.outsourcingType === '整单外协' && "cursor-pointer",
                              isSelectedForBom ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50/70"
                            )}
                          >
                            {visibleProdCols.map(col => {
                              switch (col.key) {
                                case 'seq':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-500 font-mono whitespace-nowrap"
                                    >
                                      {row.seqNum}
                                    </td>
                                  );
                                case 'salesOrder':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center font-mono whitespace-nowrap">
                                      {row.resolvedSalesOrder}
                                    </td>
                                  );
                                case 'salesOrderLine':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono whitespace-nowrap"
                                    >
                                      {row.resolvedSalesOrderLine}
                                    </td>
                                  );
                                case 'productCode':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 font-mono text-slate-800 whitespace-nowrap">
                                      {row.resolvedProductCode}
                                    </td>
                                  );
                                case 'productName':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-slate-800 whitespace-nowrap">
                                      {row.resolvedProductName}
                                    </td>
                                  );
                                case 'productCategory':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                      {row.resolvedProductCategory}
                                    </td>
                                  );
                                case 'productSpec':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center font-mono whitespace-nowrap">
                                      {row.resolvedProductSpec}
                                    </td>
                                  );
                                case 'bomVersion':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                      {row.resolvedBomVersion}
                                    </td>
                                  );
                                case 'materialCode':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 font-mono text-slate-800 whitespace-nowrap"
                                    >
                                      {row.materialCode}
                                    </td>
                                  );
                                case 'materialName':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 font-medium text-slate-900 whitespace-nowrap"
                                    >
                                      {row.materialName}
                                    </td>
                                  );
                                case 'category':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                      {row.resolvedMaterialCategory}
                                    </td>
                                  );
                                case 'specification':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center font-mono whitespace-nowrap">
                                      {row.specification}
                                    </td>
                                  );
                                case 'unit':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                      {row.unit}
                                    </td>
                                  );
                                case 'currentStock':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center font-semibold text-emerald-600 whitespace-nowrap">
                                      {row.resolvedCurrentStock}
                                    </td>
                                  );
                                case 'plannedQty':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-bold text-slate-900 whitespace-nowrap"
                                    >
                                      {row.plannedQty}
                                    </td>
                                  );
                                case 'taxIncludedUnitPrice':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-right font-mono whitespace-nowrap"
                                    >
                                      ¥{row.unitPriceFormatted}
                                    </td>
                                  );
                                case 'taxRate':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                      {row.resolvedTaxRate}
                                    </td>
                                  );
                                case 'taxIncludedAmount':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-right font-mono font-bold text-blue-600 whitespace-nowrap"
                                    >
                                      ¥{row.rowTotalFormatted}
                                    </td>
                                  );
                                case 'remark':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                                      {row.resolvedRemark}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 生产明细 分页栏（左下角展示共几项和总数量） */}
              <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-slate-600 select-none">
                <div className="flex items-center gap-5">
                  <div>
                    <span className="text-slate-500">共 {filteredAndSortedProdRows.length} 项</span>
                  </div>
                  <div>
                    <span className="text-slate-500">总数量：</span>
                    <span className="font-bold text-slate-900">{totalDetailProdQty}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <select
                      value={prodPageSize}
                      onChange={e => {
                        const newSize = Number(e.target.value);
                        setProdPageSize(newSize);
                        setProdPage(1);
                        setProdJumpPage('1');
                      }}
                      className="h-[28px] pl-2.5 pr-6 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value={10}>10条/页</option>
                      <option value={20}>20条/页</option>
                      <option value={50}>50条/页</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentProdPage <= 1}
                      onClick={() => {
                        const prev = Math.max(1, currentProdPage - 1);
                        setProdPage(prev);
                        setProdJumpPage(String(prev));
                      }}
                      className={cn(
                        "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                        currentProdPage <= 1
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                      )}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {Array.from({ length: totalProdPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setProdPage(p);
                          setProdJumpPage(String(p));
                        }}
                        className={cn(
                          "min-w-[28px] h-[28px] px-2 rounded-md border text-[12px] font-medium transition-colors cursor-pointer",
                          currentProdPage === p
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentProdPage >= totalProdPages}
                      onClick={() => {
                        const next = Math.min(totalProdPages, currentProdPage + 1);
                        setProdPage(next);
                        setProdJumpPage(String(next));
                      }}
                      className={cn(
                        "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                        currentProdPage >= totalProdPages
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                      )}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span>前往</span>
                    <input
                      type="text"
                      value={prodJumpPage}
                      onChange={e => setProdJumpPage(e.target.value)}
                      onBlur={() => {
                        const num = parseInt(prodJumpPage, 10);
                        if (!isNaN(num)) {
                          const target = Math.min(Math.max(1, num), totalProdPages);
                          setProdPage(target);
                          setProdJumpPage(String(target));
                        } else {
                          setProdJumpPage(String(currentProdPage));
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const num = parseInt(prodJumpPage, 10);
                          if (!isNaN(num)) {
                            const target = Math.min(Math.max(1, num), totalProdPages);
                            setProdPage(target);
                            setProdJumpPage(String(target));
                          } else {
                            setProdJumpPage(String(currentProdPage));
                          }
                        }
                      }}
                      className="w-[42px] h-[28px] text-center rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <span>页</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: BOM明细 (Only shown when outsourcingType === '整单外协', synced with OutsourcingWizard) */}
            {detailData.outsourcingType === '整单外协' && (
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[14px] font-bold text-slate-900">BOM明细</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {Object.values(bomColFilters).some(v => String(v || '').trim() !== '') && (
                      <button
                        type="button"
                        onClick={() => setBomColFilters({})}
                        className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer mr-1"
                      >
                        清空列筛选
                      </button>
                    )}

                    {/* BOM明细字段配置按钮与弹窗 (与新增页面同步) */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBomColConfigOpen(prev => !prev);
                          setIsProdColConfigOpen(false);
                        }}
                        title="字段配置"
                        className={cn(
                          "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors cursor-pointer",
                          isBomColConfigOpen
                            ? "border-blue-500 bg-blue-100/80 text-blue-600"
                            : "border-blue-400 bg-blue-50/70 hover:bg-blue-100/60 text-blue-600"
                        )}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {isBomColConfigOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-[310px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-[12px] select-none">
                          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[13px]">显示字段</span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={handleSelectAllBomColumns}
                                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                              >
                                全选
                              </button>
                              <button
                                type="button"
                                onClick={handleClearAllBomColumns}
                                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                              >
                                清空
                              </button>
                            </div>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto px-2 py-1.5 divide-y divide-slate-50 custom-scrollbar">
                            {bomColumns.map((col, idx) => (
                              <div
                                key={col.key}
                                draggable
                                onDragStart={() => setDraggedBomColIdx(idx)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDropBomColumn(idx)}
                                className={cn(
                                  "flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors",
                                  draggedBomColIdx === idx && "opacity-50 bg-blue-50/40"
                                )}
                              >
                                <div
                                  onClick={() => toggleBomColumnVisible(col.key)}
                                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 py-0.5"
                                >
                                  <span
                                    className={cn(
                                      "w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0",
                                      col.visible
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-slate-300 bg-white"
                                    )}
                                  >
                                    {col.visible && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span className="text-[12px] text-slate-700 truncate">{col.label}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveBomColumn(idx, 'left')}
                                    title="向左调整顺序"
                                    className={cn(
                                      "w-5 h-5 rounded text-[11px] font-medium flex items-center justify-center transition-colors",
                                      idx === 0
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                        : "bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 cursor-pointer"
                                    )}
                                  >
                                    左
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === bomColumns.length - 1}
                                    onClick={() => moveBomColumn(idx, 'right')}
                                    title="向右调整顺序"
                                    className={cn(
                                      "w-5 h-5 rounded text-[11px] font-medium flex items-center justify-center transition-colors",
                                      idx === bomColumns.length - 1
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                        : "bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 cursor-pointer"
                                    )}
                                  >
                                    右
                                  </button>
                                  <span
                                    title="拖拽调整顺序"
                                    className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                                  >
                                    <Move className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-xl">
                            <button
                              type="button"
                              onClick={() => setIsBomColConfigOpen(false)}
                              className="h-[28px] px-3.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium cursor-pointer transition-colors"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={handleResetBomColumns}
                              className="h-[28px] px-3.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer transition-colors"
                            >
                              重置
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200/80 rounded-lg overflow-x-auto custom-scrollbar">
                  <table className="w-max min-w-full border-collapse text-left text-[12px] whitespace-nowrap">
                    <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-700 font-bold">
                      <tr className="h-[38px]">
                        {visibleBomColumns.map((col, cIdx) => renderBomFilterableTh(col, cIdx))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {visibleBomColumns.length === 0 ? (
                        <tr>
                          <td className="h-[160px] px-4 text-center text-slate-400">
                            暂无显示字段，请在右上角「字段配置」中勾选需要展示的字段
                          </td>
                        </tr>
                      ) : paginatedSectionBomItems.length === 0 ? (
                        <tr>
                          <td colSpan={visibleBomColumns.length} className="h-[160px] text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="text-[13px] text-slate-700 font-medium">暂无匹配的BOM明细</div>
                              <div className="text-[12px] text-slate-400 mt-2">
                                请调整或清空列筛选条件。
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedSectionBomItems.map((bom, bIdx) => {
                          const globalBomIdx = (currentBomPage - 1) * bomPageSize + bIdx;
                          return (
                            <tr key={bom.id} className="h-[42px] hover:bg-slate-50/80">
                              {visibleBomColumns.map((col, cIdx) => (
                                <td
                                  key={col.key}
                                  className={cn(
                                    "px-3",
                                    cIdx < visibleBomColumns.length - 1 && "border-r border-slate-100",
                                    col.align === 'right' && "text-right",
                                    col.align === 'center' && "text-center"
                                  )}
                                >
                                  {renderBomCellContent(bom, globalBomIdx, col.key)}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOM明细 分页栏（左下角展示共几项和总数量） */}
                <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-slate-600 select-none">
                  <div className="flex items-center gap-5">
                    <div>
                      <span className="text-slate-500">共 {filteredAndSortedBomItems.length} 项</span>
                    </div>
                    <div>
                      <span className="text-slate-500">总数量：</span>
                      <span className="font-bold text-slate-900">{totalDetailBomQty}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <select
                        value={bomPageSize}
                        onChange={e => {
                          const newSize = Number(e.target.value);
                          setBomPageSize(newSize);
                          setBomPage(1);
                          setBomJumpPage('1');
                        }}
                        className="h-[28px] pl-2.5 pr-6 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value={10}>10条/页</option>
                        <option value={20}>20条/页</option>
                        <option value={50}>50条/页</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentBomPage <= 1}
                        onClick={() => {
                          const prev = Math.max(1, currentBomPage - 1);
                          setBomPage(prev);
                          setBomJumpPage(String(prev));
                        }}
                        className={cn(
                          "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                          currentBomPage <= 1
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                        )}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalBomPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setBomPage(p);
                            setBomJumpPage(String(p));
                          }}
                          className={cn(
                            "min-w-[28px] h-[28px] px-2 rounded-md border text-[12px] font-medium transition-colors cursor-pointer",
                            currentBomPage === p
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600"
                          )}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={currentBomPage >= totalBomPages}
                        onClick={() => {
                          const next = Math.min(totalBomPages, currentBomPage + 1);
                          setBomPage(next);
                          setBomJumpPage(String(next));
                        }}
                        className={cn(
                          "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                          currentBomPage >= totalBomPages
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                        )}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>前往</span>
                      <input
                        type="text"
                        value={bomJumpPage}
                        onChange={e => setBomJumpPage(e.target.value)}
                        onBlur={() => {
                          const num = parseInt(bomJumpPage, 10);
                          if (!isNaN(num)) {
                            const target = Math.min(Math.max(1, num), totalBomPages);
                            setBomPage(target);
                            setBomJumpPage(String(target));
                          } else {
                            setBomJumpPage(String(currentBomPage));
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const num = parseInt(bomJumpPage, 10);
                            if (!isNaN(num)) {
                              const target = Math.min(Math.max(1, num), totalBomPages);
                              setBomPage(target);
                              setBomJumpPage(String(target));
                            } else {
                              setBomJumpPage(String(currentBomPage));
                            }
                          }
                        }}
                        className="w-[42px] h-[28px] text-center rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                      <span>页</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: 外协费用明细 (与新增页面布局同步，采用详情页展示信息样式) */}
            <div ref={step3Ref} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h3 className="text-[14px] font-bold text-slate-900">外协费用明细</h3>
              </div>

              <div className="grid grid-cols-4 gap-x-8 items-start">
                {/* 合计价格 */}
                <div>
                  <div className="text-[12px] text-slate-400 mb-1.5">合计价格</div>
                  <div className="text-[13px] text-slate-900 font-mono">
                    ¥{totalInclTax.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* 优惠率(%) */}
                <div>
                  <div className="text-[12px] text-slate-400 mb-1.5">优惠率(%)</div>
                  <div className="text-[13px] text-slate-900 font-mono">0.00%</div>
                </div>

                {/* 定金金额 */}
                <div>
                  <div className="text-[12px] text-slate-400 mb-1.5">定金金额</div>
                  <div className="text-[13px] text-slate-900 font-mono">¥0.00</div>
                </div>

                {/* 右侧金额汇总展示：优惠金额 / 优惠后金额 / 待付金额 */}
                <div className="flex flex-col items-end justify-center text-right select-none">
                  <div className="text-[12px] font-semibold text-red-500">
                    优惠金额：¥0.00
                  </div>
                  <div className="flex items-baseline justify-end gap-1.5 mt-1">
                    <span className="text-[13px] font-medium text-slate-900">优惠后金额：</span>
                    <span className="text-[20px] font-bold text-blue-600 leading-tight">
                      ¥{totalInclTax.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    待付金额：¥{totalInclTax.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* 费用说明 */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-[12px] text-slate-400 mb-1.5">费用说明</div>
                <div className="text-[13px] text-slate-900 whitespace-pre-wrap">
                  {detailData.feeDescription || '-'}
                </div>
              </div>
            </div>

            {/* Section 4: 生产进度与报工链接 */}
            <div ref={step4Ref} className="space-y-4">
              {/* 生产进度 Summary Module */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-[12px] text-slate-500">
                <span>生产进度</span>
                <span className="font-bold text-blue-600 text-[13px]">{detailData.productionProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5 mb-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${detailData.productionProgress}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>开始：{detailData.plannedStartDate}</span>
                <span>交期：{detailData.plannedDeliveryDate}</span>
              </div>
            </div>

            {/* 承包商安全链接 Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[14px] font-bold text-slate-900">承包商报工链接</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    链接状态与工单状态同步，重置链接不会改变已锁定的报工方式（当前整体进度 {detailData.productionProgress}%，距离完成还差 {remainingProgress}%）。
                  </p>
                </div>

                <span
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium",
                    linkActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {linkActive ? '链接有效' : '已停用'}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-[12px] text-slate-500 mb-2">访问链接</div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex-1 min-w-[320px] max-w-[560px] h-[34px] px-3.5 rounded-lg border border-slate-200/80 bg-[#f8fafc] flex items-center text-[12px] text-slate-800 font-mono truncate">
                    {linkUrl}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(linkUrl);
                      showToast('报工链接已复制到剪贴板');
                    }}
                    className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>复制链接</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="h-[34px] px-3 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 font-medium text-[12px] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>打开页面</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.random().toString(16).slice(2, 10);
                      setLinkUrl(`https://supercodezj.com/zjgc/#/outsourcing-report?token=${rand}d9dc4139a23aff76ae3c41b`);
                      setLinkActive(true);
                      showToast('承包商报工链接已重置');
                    }}
                    className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>重置链接</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLinkActive(prev => !prev);
                      showToast(linkActive ? '报工链接已停用' : '报工链接已重新启用');
                    }}
                    className="h-[34px] px-3 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100/70 text-red-500 text-[12px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>{linkActive ? '停用' : '启用'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-6 mt-3.5 text-[12px] text-slate-500">
                  <span>
                    报工方式：<strong className="text-slate-900 font-bold">{detailData.securityLink.reportMethod}</strong>
                  </span>
                  <span>生成时间：{detailData.securityLink.createTime}</span>
                  <span>最近访问：{detailData.securityLink.lastVisit}</span>
                </div>
              </div>
            </div>

            {/* 生产进度记录 Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">生产进度记录</h3>
                </div>
                <span className="text-[12px] text-slate-500">
                  共 {detailData.progressRecords.length} 条
                </span>
              </div>

              <div className="border border-slate-200/70 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                    <tr className="h-[40px]">
                      <th className="px-4 border-r border-slate-100">提交时间</th>
                      <th className="px-4 border-r border-slate-100">报工方式</th>
                      <th className="px-4 border-r border-slate-100">本次报工</th>
                      <th className="px-4 border-r border-slate-100">提交前</th>
                      <th className="px-4 border-r border-slate-100">提交后</th>
                      <th className="px-4 border-r border-slate-100">提交人</th>
                      <th className="px-4">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detailData.progressRecords.length === 0 ? (
                      <tr className="h-[64px]">
                        <td colSpan={7} className="text-center text-slate-400">
                          暂无承包商报工记录
                        </td>
                      </tr>
                    ) : (
                      detailData.progressRecords.map(rec => (
                        <tr key={rec.id} className="h-[42px] hover:bg-slate-50/70">
                          <td className="px-4 border-r border-slate-100 font-mono text-slate-600">{rec.submitTime}</td>
                          <td className="px-4 border-r border-slate-100">{rec.reportMethod}</td>
                          <td className="px-4 border-r border-slate-100 font-bold text-blue-600">{rec.currentReport}</td>
                          <td className="px-4 border-r border-slate-100 text-slate-600">{rec.beforeSubmit}</td>
                          <td className="px-4 border-r border-slate-100 font-medium text-slate-900">{rec.afterSubmit}</td>
                          <td className="px-4 border-r border-slate-100">{rec.submitter}</td>
                          <td className="px-4 text-slate-500">{rec.remark}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 5: 关联入库记录 */}
          <div ref={step5Ref} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[14px] font-bold text-slate-900">关联入库记录</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    当前入库 {detailData.validReceiptQty} / {detailData.plannedQty} {detailData.unit}（入库进度 {detailData.receiptProgress}%）。
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/70 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                    <tr className="h-[40px]">
                      <th className="px-4 border-r border-slate-100">入库单号</th>
                      <th className="px-4 border-r border-slate-100">入库日期</th>
                      <th className="px-4 border-r border-slate-100">入库仓库</th>
                      <th className="px-4 border-r border-slate-100 text-right">入库数量</th>
                      <th className="px-4 border-r border-slate-100">入库进度</th>
                      <th className="px-4 border-r border-slate-100">状态</th>
                      <th className="px-4">入库人</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detailData.receiptRecords.length === 0 ? (
                      <tr className="h-[64px]">
                        <td colSpan={7} className="text-center text-slate-400">
                          暂无关联入库记录
                        </td>
                      </tr>
                    ) : (
                      detailData.receiptRecords.map(r => {
                        const rowProgress =
                          detailData.plannedQty > 0
                            ? Math.min(100, Math.round((r.validQty / detailData.plannedQty) * 100))
                            : detailData.receiptProgress;
                        return (
                          <tr key={r.id} className="h-[42px] hover:bg-slate-50/70">
                            <td className="px-4 border-r border-slate-100 font-mono text-blue-600">{r.receiptNo}</td>
                            <td className="px-4 border-r border-slate-100 font-mono">{r.receiptDate}</td>
                            <td className="px-4 border-r border-slate-100">{r.warehouse}</td>
                            <td className="px-4 border-r border-slate-100 text-right font-bold">{r.validQty}</td>
                            <td className="px-4 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="w-[88px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      rowProgress >= 100 ? "bg-emerald-500" : "bg-blue-600"
                                    )}
                                    style={{ width: `${rowProgress}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-slate-700 w-8">
                                  {rowProgress}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 border-r border-slate-100">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[11px] font-medium">
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4">{r.operator}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Footer */}
      <div className="h-[50px] bg-white border-t border-slate-200/80 px-6 flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium shadow-2xs cursor-pointer transition-colors"
        >
          关闭
        </button>
      </div>

      {/* 承包商报工页面弹窗 */}
      <ContractorReportModal
        open={isReportModalOpen}
        order={detailData}
        onClose={() => setIsReportModalOpen(false)}
        onUpdated={updated => setDetailData(updated)}
      />
    </div>
  );
}
