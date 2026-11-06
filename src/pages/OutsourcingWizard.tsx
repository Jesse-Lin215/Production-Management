import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Home, RefreshCw, LayoutGrid, Search,
  Plus, Settings, HelpCircle, Calendar, X, Cpu, CheckSquare, Trash2, CheckCircle2,
  SlidersHorizontal, Move, Check, Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  OutsourcingOrderItem,
  OutsourcingMaterialItem,
  OutsourcingApplicationItem,
  OutsourcingType,
  OutsourcingMethod,
  OutsourcingPriority,
  PRODUCT_OPTIONS,
  SUPPLIER_OPTIONS,
  OUTSOURCING_PROCESS_OPTIONS,
  PRODUCTION_ORDER_OPTIONS,
  getOutsourcingOrderByNo,
  saveOutsourcingOrder,
  getOutsourcingApplications
} from '../outsourcingStore';
import SalesOrderSelectModal, {
  SalesOrderModalMaterialItem,
  ONGOING_SALES_ORDERS,
  APPLICATION_MATERIAL_TEMPLATES
} from '../components/SalesOrderSelectModal';
import OutsourcingAppSelectModal from '../components/OutsourcingAppSelectModal';

const PROCESS_ROUTE_OPTIONS = [
  {
    code: 'PR-2026-001',
    name: '标准机加及表面处理工艺路线',
    processes: ['CNC粗加工', '五轴精雕', '精密线割', '热处理淬火', '表面阳极氧化']
  },
  {
    code: 'PR-2026-002',
    name: '钣金成型与喷涂外协工艺路线',
    processes: ['激光切割外协', '钣金折弯外协', '整机机架焊接外协', '表面喷涂']
  },
  {
    code: 'PR-2026-003',
    name: '换边机核心部件外协工艺路线',
    processes: ['激光切割外协', '钣金折弯外协', 'CNC粗加工', '表面阳极氧化', '表面喷涂']
  },
  {
    code: 'PR-2026-004',
    name: '通用外协加工工艺路线',
    processes: OUTSOURCING_PROCESS_OPTIONS
  }
];

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

export type BomColumnKey =
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

export interface BomColumnConfig {
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
  { key: 'remark', label: '备注', visible: true, align: 'left', filterType: 'search' },
];

export type ProductColumnKey =
  | 'salesOrder'
  | 'salesOrderLine'
  | 'productCode'
  | 'productName'
  | 'productCategory'
  | 'productSpec'
  | 'bomVersion'
  | 'materialCode'
  | 'materialName'
  | 'category'
  | 'specification'
  | 'unit'
  | 'currentStock'
  | 'plannedQty'
  | 'taxExcludedUnitPrice'
  | 'taxIncludedUnitPrice'
  | 'taxRate'
  | 'taxIncludedTotal'
  | 'taxExcludedTotal'
  | 'remark';

export interface ProductColumnConfig {
  key: ProductColumnKey;
  label: string;
  visible: boolean;
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  widthClass: string;
  onlyFor?: OutsourcingType;
  filterType?: 'search' | 'filter';
  sortable?: boolean;
}

const DEFAULT_PRODUCT_COLUMNS: ProductColumnConfig[] = [
  { key: 'salesOrder', label: '销售订单号', visible: true, align: 'center', widthClass: 'min-w-[160px]', filterType: 'search', sortable: true },
  { key: 'salesOrderLine', label: '项次', visible: true, align: 'center', widthClass: 'min-w-[86px]', filterType: 'search', sortable: true },
  { key: 'productCode', label: '产品编码', visible: true, align: 'left', widthClass: 'min-w-[150px]', filterType: 'search', sortable: true },
  { key: 'productName', label: '产品名称', visible: true, align: 'left', widthClass: 'min-w-[170px]', filterType: 'search' },
  { key: 'productCategory', label: '产品分类', visible: true, align: 'center', widthClass: 'min-w-[120px]', filterType: 'filter' },
  { key: 'productSpec', label: '产品规格', visible: true, align: 'center', widthClass: 'min-w-[160px]', filterType: 'search' },
  { key: 'bomVersion', label: 'BOM版本', visible: true, align: 'center', widthClass: 'min-w-[110px]', filterType: 'filter' },
  { key: 'materialCode', label: '物料编码', visible: true, align: 'left', widthClass: 'min-w-[160px]', onlyFor: '工序外协', filterType: 'search', sortable: true },
  { key: 'materialName', label: '物料名称', visible: true, align: 'left', widthClass: 'min-w-[190px]', onlyFor: '工序外协', filterType: 'search' },
  { key: 'category', label: '物料分类', visible: true, align: 'center', widthClass: 'min-w-[120px]', onlyFor: '工序外协', filterType: 'filter' },
  { key: 'specification', label: '规格', visible: true, align: 'center', widthClass: 'min-w-[160px]', onlyFor: '工序外协', filterType: 'search' },
  { key: 'unit', label: '单位', visible: true, align: 'center', widthClass: 'min-w-[90px]', filterType: 'filter' },
  { key: 'currentStock', label: '当前库存', visible: true, align: 'center', widthClass: 'min-w-[110px]', filterType: 'search', sortable: true },
  { key: 'plannedQty', label: '计划数量', visible: true, required: true, align: 'center', widthClass: 'min-w-[120px]', filterType: 'search', sortable: true },
  { key: 'taxExcludedUnitPrice', label: '未税单价', visible: true, align: 'center', widthClass: 'min-w-[110px]', filterType: 'search', sortable: true },
  { key: 'taxIncludedUnitPrice', label: '含税单价', visible: true, required: true, align: 'center', widthClass: 'min-w-[130px]', filterType: 'search', sortable: true },
  { key: 'taxRate', label: '税率', visible: true, align: 'center', widthClass: 'min-w-[95px]', filterType: 'filter' },
  { key: 'taxIncludedTotal', label: '含税金额', visible: true, align: 'center', widthClass: 'min-w-[110px]', filterType: 'search', sortable: true },
  { key: 'taxExcludedTotal', label: '未税金额', visible: true, align: 'center', widthClass: 'min-w-[110px]', filterType: 'search', sortable: true },
  { key: 'remark', label: '备注', visible: true, align: 'center', widthClass: 'min-w-[180px]', filterType: 'search' },
];

function WizardSortTriangles({ activeDir }: { activeDir?: 'asc' | 'desc' | null }) {
  return (
    <span className="inline-flex flex-col leading-none ml-0.5 text-[8px]">
      <span className={cn("leading-[7px]", activeDir === 'asc' ? "text-blue-600" : "text-slate-300")}>▲</span>
      <span className={cn("leading-[7px]", activeDir === 'desc' ? "text-blue-600" : "text-slate-300")}>▼</span>
    </span>
  );
}

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

interface OutsourcingWizardProps {
  editOrderNo?: string | null;
  initialAppNo?: string | null;
  onBack: () => void;
  onSaved?: (orderNo: string) => void;
  onNavigateOrders?: () => void;
}

export default function OutsourcingWizard({
  editOrderNo,
  initialAppNo,
  onBack,
  onSaved,
  onNavigateOrders
}: OutsourcingWizardProps) {
  const existingOrder = editOrderNo ? getOutsourcingOrderByNo(editOrderNo) : undefined;

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState<boolean>(false);
  const [orderNo] = useState<string>(existingOrder?.orderNo || 'WXGD-202610230001');
  const [outsourcingType, setOutsourcingType] = useState<OutsourcingType>(existingOrder?.outsourcingType || '工序外协');
  const [outsourcingMethod, setOutsourcingMethod] = useState<OutsourcingMethod>(existingOrder?.outsourcingMethod || '包工包料');
  const [moNo, setMoNo] = useState<string>(existingOrder?.moNo && existingOrder.moNo !== '-' && existingOrder.moNo !== '--' ? existingOrder.moNo : '');
  const [showMoDropdown, setShowMoDropdown] = useState<boolean>(false);
  const [outsourcingAppNo, setOutsourcingAppNo] = useState<string>(existingOrder?.outsourcingAppNo && existingOrder.outsourcingAppNo !== '-' ? existingOrder.outsourcingAppNo : '');
  const [isAppModalOpen, setIsAppModalOpen] = useState<boolean>(false);
  const [processRoute, setProcessRoute] = useState<string>(() => {
    if (existingOrder?.processRoute && existingOrder.processRoute !== '--') {
      return existingOrder.processRoute;
    }
    if (existingOrder?.outsourcingAppNo) {
      const matchedApp = getOutsourcingApplications().find(
        a => a.applicationNo === existingOrder.outsourcingAppNo
      );
      if (matchedApp?.processRoute) {
        return matchedApp.processRoute;
      }
    }
    return '标准机加及表面处理工艺路线';
  });
  const [processes, setProcesses] = useState<string[]>(() => {
    if (existingOrder?.processes && existingOrder.processes.length > 0) {
      return existingOrder.processes;
    }
    if (existingOrder?.processName && existingOrder.processName !== '--') {
      return existingOrder.processName.split('、');
    }
    if (existingOrder?.outsourcingAppNo) {
      const matchedApp = getOutsourcingApplications().find(
        a => a.applicationNo === existingOrder.outsourcingAppNo
      );
      if (matchedApp?.processes && matchedApp.processes.length > 0) {
        return matchedApp.processes;
      }
    }
    return ['表面阳极氧化'];
  });
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState<boolean>(false);
  const [processName, setProcessName] = useState<string>(existingOrder?.processName && existingOrder.processName !== '--' ? existingOrder.processName : '');
  const [salesOrder, setSalesOrder] = useState<string>(existingOrder?.salesOrder && existingOrder.salesOrder !== '-' && existingOrder.salesOrder !== '--' ? existingOrder.salesOrder : '');
  const [salesOrderLine, setSalesOrderLine] = useState<string>(existingOrder?.salesOrderLine || '');
  const [isSalesOrderModalOpen, setIsSalesOrderModalOpen] = useState<boolean>(false);
  const [selectedProductCode, setSelectedProductCode] = useState<string>(existingOrder ? existingOrder.productCode : '');
  const [bomVersion, setBomVersion] = useState<string>(existingOrder?.bomVersion && existingOrder.bomVersion !== '--' ? existingOrder.bomVersion : '');
  const [specification, setSpecification] = useState<string>(existingOrder ? existingOrder.specification : '');
  const [requiredDate, setRequiredDate] = useState<string>(() => {
    if (existingOrder?.requiredDate && existingOrder.requiredDate !== '-') {
      return existingOrder.requiredDate;
    }
    if (existingOrder?.outsourcingAppNo) {
      const matchedApp = getOutsourcingApplications().find(
        a => a.applicationNo === existingOrder.outsourcingAppNo
      );
      if (matchedApp?.requiredDate && matchedApp.requiredDate !== '-') {
        return matchedApp.requiredDate;
      }
    }
    return '';
  });
  const [supplierInput, setSupplierInput] = useState<string>(existingOrder && existingOrder.supplierName !== '-' ? existingOrder.supplierName : '');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState<boolean>(false);
  const [contactPerson, setContactPerson] = useState<string>(existingOrder?.contactPerson || '');
  const [contactPhone, setContactPhone] = useState<string>(existingOrder?.contactPhone && existingOrder.contactPhone !== '-' ? existingOrder.contactPhone : '');
  const [startDate, setStartDate] = useState<string>(existingOrder?.plannedStartDate || '');
  const [deliveryDate, setDeliveryDate] = useState<string>(existingOrder?.plannedDeliveryDate && existingOrder.plannedDeliveryDate !== '-' ? existingOrder.plannedDeliveryDate : '');
  const [companyName, setCompanyName] = useState<string>(existingOrder?.companyName || '智简工厂测试租户');
  const [remark, setRemark] = useState<string>(existingOrder?.remark && existingOrder.remark !== '--' ? existingOrder.remark : '');

  const [materials, setMaterials] = useState<OutsourcingMaterialItem[]>(existingOrder?.materials || []);
  const [matPage, setMatPage] = useState<number>(1);
  const [matPageSize, setMatPageSize] = useState<number>(10);
  const [matJumpPage, setMatJumpPage] = useState<string>('1');

  const [selectedBomMaterialId, setSelectedBomMaterialId] = useState<string | null>(null);
  const [bomPage, setBomPage] = useState<number>(1);
  const [bomPageSize, setBomPageSize] = useState<number>(10);
  const [bomJumpPage, setBomJumpPage] = useState<string>('1');

  const initialMatchedSupplier = existingOrder?.supplierName
    ? SUPPLIER_OPTIONS.find(s => s.name === existingOrder.supplierName)
    : undefined;
  const [supplierTaxRate, setSupplierTaxRate] = useState<number>(
    existingOrder?.taxRate ?? initialMatchedSupplier?.taxRate ?? 0
  );

  const [pricingMethod] = useState<string>(existingOrder?.pricingMethod || '整单费用');
  const [totalAmount] = useState<string>(existingOrder ? existingOrder.taxIncludedAmount.toFixed(2) : '0.00');
  const [discountRate, setDiscountRate] = useState<string>('0.00');
  const [depositAmount, setDepositAmount] = useState<string>('0.00');
  const [taxType, setTaxType] = useState<string>(existingOrder?.taxType || '无税（免税/不征税）');
  const [feeDescription, setFeeDescription] = useState<string>(existingOrder?.feeDescription && existingOrder.feeDescription !== '--' ? existingOrder.feeDescription : '');

  const [toast, setToast] = useState<string | null>(null);
  const [bomModalTarget, setBomModalTarget] = useState<{
    salesOrder?: string;
    salesOrderLine?: string;
    productCode?: string;
    productName?: string;
    productSpec?: string;
    materialCode: string;
    materialName: string;
    bomVersion: string;
  } | null>(null);
  const [expandedBomRowIds, setExpandedBomRowIds] = useState<Set<string>>(new Set());
  const [bomColumns, setBomColumns] = useState<BomColumnConfig[]>(DEFAULT_BOM_COLUMNS);
  const [openBomConfigTarget, setOpenBomConfigTarget] = useState<string | null>(null);
  const [draggedBomColIdx, setDraggedBomColIdx] = useState<number | null>(null);

  // Column header search/filter & sort states for 产品信息 / 生产明细 and BOM明细
  const [prodColFilters, setProdColFilters] = useState<Record<string, string>>({});
  const [activeProdHeaderMenu, setActiveProdHeaderMenu] = useState<string | null>(null);
  const [prodSortConfig, setProdSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const [bomColFilters, setBomColFilters] = useState<Record<string, string>>({});
  const [activeBomHeaderMenu, setActiveBomHeaderMenu] = useState<string | null>(null);
  const [bomSortConfig, setBomSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

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

  const visibleBomColumns = bomColumns.filter(col => col.visible);

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

  const renderBomColumnConfigControl = (targetId: string, popoverAlign: 'left' | 'right' = 'right') => {
    const isOpen = openBomConfigTarget === targetId;
    return (
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenBomConfigTarget(prev => (prev === targetId ? null : targetId))}
          title="字段配置"
          className={cn(
            "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors cursor-pointer",
            isOpen
              ? "border-blue-500 bg-blue-100/80 text-blue-600"
              : "border-blue-400 bg-blue-50/70 hover:bg-blue-100/60 text-blue-600"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute top-full mt-1.5 w-[310px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-[12px] select-none",
              popoverAlign === 'left' ? "left-0" : "right-0"
            )}
          >
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
                onClick={() => setOpenBomConfigTarget(null)}
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
    );
  };

  const [productColumns, setProductColumns] = useState<ProductColumnConfig[]>(DEFAULT_PRODUCT_COLUMNS);
  const [isProductColConfigOpen, setIsProductColConfigOpen] = useState<boolean>(false);
  const [draggedProductColKey, setDraggedProductColKey] = useState<ProductColumnKey | null>(null);

  const applicableProductColumns = productColumns.filter(
    col => !col.onlyFor || col.onlyFor === outsourcingType
  );
  const visibleProductColumns = applicableProductColumns.filter(col => col.visible);

  const toggleProductColumnVisible = (key: ProductColumnKey) => {
    setProductColumns(prev =>
      prev.map(col => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const handleSelectAllProductColumns = () => {
    setProductColumns(prev =>
      prev.map(col =>
        !col.onlyFor || col.onlyFor === outsourcingType ? { ...col, visible: true } : col
      )
    );
  };

  const handleClearAllProductColumns = () => {
    setProductColumns(prev =>
      prev.map(col =>
        !col.onlyFor || col.onlyFor === outsourcingType ? { ...col, visible: false } : col
      )
    );
  };

  const handleResetProductColumns = () => {
    setProductColumns(DEFAULT_PRODUCT_COLUMNS.map(col => ({ ...col })));
  };

  const moveProductColumn = (key: ProductColumnKey, direction: 'left' | 'right') => {
    setProductColumns(prev => {
      const applicableKeys = prev
        .filter(c => !c.onlyFor || c.onlyFor === outsourcingType)
        .map(c => c.key);
      const appIdx = applicableKeys.indexOf(key);
      const targetAppIdx = direction === 'left' ? appIdx - 1 : appIdx + 1;
      if (appIdx === -1 || targetAppIdx < 0 || targetAppIdx >= applicableKeys.length) return prev;
      const targetKey = applicableKeys[targetAppIdx];
      const fromIdx = prev.findIndex(c => c.key === key);
      const toIdx = prev.findIndex(c => c.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDropProductColumn = (targetKey: ProductColumnKey) => {
    if (!draggedProductColKey || draggedProductColKey === targetKey) {
      setDraggedProductColKey(null);
      return;
    }
    setProductColumns(prev => {
      const fromIdx = prev.findIndex(c => c.key === draggedProductColKey);
      const toIdx = prev.findIndex(c => c.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedProductColKey(null);
  };

  const renderProductColumnConfigControl = () => {
    return (
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsProductColConfigOpen(prev => !prev)}
          title="字段配置"
          className={cn(
            "w-[30px] h-[30px] rounded-lg border flex items-center justify-center transition-colors cursor-pointer",
            isProductColConfigOpen
              ? "border-blue-500 bg-blue-100/80 text-blue-600"
              : "border-blue-400 bg-blue-50/70 hover:bg-blue-100/60 text-blue-600"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {isProductColConfigOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-[310px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-[12px] select-none">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[13px]">显示字段</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllProductColumns}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={handleClearAllProductColumns}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto px-2 py-1.5 divide-y divide-slate-50 custom-scrollbar">
              {applicableProductColumns.map((col, idx) => (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => setDraggedProductColKey(col.key)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropProductColumn(col.key)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors",
                    draggedProductColKey === col.key && "opacity-50 bg-blue-50/40"
                  )}
                >
                  <div
                    onClick={() => toggleProductColumnVisible(col.key)}
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
                    <span className="text-[12px] text-slate-700 truncate">
                      {col.required && <span className="text-red-500 mr-0.5">*</span>}
                      {col.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveProductColumn(col.key, 'left')}
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
                      disabled={idx === applicableProductColumns.length - 1}
                      onClick={() => moveProductColumn(col.key, 'right')}
                      title="向右调整顺序"
                      className={cn(
                        "w-5 h-5 rounded text-[11px] font-medium flex items-center justify-center transition-colors",
                        idx === applicableProductColumns.length - 1
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
                onClick={() => setIsProductColConfigOpen(false)}
                className="h-[28px] px-3.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium cursor-pointer transition-colors"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleResetProductColumns}
                className="h-[28px] px-3.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const toggleExpandBomRow = (rowId: string) => {
    setExpandedBomRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);

  const selectedProductObj = PRODUCT_OPTIONS.find(p => p.code === selectedProductCode);
  const selectedMoObj = PRODUCTION_ORDER_OPTIONS.find(m => m.moNo === moNo);
  const availableProcessOptions = selectedMoObj ? selectedMoObj.processes : OUTSOURCING_PROCESS_OPTIONS;

  const availableProcessesForRoute = useMemo(() => {
    const matched = PROCESS_ROUTE_OPTIONS.find(r => r.name === processRoute);
    return matched ? matched.processes : OUTSOURCING_PROCESS_OPTIONS;
  }, [processRoute]);

  const toggleProcessSelection = (proc: string) => {
    setProcesses(prev => {
      const next = prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc];
      setProcessName(next.join('、'));
      return next;
    });
  };

  const isAppSelected = Boolean(outsourcingAppNo && outsourcingAppNo.trim() !== '');
  const isProcessLockedByApp = isAppSelected && outsourcingType === '工序外协';

  const handleConfirmOutsourcingAppModal = (app: OutsourcingApplicationItem) => {
    const firstMat = app.materials[0];
    const defaultSalesOrder = firstMat?.source || 'HY-26C-085';
    const defaultSalesOrderLine = firstMat?.lineNo || '1';
    const defaultProductCode = firstMat?.productCode || firstMat?.materialCode || '02-00DX-02161';
    const defaultProductName = firstMat?.productName || firstMat?.materialName || app.applicationNo;
    const defaultProductCategory = firstMat?.productCategory || '成套设备';
    const defaultProductSpec = firstMat?.productSpec || 'HY-LD250';
    const defaultCategory = firstMat?.materialCategory || firstMat?.productCategory || '机加件';
    const defaultSpec = firstMat?.specification || firstMat?.productSpec || 'HY-LD250';
    const defaultUnit = firstMat?.unit || '件';
    const defaultBomVer = firstMat?.bomVersion || 'V1.0';

    setOutsourcingAppNo(app.applicationNo);
    setIsAppModalOpen(false);
    setIsProcessDropdownOpen(false);
    setOutsourcingType(app.outsourcingType);
    setOutsourcingMethod(app.outsourcingMethod);
    setRequiredDate(app.requiredDate && app.requiredDate !== '-' ? app.requiredDate : '');

    if (app.outsourcingType === '工序外协') {
      const nextRoute = app.processRoute || '标准机加及表面处理工艺路线';
      const nextProcs = app.processes && app.processes.length > 0 ? app.processes : ['表面阳极氧化'];
      setProcessRoute(nextRoute);
      setProcesses(nextProcs);
      setProcessName(nextProcs.join('、'));
    } else {
      setProcessRoute('');
      setProcesses([]);
      setProcessName('');
    }

    setSalesOrder(defaultSalesOrder);
    setSalesOrderLine(defaultSalesOrderLine);
    setSelectedProductCode(defaultProductCode);
    setBomVersion(defaultBomVer);
    setSpecification(defaultSpec);

    if (app.materials && app.materials.length > 0) {
      setMaterials(
        app.materials.map((m, idx) => ({
          id: `mat-app-${Date.now()}-${idx}`,
          seq: idx + 1,
          selected: false,
          salesOrder: m.source || defaultSalesOrder,
          source: m.source || defaultSalesOrder,
          salesOrderLine: m.lineNo || String(idx + 1),
          lineNo: m.lineNo || String(idx + 1),
          productCode: m.productCode || defaultProductCode,
          productName: m.productName || defaultProductName,
          productCategory: m.productCategory || defaultProductCategory,
          productSpec: m.productSpec || defaultProductSpec,
          category: m.materialCategory || m.productCategory || defaultCategory,
          materialCategory: m.materialCategory || m.productCategory || defaultCategory,
          materialCode: m.materialCode,
          materialName: m.materialName,
          bomVersion: m.bomVersion || defaultBomVer,
          specification: m.specification,
          unit: m.unit,
          currentStock: m.currentStock ?? 8,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: m.requestQty || 1,
          taxIncludedUnitPrice: '22.00',
          remark: m.remark || ''
        }))
      );
    } else {
      setMaterials([
        {
          id: `mat-app-${Date.now()}`,
          seq: 1,
          selected: false,
          salesOrder: defaultSalesOrder,
          source: defaultSalesOrder,
          salesOrderLine: defaultSalesOrderLine,
          lineNo: defaultSalesOrderLine,
          productCode: defaultProductCode,
          productName: defaultProductName,
          productCategory: defaultProductCategory,
          productSpec: defaultProductSpec,
          category: defaultCategory,
          materialCategory: defaultCategory,
          materialCode: defaultProductCode,
          materialName: defaultProductName,
          bomVersion: defaultBomVer,
          specification: defaultSpec,
          unit: defaultUnit,
          currentStock: 8,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: app.totalQty || 1,
          taxIncludedUnitPrice: '22.00',
          remark: ''
        }
      ]);
    }

    setToast(`已选择外协申请单 ${app.applicationNo}，自动带出关联信息与明细`);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (!editOrderNo && initialAppNo) {
      const matchedApp = getOutsourcingApplications().find(a => a.applicationNo === initialAppNo);
      if (matchedApp) {
        handleConfirmOutsourcingAppModal(matchedApp);
      }
    }
  }, [editOrderNo, initialAppNo]);

  const handleProductChange = (code: string) => {
    setSelectedProductCode(code);
    const prod = PRODUCT_OPTIONS.find(p => p.code === code);
    if (prod) {
      setSpecification(prod.spec);
      setBomVersion(prod.bomVersions[0] || 'V1.0');
      setMaterials([
        {
          id: `mat-${Date.now()}`,
          seq: 1,
          selected: false,
          salesOrder: salesOrder || '-',
          source: salesOrder || '-',
          salesOrderLine: salesOrderLine || '1',
          lineNo: salesOrderLine || '1',
          productCode: prod.code,
          productName: prod.name,
          productCategory: prod.category,
          productSpec: prod.spec,
          category: prod.category,
          materialCategory: prod.category,
          materialCode: prod.code,
          materialName: prod.name,
          specification: prod.spec,
          unit: prod.unit,
          currentStock: 8,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: 22,
          taxIncludedUnitPrice: '22.00',
          remark: ''
        }
      ]);
    } else {
      setSpecification('');
      setBomVersion('');
      setMaterials([]);
    }
  };

  const isSalesOrderFilled = Boolean(salesOrder && salesOrder.trim() !== '');

  const handleSwitchOutsourcingType = (nextType: OutsourcingType) => {
    if (nextType === outsourcingType) return;
    setOutsourcingType(nextType);
    setMaterials(prev => {
      if (prev.length === 0) return prev;
      if (nextType === '整单外协') {
        const grouped = new Map<string, OutsourcingMaterialItem>();
        prev.forEach(row => {
          const prodCode = row.productCode || row.materialCode.replace(/-\d+$/, '');
          const soNo = row.source || row.salesOrder || salesOrder || '-';
          const lineNo = row.lineNo || row.salesOrderLine || '1';
          const key = `${soNo}__${lineNo}__${prodCode}`;
          if (!grouped.has(key)) {
            const prodOpt = PRODUCT_OPTIONS.find(p => p.code === prodCode);
            const soOpt = ONGOING_SALES_ORDERS.find(so => so.orderNo === soNo);
            const soItem = soOpt?.items.find(
              it => it.materialCode === prodCode && (it.lineNo === lineNo || !lineNo)
            ) || soOpt?.items.find(it => it.materialCode === prodCode);
            const prodUnit = soItem?.unit || prodOpt?.unit || '台';
            const prodQty = soItem?.quantity ?? row.plannedQty ?? 1;
            const prodName = row.productName || prodOpt?.name || row.materialName;
            const prodCategory = row.productCategory || prodOpt?.category || '成套设备';
            const prodSpec = row.productSpec || prodOpt?.spec || row.specification;
            grouped.set(key, {
              ...row,
              productCode: prodCode,
              productName: prodName,
              productCategory: prodCategory,
              productSpec: prodSpec,
              materialCode: prodCode,
              materialName: prodName,
              category: prodCategory,
              materialCategory: prodCategory,
              specification: prodSpec,
              unit: prodUnit,
              plannedQty: prodQty,
            });
          }
        });
        return Array.from(grouped.values()).map((m, idx) => ({ ...m, seq: idx + 1 }));
      } else {
        const expanded: OutsourcingMaterialItem[] = [];
        prev.forEach((row, rIdx) => {
          const prodCode = row.productCode || row.materialCode.replace(/-\d+$/, '');
          const isWholeProductRow = row.materialCode === prodCode || !/-\d+$/.test(row.materialCode);
          if (isWholeProductRow) {
            APPLICATION_MATERIAL_TEMPLATES.forEach((tpl, tIdx) => {
              expanded.push({
                ...row,
                id: `${row.id}-mat-${rIdx}-${tIdx}`,
                productCode: prodCode,
                materialCode: `${prodCode}-${tpl.suffix}`,
                materialName: `${row.productName || row.materialName}${tpl.nameSuffix}`,
                category: tpl.materialCategory,
                materialCategory: tpl.materialCategory,
                specification: row.productSpec || row.specification,
                unit: tpl.unit,
                plannedQty: (Number(row.plannedQty) || 1) * tpl.usage,
              });
            });
          } else {
            expanded.push(row);
          }
        });
        return expanded.map((m, idx) => ({ ...m, seq: idx + 1 }));
      }
    });
  };

  const handleConfirmSalesOrderModal = (selectedOrders: string[], selectedItems: SalesOrderModalMaterialItem[]) => {
    const orderNoStr = selectedOrders.join('、');
    if (orderNoStr) {
      setSalesOrder(orderNoStr);
    }
    if (selectedItems.length > 0) {
      const firstItem = selectedItems[0];
      const lineStr = Array.from(new Set(selectedItems.map(i => i.lineNo))).join('、');
      setSalesOrderLine(lineStr);
      setSelectedProductCode(firstItem.productCode || firstItem.materialCode);
      setSpecification(firstItem.specification);
      setBomVersion(firstItem.bomVersion || 'V1.0');
      if (firstItem.planDeliveryDate && !deliveryDate) {
        setDeliveryDate(firstItem.planDeliveryDate);
      }
      const isWholeOrder = outsourcingType === '整单外协';
      const importedRows: OutsourcingMaterialItem[] = selectedItems.map((item, idx) => {
        const prodCode = item.productCode || item.materialCode.replace(/-\d+$/, '');
        const prodOpt = PRODUCT_OPTIONS.find(p => p.code === prodCode);
        const prodName = item.productName || prodOpt?.name || item.materialName;
        const prodCategory = item.productCategory || prodOpt?.category || item.category || '成套设备';
        const prodSpec = item.productSpec || prodOpt?.spec || item.specification;
        return {
          id: `mat-so-${Date.now()}-${idx}`,
          seq: materials.length + idx + 1,
          selected: false,
          salesOrder: item.sourceOrderNo || selectedOrders[0] || '-',
          source: item.sourceOrderNo || selectedOrders[0] || '-',
          salesOrderLine: item.lineNo || String(idx + 1),
          lineNo: item.lineNo || String(idx + 1),
          productCode: prodCode,
          productName: prodName,
          productCategory: prodCategory,
          productSpec: prodSpec,
          bomVersion: item.bomVersion || 'V1.0',
          materialCode: isWholeOrder ? prodCode : item.materialCode,
          materialName: isWholeOrder ? prodName : item.materialName,
          category: isWholeOrder ? prodCategory : (item.materialCategory || item.category || '机加件'),
          materialCategory: isWholeOrder ? prodCategory : (item.materialCategory || item.category || '机加件'),
          specification: isWholeOrder ? prodSpec : item.specification,
          unit: isWholeOrder ? (item.unit || prodOpt?.unit || '台') : item.unit,
          currentStock: 8,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: item.quantity || 1,
          taxIncludedUnitPrice: '22.00',
          remark: '',
        };
      });
      setMaterials(prev => [...prev, ...importedRows].map((m, i) => ({ ...m, seq: i + 1 })));
      setToast(`已从销售订单导入 ${importedRows.length} 条${isWholeOrder ? '产品' : '物料'}明细`);
      setTimeout(() => setToast(null), 2200);
    }
    setIsSalesOrderModalOpen(false);
  };

  const handleDeleteSelectedMaterials = () => {
    const selectedCount = materials.filter(m => m.selected).length;
    if (selectedCount === 0) {
      setToast('请先勾选需要删除的物料行');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setMaterials(prev => prev.filter(m => !m.selected).map((m, i) => ({ ...m, seq: i + 1 })));
    setToast(`已删除 ${selectedCount} 条选中的物料行`);
    setTimeout(() => setToast(null), 2200);
  };

  const handleClearSalesOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSalesOrder('');
    setSalesOrderLine('');
  };

  const handleSelectSupplier = (sup: typeof SUPPLIER_OPTIONS[0]) => {
    setSupplierInput(sup.name);
    setContactPerson(sup.contact);
    setContactPhone(sup.phone);
    setSupplierTaxRate(sup.taxRate ?? 0);
    if (sup.taxType) {
      setTaxType(sup.taxType);
    }
    setShowSupplierDropdown(false);
  };

  const handleAddMaterialRow = () => {
    const defaultProd = PRODUCT_OPTIONS[0];
    setMaterials(prev => {
      const next = [
        ...prev,
        {
          id: `mat-${Date.now()}-${prev.length + 1}`,
          seq: prev.length + 1,
          selected: false,
          salesOrder: salesOrder || '-',
          source: salesOrder || '-',
          salesOrderLine: salesOrderLine || String(prev.length + 1),
          lineNo: salesOrderLine || String(prev.length + 1),
          productCode: defaultProd.code,
          productName: defaultProd.name,
          productCategory: defaultProd.category,
          productSpec: defaultProd.spec,
          category: defaultProd.category,
          materialCategory: defaultProd.category,
          materialCode: defaultProd.code,
          materialName: defaultProd.name,
          bomVersion: defaultProd.bomVersions?.[0] || 'V1.0',
          specification: defaultProd.spec,
          unit: defaultProd.unit,
          currentStock: 8,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: 22,
          taxIncludedUnitPrice: '22.00',
          remark: ''
        }
      ];
      const nextTotalPages = Math.max(1, Math.ceil(next.length / matPageSize));
      setMatPage(nextTotalPages);
      setMatJumpPage(String(nextTotalPages));
      return next;
    });
  };

  const taxRateValue = (Number(supplierTaxRate) || 0) / 100;
  const taxRateDisplay = `${(Number(supplierTaxRate) || 0).toFixed(2)}%`;

  const totalPlannedQtySum = materials.reduce((sum, item) => sum + (Number(item.plannedQty) || 0), 0);

  const totalInclTax = materials.reduce((sum, item) => {
    const qty = Number(item.plannedQty) || 0;
    const price = parseFloat(String(item.taxIncludedUnitPrice ?? '22.00')) || 0;
    return sum + qty * price;
  }, 0);

  const totalExclTax = materials.reduce((sum, item) => {
    const qty = Number(item.plannedQty) || 0;
    const price = parseFloat(String(item.taxIncludedUnitPrice ?? '22.00')) || 0;
    const exclUnit = price / (1 + taxRateValue);
    return sum + qty * exclUnit;
  }, 0);

  const feeTotalPrice = materials.length > 0 ? totalInclTax : (parseFloat(totalAmount) || 0);
  const parsedDiscountRate = Math.min(100, Math.max(0, parseFloat(discountRate) || 0));
  const discountAmountNum = feeTotalPrice * (parsedDiscountRate / 100);
  const afterDiscountAmountNum = Math.max(0, feeTotalPrice - discountAmountNum);
  const parsedDepositAmount = Math.max(0, parseFloat(depositAmount) || 0);
  const payableAmountNum = Math.max(0, afterDiscountAmountNum - parsedDepositAmount);

  const stepDiscountRate = (delta: number) => {
    const next = Math.min(100, Math.max(0, (parseFloat(discountRate) || 0) + delta));
    setDiscountRate(next.toFixed(2));
  };

  const stepDepositAmount = (delta: number) => {
    const next = Math.max(0, (parseFloat(depositAmount) || 0) + delta);
    setDepositAmount(next.toFixed(2));
  };

  const getProdFieldValue = (item: OutsourcingMaterialItem, colKey: ProductColumnKey): string => {
    const qtyNum = Number(item.plannedQty) || 0;
    const inclUnitNum = parseFloat(String(item.taxIncludedUnitPrice ?? '22.00')) || 0;
    const exclUnitNum = inclUnitNum / (1 + taxRateValue);
    const inclTotalNum = qtyNum * inclUnitNum;
    const exclTotalNum = qtyNum * exclUnitNum;
    const rowBomVer = item.bomVersion || bomVersion || 'V1.0';

    switch (colKey) {
      case 'salesOrder':
        return item.source || item.salesOrder || salesOrder || '-';
      case 'salesOrderLine':
        return item.lineNo || item.salesOrderLine || salesOrderLine || '1';
      case 'productCode':
        return item.productCode || item.materialCode || '';
      case 'productName':
        return item.productName || item.materialName || '';
      case 'productCategory':
        return item.productCategory || item.category || '';
      case 'productSpec':
        return item.productSpec || item.specification || '';
      case 'bomVersion':
        return rowBomVer;
      case 'materialCode':
        return item.materialCode || '';
      case 'materialName':
        return item.materialName || '';
      case 'category':
        return item.materialCategory || item.category || '';
      case 'specification':
        return item.specification || '';
      case 'unit':
        return item.unit || '';
      case 'currentStock':
        return String(item.currentStock ?? 8);
      case 'plannedQty':
        return String(qtyNum);
      case 'taxExcludedUnitPrice':
        return exclUnitNum.toFixed(2);
      case 'taxIncludedUnitPrice':
        return String(item.taxIncludedUnitPrice ?? '22.00');
      case 'taxRate':
        return taxRateDisplay;
      case 'taxIncludedTotal':
        return inclTotalNum.toFixed(2);
      case 'taxExcludedTotal':
        return exclTotalNum.toFixed(2);
      case 'remark':
        return item.remark || '';
      default:
        return '';
    }
  };

  const filteredAndSortedMaterials = useMemo(() => {
    const filtered = materials.filter(item => {
      for (const [colKey, filterVal] of Object.entries(prodColFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getProdFieldValue(item, colKey as ProductColumnKey).toLowerCase();
        if (!cellVal.includes(trimmed)) return false;
      }
      return true;
    });

    if (!prodSortConfig) return filtered;
    const { key, dir } = prodSortConfig;
    const numericKeys = new Set([
      'salesOrderLine',
      'currentStock',
      'plannedQty',
      'taxExcludedUnitPrice',
      'taxIncludedUnitPrice',
      'taxIncludedTotal',
      'taxExcludedTotal'
    ]);
    return [...filtered].sort((a, b) => {
      const valA = getProdFieldValue(a, key as ProductColumnKey);
      const valB = getProdFieldValue(b, key as ProductColumnKey);
      if (numericKeys.has(key)) {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [materials, prodColFilters, prodSortConfig, salesOrder, salesOrderLine, bomVersion, taxRateValue, taxRateDisplay]);

  const totalMatPages = Math.max(1, Math.ceil(filteredAndSortedMaterials.length / matPageSize));
  const currentMatPage = Math.min(matPage, totalMatPages);
  const paginatedMaterials = filteredAndSortedMaterials.slice(
    (currentMatPage - 1) * matPageSize,
    currentMatPage * matPageSize
  );

  const activeBomMaterial =
    materials.find(m => m.id === selectedBomMaterialId) || null;

  const allSectionBomItems: BomDetailItem[] = useMemo(() => {
    const targetRows = activeBomMaterial ? [activeBomMaterial] : materials;
    return targetRows.flatMap((mat, matIdx) =>
      getBomDetailsForMaterial(
        mat.materialCode,
        mat.materialName,
        mat.bomVersion || bomVersion || 'V1.0',
        {
          rowKeyPrefix: `${mat.id || matIdx}`,
          salesOrder: mat.source || mat.salesOrder || salesOrder || '-',
          salesOrderLine: mat.lineNo || mat.salesOrderLine || salesOrderLine || '1',
          productCode: mat.productCode || mat.materialCode || '-',
          productName: mat.productName || mat.materialName || '-',
          productSpec: mat.productSpec || mat.specification || '-',
        }
      )
    );
  }, [activeBomMaterial, materials, bomVersion, salesOrder, salesOrderLine]);

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

  const totalBomStandardUsageSum = filteredAndSortedBomItems.reduce(
    (sum, item) => sum + (Number(item.standardUsage) || 0),
    0
  );

  const totalBomPages = Math.max(1, Math.ceil(filteredAndSortedBomItems.length / bomPageSize));
  const currentBomPage = Math.min(bomPage, totalBomPages);
  const paginatedSectionBomItems = filteredAndSortedBomItems.slice(
    (currentBomPage - 1) * bomPageSize,
    currentBomPage * bomPageSize
  );

  const renderProdFilterableTh = (col: ProductColumnConfig) => {
    if (!col.filterType) {
      return (
        <th
          key={col.key}
          className={cn(
            col.widthClass,
            "px-3 border-r border-slate-200/60 whitespace-nowrap",
            col.align === 'center' && "text-center",
            col.align === 'right' && "text-right"
          )}
        >
          {col.required && <span className="text-red-500 mr-0.5">*</span>}
          {col.label}
        </th>
      );
    }

    const currentVal = prodColFilters[col.key] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeProdHeaderMenu === col.key;
    const isSorted = prodSortConfig?.key === col.key ? prodSortConfig.dir : null;

    const defaultFallbacks: Record<string, string[]> = {
      productCategory: ['成套设备', '自动化装备', '通信设备', '机加件', '钣金件', '标准件'],
      category: ['成套设备', '自动化装备', '通信设备', '机加件', '钣金件', '标准件'],
      bomVersion: ['V1.0', 'V1.5', 'V2.0'],
      unit: ['台', '件', 'PCS', '套'],
      taxRate: ['0.00%', '3.00%', '13.00%']
    };
    const dynamicOpts = Array.from(
      new Set(materials.map(m => getProdFieldValue(m, col.key)).filter(Boolean))
    );
    const uniqueOptions =
      col.filterType === 'filter'
        ? dynamicOpts.length > 0
          ? dynamicOpts
          : defaultFallbacks[col.key] || []
        : [];

    const allSelected =
      filteredAndSortedMaterials.length > 0 && filteredAndSortedMaterials.every(m => m.selected);

    return (
      <th
        key={col.key}
        onClick={e => e.stopPropagation()}
        className={cn(
          col.widthClass,
          "px-3 border-r border-slate-200/60 font-bold text-slate-700 whitespace-nowrap relative select-none",
          col.align === 'center' && "text-center",
          col.align === 'right' && "text-right"
        )}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 cursor-pointer group whitespace-nowrap",
            col.align === 'center' && "justify-center",
            col.align === 'right' && "justify-end"
          )}
        >
          {col.key === 'salesOrder' && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                const nextChecked = !allSelected;
                const filteredIds = new Set(filteredAndSortedMaterials.map(m => m.id));
                setMaterials(prev =>
                  prev.map(m => (filteredIds.has(m.id) ? { ...m, selected: nextChecked } : m))
                );
              }}
              className={cn(
                "w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 mr-0.5",
                allSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300"
              )}
              title="全选/取消全选"
            >
              {allSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveProdHeaderMenu(prev => (prev === col.key ? null : col.key));
              setActiveBomHeaderMenu(null);
            }}
            className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {col.filterType === 'search' ? (
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
            <span className={cn("text-[12px] font-bold whitespace-nowrap", isActive ? "text-blue-600" : "text-slate-700")}>
              {col.required && <span className="text-red-500 mr-0.5">*</span>}
              {col.label}
            </span>
          </button>

          {col.sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setProdSortConfig(prev => {
                  if (prev?.key === col.key) {
                    if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
                    return null;
                  }
                  return { key: col.key, dir: 'asc' };
                });
              }}
              className="cursor-pointer p-0.5 hover:bg-slate-200/60 rounded shrink-0"
              title="点击排序"
            >
              <WizardSortTriangles activeDir={isSorted} />
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
                      setProdColFilters(prev => ({ ...prev, [col.key]: e.target.value }));
                      setMatPage(1);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveProdHeaderMenu(null);
                    }}
                    placeholder={`搜索${col.label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProdColFilters(prev => ({ ...prev, [col.key]: '' }));
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
                    setProdColFilters(prev => ({ ...prev, [col.key]: '' }));
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
                  {uniqueOptions.map(opt => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setProdColFilters(prev => ({ ...prev, [col.key]: opt }));
                          setMatPage(1);
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
              <WizardSortTriangles activeDir={isSorted} />
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

  const handleRemoveMaterialRow = (id: string) => {
    setMaterials(prev => {
      const next = prev.filter(m => m.id !== id).map((m, i) => ({ ...m, seq: i + 1 }));
      const nextTotalPages = Math.max(1, Math.ceil(next.length / matPageSize));
      if (matPage > nextTotalPages) {
        setMatPage(nextTotalPages);
        setMatJumpPage(String(nextTotalPages));
      }
      return next;
    });
  };

  const scrollToStep = (step: 1 | 2 | 3) => {
    setActiveStep(step);
    const targetRef = step === 1 ? section1Ref : step === 2 ? section2Ref : section3Ref;
    if (targetRef.current && scrollContainerRef.current) {
      const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
      const targetTop = targetRef.current.getBoundingClientRect().top;
      const offset = targetTop - containerTop + scrollContainerRef.current.scrollTop;
      scrollContainerRef.current.scrollTo({ top: Math.max(0, offset - 4), behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const scrollTop = scrollContainerRef.current.scrollTop;
    const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
    if (maxScroll <= 0) return;

    if (scrollTop >= maxScroll - 30) {
      setActiveStep(3);
    } else if (scrollTop > 220) {
      setActiveStep(2);
    } else {
      setActiveStep(1);
    }
  };

  const handleSaveOrSubmit = (targetStatus: '草稿' | '进行中') => {
    const prod = PRODUCT_OPTIONS.find(p => p.code === selectedProductCode) || PRODUCT_OPTIONS[0];
    const sup = SUPPLIER_OPTIONS.find(s => s.name === supplierInput) || SUPPLIER_OPTIONS[0];
    const totalMaterialPlannedQty = materials.reduce((sum, m) => sum + (Number(m.plannedQty) || 0), 0);
    const qtyNum = totalMaterialPlannedQty > 0 ? totalMaterialPlannedQty : (existingOrder?.plannedQty || 2);

    const newOrder: OutsourcingOrderItem = {
      id: existingOrder?.id || `wx-${Date.now()}`,
      orderNo,
      outsourcingAppNo: outsourcingAppNo || '-',
      moNo: outsourcingType === '工序外协' ? (moNo || '-') : '-',
      productCode: prod.code,
      productName: prod.name,
      bomVersion: bomVersion || '--',
      specification: specification || prod.spec,
      processRoute: outsourcingType === '工序外协' ? (processRoute || '标准机加及表面处理工艺路线') : '--',
      processes: outsourcingType === '工序外协' ? processes : [],
      processName: outsourcingType === '工序外协' ? (processes.join('、') || processName || '--') : '--',
      supplierCode: sup.code,
      supplierName: supplierInput || sup.name,
      contactPerson: contactPerson || sup.contact,
      contactPhone: contactPhone !== '-' ? contactPhone : sup.phone,
      outsourcingType,
      outsourcingMethod,
      productionProgress: existingOrder?.productionProgress || 0,
      receiptProgress: existingOrder?.receiptProgress || 0,
      validReceiptQty: existingOrder?.validReceiptQty || 0,
      plannedQty: qtyNum,
      unit: prod.unit,
      requiredDate: requiredDate || '-',
      plannedStartDate: startDate || '2026-10-21',
      plannedDeliveryDate: deliveryDate || '2026-10-28',
      salesOrder: salesOrder || '-',
      salesOrderLine: salesOrderLine || undefined,
      companyName,
      taxIncludedAmount: afterDiscountAmountNum,
      pricingMethod,
      taxType,
      taxRate: supplierTaxRate,
      feeDescription: feeDescription || '--',
      creator: 'test租户123',
      createTime: existingOrder?.createTime || '2026-10-21 16:33:00',
      status: targetStatus,
      remark: remark || '--',
      materials: materials.length > 0 ? materials : [
        {
          id: 'm-default',
          seq: 1,
          category: prod.category,
          materialCode: prod.code,
          materialName: prod.name,
          specification: prod.spec,
          unit: prod.unit,
          standardUsage: 1,
          standardCost: '0.00',
          plannedQty: qtyNum,
          remark: ''
        }
      ],
      securityLink: existingOrder?.securityLink || {
        url: `https://supercodezj.com/zjgc/#/outsourcing-report?token=ac704dc2d9dc4139a23aff76ae3c41bfda4ee7c71d11`,
        active: true,
        reportMethod: '进度更新',
        createTime: '2026-10-21 16:33:00',
        lastVisit: '--'
      },
      progressRecords: existingOrder?.progressRecords || [],
      receiptRecords: existingOrder?.receiptRecords || []
    };

    saveOutsourcingOrder(newOrder);
    setToast(targetStatus === '草稿' ? '外协工单已保存为草稿' : '外协工单已提交');
    setTimeout(() => {
      if (onSaved) {
        onSaved(newOrder.orderNo);
      } else {
        onBack();
      }
    }, 400);
  };

  return (
    <div
      onClick={() => {
        setActiveProdHeaderMenu(null);
        setActiveBomHeaderMenu(null);
        setIsProcessDropdownOpen(false);
      }}
      className="flex flex-col h-full bg-[#f4f6f9] w-full overflow-hidden relative"
    >
      {toast && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Multi-Tab Bar */}
      <div className="h-[40px] bg-white border-b border-slate-200/80 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <Home className="w-3 h-3 text-blue-600" />
            <span>首页</span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>外协工单</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600/80 hover:bg-slate-50 text-[12px] cursor-pointer">
            <span>新增采购订单</span>
          </button>

          <button
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>工单管理</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-500 bg-blue-50/70 text-blue-600 font-medium text-[12px] cursor-pointer shadow-2xs">
            <span>新增外协工单</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-100">
          <button className="p-1 hover:text-slate-600 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><LayoutGrid className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 p-3 pb-0 overflow-hidden flex flex-col">
        {/* Top White Sub-Header Card */}
        <div className="h-[46px] bg-white rounded-t-xl border border-slate-200/80 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-bold text-slate-900">新增外协工单</span>
            <span className="text-[12px] text-blue-600 font-medium">{orderNo}</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
              草稿
            </span>
          </div>
          <button
            onClick={onBack}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 flex gap-3 pt-3 overflow-hidden">
          {/* Left Step Sidebar Card (Supports Collapse / Expand) */}
          <div
            className={cn(
              "bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shrink-0 transition-all duration-200",
              isSidebarCollapsed ? "w-[56px] p-2.5 items-center" : "w-[248px] p-4"
            )}
          >
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center w-full">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="展开新增外协工单导航"
                  className="w-8 h-8 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-full h-px bg-slate-100 my-3" />

                <div className="space-y-2.5 flex flex-col items-center w-full">
                  {[
                    { step: 1 as const, short: '基础', title: '基础信息' },
                    { step: 2 as const, short: '明细', title: '生产明细' },
                    { step: 3 as const, short: '费用', title: '外协费用' }
                  ].map(item => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => scrollToStep(item.step)}
                      title={item.title}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer border",
                        activeStep === item.step
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : activeStep > item.step
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/70"
                          : "bg-slate-100 text-slate-500 border-slate-200/60 hover:bg-slate-200/60"
                      )}
                    >
                      {item.short}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[15px] font-bold text-slate-900">新增外协工单</h2>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      title="收纳导航"
                      className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-500 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">维护外协基础信息、明细与供应商信息。</p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 mb-4 flex">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: activeStep === 1 ? '33%' : activeStep === 2 ? '33%' : '35%' }}
                    />
                    <div
                      className="h-full bg-teal-500 transition-all duration-300"
                      style={{ width: activeStep === 1 ? '0%' : activeStep === 2 ? '34%' : '65%' }}
                    />
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2">
                    {[
                      { step: 1 as const, title: '基础信息' },
                      { step: 2 as const, title: '生产明细' },
                      { step: 3 as const, title: '外协费用' }
                    ].map(item => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => scrollToStep(item.step)}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center transition-all cursor-pointer border",
                          activeStep === item.step
                            ? "bg-[#eef5ff] border-blue-200/80 shadow-2xs"
                            : "bg-white border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div className={cn("text-[13px] font-bold truncate", activeStep === item.step ? "text-blue-600" : "text-slate-800")}>
                          {item.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Summary Boxes */}
                <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">信息录入</div>
                    <div className="text-[18px] font-bold text-slate-900 mt-0.5">6/20</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">必填项</div>
                    <div className="text-[18px] font-bold text-slate-900 mt-0.5">
                      {outsourcingType === '工序外协' ? '4/10' : '6/10'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Scrollable Form Sections */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-w-0 overflow-y-auto space-y-3 pr-1 pb-4 custom-scrollbar"
          >
            {/* Card 1: 基础信息 (支持收纳/展开) */}
            <div ref={section1Ref} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div
                onClick={() => setIsBasicInfoCollapsed(prev => !prev)}
                className={cn(
                  "flex items-center justify-between cursor-pointer select-none",
                  !isBasicInfoCollapsed && "mb-5"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">基础信息</h3>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setIsBasicInfoCollapsed(prev => !prev);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{isBasicInfoCollapsed ? '展开' : '收起'}</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      isBasicInfoCollapsed ? "-rotate-90" : "rotate-0"
                    )}
                  />
                </button>
              </div>

              {!isBasicInfoCollapsed && (
                <>
                  <div className="grid grid-cols-4 gap-x-5 gap-y-4">
                {/* Row 1, Col 1: 外协工单编码 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>外协工单编码
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={orderNo}
                      disabled
                      className="flex-1 h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-500 text-[12px]"
                    />
                    <button className="w-[34px] h-[34px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 cursor-pointer">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 1, Col 2: 外协申请单 (非必填，点击打开弹窗选择) */}
                <div className="relative">
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    外协申请单
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={outsourcingAppNo}
                      readOnly
                      onClick={() => setIsAppModalOpen(true)}
                      placeholder="点击选择外协申请单（选填）"
                      className="w-full h-[34px] pl-3 pr-14 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                    {outsourcingAppNo && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOutsourcingAppNo('');
                          if (outsourcingType === '工序外协') {
                            if (!processRoute) {
                              setProcessRoute('标准机加及表面处理工艺路线');
                            }
                            if (processes.length === 0) {
                              setProcesses(['表面阳极氧化']);
                              setProcessName('表面阳极氧化');
                            }
                          }
                        }}
                        title="清空外协申请单（恢复手动选择）"
                        className="p-1 text-slate-400 hover:text-slate-600 absolute right-7 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAppModalOpen(true)}
                      title="弹窗选择外协申请单"
                      className="p-1 text-slate-500 hover:text-blue-600 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 1, Col 3: 外协类型 (未选外协申请单时可自由切换，已选外协申请单时锁定带出) */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>外协类型
                  </label>
                  <div
                    title={isAppSelected ? "已由外协申请单带出，清空申请单后可手动切换" : undefined}
                    className={cn(
                      "grid grid-cols-2 h-[34px] rounded-lg border border-slate-200 overflow-hidden select-none",
                      isAppSelected ? "bg-slate-50/80 opacity-80 cursor-not-allowed" : "bg-white"
                    )}
                  >
                    <button
                      type="button"
                      disabled={isAppSelected}
                      onClick={() => {
                        if (!isAppSelected) {
                          handleSwitchOutsourcingType('工序外协');
                          if (!processRoute) {
                            setProcessRoute('标准机加及表面处理工艺路线');
                          }
                          if (processes.length === 0) {
                            setProcesses(['表面阳极氧化']);
                            setProcessName('表面阳极氧化');
                          }
                        }
                      }}
                      className={cn(
                        "text-[12px] font-medium transition-colors",
                        isAppSelected ? "cursor-not-allowed" : "cursor-pointer",
                        outsourcingType === '工序外协'
                          ? "bg-blue-50/80 text-blue-600 border border-blue-400 rounded-l-lg"
                          : isAppSelected
                          ? "bg-slate-50/80 text-slate-400"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      工序外协
                    </button>
                    <button
                      type="button"
                      disabled={isAppSelected}
                      onClick={() => {
                        if (!isAppSelected) handleSwitchOutsourcingType('整单外协');
                      }}
                      className={cn(
                        "text-[12px] font-medium transition-colors",
                        isAppSelected ? "cursor-not-allowed" : "cursor-pointer",
                        outsourcingType === '整单外协'
                          ? "bg-blue-50/80 text-blue-600 border border-blue-400 rounded-r-lg"
                          : isAppSelected
                          ? "bg-slate-50/80 text-slate-400"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      整单外协
                    </button>
                  </div>
                </div>

                {/* Row 1, Col 4: 外协方式 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>外协方式
                  </label>
                  <div className="grid grid-cols-2 h-[34px] rounded-lg border border-slate-200 bg-white overflow-hidden select-none">
                    <button
                      type="button"
                      onClick={() => setOutsourcingMethod('包工包料')}
                      className={cn(
                        "text-[12px] font-medium cursor-pointer transition-colors",
                        outsourcingMethod === '包工包料'
                          ? "bg-blue-50/80 text-blue-600 border border-blue-400 rounded-l-lg"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      包工包料
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutsourcingMethod('包工不包料')}
                      className={cn(
                        "text-[12px] font-medium cursor-pointer transition-colors",
                        outsourcingMethod === '包工不包料'
                          ? "bg-blue-50/80 text-blue-600 border border-blue-400 rounded-r-lg"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      包工不包料
                    </button>
                  </div>
                </div>

                {/* 当外协类型为工序外协时：展示 工艺路线 和 工序 字段（未选申请单时可自选，已选申请单时锁定带出） */}
                {outsourcingType === '工序外协' && (
                  <>
                    {/* * 工艺路线 */}
                    <div>
                      <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>工艺路线
                      </label>
                      <div
                        className="relative"
                        title={isProcessLockedByApp ? "已由外协申请单带出" : undefined}
                      >
                        <select
                          value={processRoute}
                          disabled={isProcessLockedByApp}
                          onChange={e => {
                            if (isProcessLockedByApp) return;
                            const newRoute = e.target.value;
                            setProcessRoute(newRoute);
                            const routeObj = PROCESS_ROUTE_OPTIONS.find(r => r.name === newRoute);
                            if (routeObj) {
                              const validExisting = processes.filter(p => routeObj.processes.includes(p));
                              const nextProcs = validExisting.length > 0 ? validExisting : [routeObj.processes[0]];
                              setProcesses(nextProcs);
                              setProcessName(nextProcs.join('、'));
                            }
                          }}
                          className={cn(
                            "w-full h-[34px] px-3 pr-8 rounded-lg border border-slate-200 text-[12px] appearance-none focus:outline-none",
                            isProcessLockedByApp
                              ? "bg-slate-50/80 text-slate-500 cursor-not-allowed"
                              : "bg-white text-slate-700 focus:border-blue-500 cursor-pointer"
                          )}
                        >
                          {PROCESS_ROUTE_OPTIONS.map(route => (
                            <option key={route.code} value={route.name}>
                              {route.name}
                            </option>
                          ))}
                          {processRoute && !PROCESS_ROUTE_OPTIONS.some(r => r.name === processRoute) && (
                            <option value={processRoute}>{processRoute}</option>
                          )}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* * 工序 */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>工序
                      </label>
                      <button
                        type="button"
                        disabled={isProcessLockedByApp}
                        title={isProcessLockedByApp ? "已由外协申请单带出" : undefined}
                        onClick={() => {
                          if (!isProcessLockedByApp) {
                            setIsProcessDropdownOpen(prev => !prev);
                          }
                        }}
                        className={cn(
                          "w-full min-h-[34px] px-2.5 py-1 pr-8 rounded-lg border text-left text-[12px] flex items-center flex-wrap gap-1 relative transition-colors",
                          isProcessLockedByApp
                            ? "bg-slate-50/80 border-slate-200 cursor-not-allowed"
                            : isProcessDropdownOpen
                            ? "bg-white border-blue-500 cursor-pointer"
                            : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                        )}
                      >
                        {processes.length === 0 ? (
                          <span className="text-slate-400 px-0.5">请选择工序（可多选）</span>
                        ) : (
                          processes.map(proc => (
                            <span
                              key={proc}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                                isProcessLockedByApp
                                  ? "bg-slate-100 text-slate-600 border-slate-200"
                                  : "bg-blue-50 text-blue-600 border-blue-200/60"
                              )}
                            >
                              <span>{proc}</span>
                              {!isProcessLockedByApp && (
                                <X
                                  className="w-3 h-3 hover:text-blue-800 cursor-pointer"
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleProcessSelection(proc);
                                  }}
                                />
                              )}
                            </span>
                          ))
                        )}
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </button>

                      {isProcessDropdownOpen && !isProcessLockedByApp && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 px-1.5">
                          <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">可多选工序</span>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setProcesses([...availableProcessesForRoute]);
                                  setProcessName(availableProcessesForRoute.join('、'));
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                              >
                                全选
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProcesses([]);
                                  setProcessName('');
                                }}
                                className="text-slate-500 hover:text-slate-700 cursor-pointer"
                              >
                                清空
                              </button>
                            </div>
                          </div>
                          <div className="max-h-[180px] overflow-y-auto py-1 space-y-0.5 custom-scrollbar">
                            {availableProcessesForRoute.map(proc => {
                              const checked = processes.includes(proc);
                              return (
                                <button
                                  key={proc}
                                  type="button"
                                  onClick={() => toggleProcessSelection(proc)}
                                  className={cn(
                                    "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer transition-colors",
                                    checked ? "bg-blue-50/80 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  <span>{proc}</span>
                                  <span
                                    className={cn(
                                      "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                      checked
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-slate-300 text-transparent"
                                    )}
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 需求日期 (未选外协申请单时可自己选择，已选外协申请单时由申请单带出且锁定) */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    需求日期
                  </label>
                  <div
                    title={isAppSelected ? "已由外协申请单带出" : undefined}
                    className={cn(
                      "h-[34px] px-3 rounded-lg border border-slate-200 flex items-center gap-2 text-[12px]",
                      isAppSelected
                        ? "bg-slate-50/80 cursor-not-allowed"
                        : "bg-white focus-within:border-blue-500"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={requiredDate}
                      disabled={isAppSelected}
                      onChange={e => {
                        if (!isAppSelected) setRequiredDate(e.target.value);
                      }}
                      placeholder="请选择需求日期"
                      className={cn(
                        "w-full bg-transparent focus:outline-none text-[12px]",
                        isAppSelected
                          ? "text-slate-500 cursor-not-allowed"
                          : "text-slate-700 cursor-pointer"
                      )}
                    />
                  </div>
                </div>

                {/* 供应商 */}
                <div className="relative">
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>供应商
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={supplierInput}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setSupplierInput(val);
                        const matched = SUPPLIER_OPTIONS.find(s => s.name === val || s.code === val);
                        if (matched) {
                          setSupplierTaxRate(matched.taxRate ?? 0);
                        } else if (!val.trim()) {
                          setSupplierTaxRate(0);
                        }
                        setShowSupplierDropdown(true);
                      }}
                      placeholder="请输入名称或编码搜索供应商"
                      className="flex-1 h-[34px] px-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSupplierDropdown(prev => !prev)}
                      className="w-[34px] h-[34px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {showSupplierDropdown && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                      {SUPPLIER_OPTIONS.map(sup => (
                        <button
                          key={sup.code}
                          type="button"
                          onClick={() => handleSelectSupplier(sup)}
                          className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-blue-50/60 flex items-center justify-between cursor-pointer"
                        >
                          <span className="text-slate-800 font-medium truncate">{sup.name}</span>
                          <span className="text-[11px] text-slate-400 ml-2 shrink-0">{sup.code} ({sup.taxRate}%)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 联系人 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    联系人
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    disabled={!supplierInput}
                    className="w-full h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 text-[12px]"
                  />
                </div>

                {/* 联系电话 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    disabled={!supplierInput}
                    className="w-full h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 text-[12px]"
                  />
                </div>

                {/* 计划日期 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>计划日期
                  </label>
                  <div className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2 text-[12px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      placeholder="开始日期"
                      className="w-full text-center text-slate-700 placeholder:text-slate-400 focus:outline-none text-[12px]"
                    />
                    <span className="text-slate-600 shrink-0">至</span>
                    <input
                      type="text"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      placeholder="交期日期"
                      className="w-full text-center text-slate-700 placeholder:text-slate-400 focus:outline-none text-[12px]"
                    />
                  </div>
                </div>

                {/* 所属公司 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>所属公司
                  </label>
                  <div className="relative">
                    <select
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full h-[34px] px-3 pr-8 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="智简工厂测试租户">智简工厂测试租户</option>
                      <option value="华东精密智造分厂">华东精密智造分厂</option>
                      <option value="深圳总装制造中心">深圳总装制造中心</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div className="mt-4">
                <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                  备注
                </label>
                <textarea
                  rows={3}
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  placeholder="请输入外协工单备注"
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>
                </>
              )}
            </div>

            {/* Card 2: 生产明细 + BOM明细 */}
            <div ref={section2Ref} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">
                    生产明细
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {Object.values(prodColFilters).some(v => String(v || '').trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => setProdColFilters({})}
                      className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer mr-1"
                    >
                      清空列筛选
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSalesOrderModalOpen(true)}
                    className="h-[30px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium cursor-pointer transition-colors"
                  >
                    从销售订单导入
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMaterials}
                    className="h-[30px] px-3 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100/70 text-red-600 text-[12px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除选中</span>
                  </button>
                  {renderProductColumnConfigControl()}
                </div>
              </div>

              <div className="border border-slate-200/80 rounded-lg overflow-x-auto custom-scrollbar">
                <table className="w-max min-w-full border-collapse text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-700 font-bold">
                    <tr className="h-[38px]">
                      {visibleProductColumns.map(col => renderProdFilterableTh(col))}
                      <th className="w-[76px] min-w-[76px] px-3 text-center whitespace-nowrap sticky right-0 z-20 bg-[#f8fafc] border-l border-slate-200/80 shadow-[-2px_0_6px_rgba(15,23,42,0.04)]">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAndSortedMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(1, visibleProductColumns.length + 1)} className="h-[220px] text-center align-middle">
                          <div className="flex flex-col items-center justify-center">
                            <div className="text-[13px] text-slate-700 font-medium">
                              暂无生产明细
                            </div>
                            <div className="text-[12px] text-slate-400 mt-4">
                              {materials.length > 0
                                ? '当前列筛选无匹配结果，请调整或清空列筛选条件。'
                                : '选定外协申请单或点击右上角“从销售订单导入”添加生产明细。'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {paginatedMaterials.map(item => {
                          const qtyNum = Number(item.plannedQty) || 0;
                          const inclUnitNum = parseFloat(String(item.taxIncludedUnitPrice ?? '22.00')) || 0;
                          const exclUnitNum = inclUnitNum / (1 + taxRateValue);
                          const inclTotalNum = qtyNum * inclUnitNum;
                          const exclTotalNum = qtyNum * exclUnitNum;
                          const isSelectedForBom = outsourcingType !== '工序外协' && activeBomMaterial?.id === item.id;
                          const rowBomVer = item.bomVersion || bomVersion || 'V1.0';

                          const renderProductCell = (colKey: ProductColumnKey) => {
                            switch (colKey) {
                              case 'salesOrder':
                                return (
                                  <td
                                    key={colKey}
                                    onClick={e => e.stopPropagation()}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setMaterials(prev =>
                                            prev.map(m =>
                                              m.id === item.id ? { ...m, selected: !m.selected } : m
                                            )
                                          )
                                        }
                                        className={cn(
                                          "w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0",
                                          item.selected
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-white border-slate-300"
                                        )}
                                      >
                                        {item.selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </button>
                                      <span className="font-mono text-slate-700">
                                        {item.source || item.salesOrder || salesOrder || '-'}
                                      </span>
                                    </div>
                                  </td>
                                );
                              case 'salesOrderLine':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap">
                                    {item.lineNo || item.salesOrderLine || salesOrderLine || '1'}
                                  </td>
                                );
                              case 'productCode':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap">
                                    {item.productCode || item.materialCode || '-'}
                                  </td>
                                );
                              case 'productName':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-slate-800 whitespace-nowrap">
                                    {item.productName || item.materialName || '-'}
                                  </td>
                                );
                              case 'productCategory':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap">
                                    {item.productCategory || item.category || '-'}
                                  </td>
                                );
                              case 'productSpec':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap">
                                    {item.productSpec || item.specification || '-'}
                                  </td>
                                );
                              case 'bomVersion':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setBomModalTarget({
                                          salesOrder: item.source || item.salesOrder || salesOrder || '-',
                                          salesOrderLine: item.lineNo || item.salesOrderLine || salesOrderLine || '1',
                                          productCode: item.productCode || item.materialCode || '-',
                                          productName: item.productName || item.materialName || '-',
                                          productSpec: item.productSpec || item.specification || '-',
                                          materialCode: item.materialCode,
                                          materialName: item.materialName,
                                          bomVersion: rowBomVer
                                        });
                                      }}
                                      title="点击弹窗查看BOM信息"
                                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                                    >
                                      {rowBomVer}
                                    </button>
                                  </td>
                                );
                              case 'materialCode':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 font-mono text-slate-800 whitespace-nowrap">
                                    {item.materialCode}
                                  </td>
                                );
                              case 'materialName':
                                return (
                                  <td
                                    key={colKey}
                                    className="px-3 border-r border-slate-100 font-medium text-slate-800 whitespace-nowrap"
                                  >
                                    {item.materialName}
                                  </td>
                                );
                              case 'category':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap">
                                    {item.materialCategory || item.category}
                                  </td>
                                );
                              case 'specification':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap">
                                    {item.specification}
                                  </td>
                                );
                              case 'unit':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap">
                                    {item.unit}
                                  </td>
                                );
                              case 'currentStock':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center font-semibold text-emerald-600 whitespace-nowrap">
                                    {item.currentStock ?? 8}
                                  </td>
                                );
                              case 'plannedQty':
                                return (
                                  <td
                                    key={colKey}
                                    onClick={e => e.stopPropagation()}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <input
                                      type="number"
                                      value={item.plannedQty}
                                      onChange={e => {
                                        const val = Number(e.target.value) || 0;
                                        setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, plannedQty: val } : m));
                                      }}
                                      className="w-[84px] h-[28px] px-2 rounded border border-slate-200 bg-white text-[12px] text-center text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                );
                              case 'taxExcludedUnitPrice':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-700 whitespace-nowrap">
                                    {exclUnitNum.toFixed(2)}
                                  </td>
                                );
                              case 'taxIncludedUnitPrice':
                                return (
                                  <td
                                    key={colKey}
                                    onClick={e => e.stopPropagation()}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <input
                                      type="text"
                                      value={item.taxIncludedUnitPrice ?? '22.00'}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, taxIncludedUnitPrice: val } : m));
                                      }}
                                      className="w-[84px] h-[28px] px-2 rounded border border-slate-200 bg-white text-[12px] text-center text-slate-700 focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                );
                              case 'taxRate':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-700 whitespace-nowrap">
                                    {taxRateDisplay}
                                  </td>
                                );
                              case 'taxIncludedTotal':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-700 whitespace-nowrap">
                                    {inclTotalNum.toFixed(2)}
                                  </td>
                                );
                              case 'taxExcludedTotal':
                                return (
                                  <td key={colKey} className="px-3 border-r border-slate-100 text-center text-slate-700 whitespace-nowrap">
                                    {exclTotalNum.toFixed(2)}
                                  </td>
                                );
                              case 'remark':
                                return (
                                  <td
                                    key={colKey}
                                    onClick={e => e.stopPropagation()}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <input
                                      type="text"
                                      value={item.remark || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setMaterials(prev =>
                                          prev.map(m => (m.id === item.id ? { ...m, remark: val } : m))
                                        );
                                      }}
                                      placeholder="填写行备注"
                                      className="w-full min-w-[130px] h-[28px] px-2.5 rounded border border-slate-200 bg-white text-[12px] text-center text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <tr
                              key={item.id}
                              onClick={() => {
                                if (outsourcingType !== '工序外协') {
                                  setSelectedBomMaterialId(prev => (prev === item.id ? null : item.id));
                                  setBomPage(1);
                                  setBomJumpPage('1');
                                }
                              }}
                              className={cn(
                                "group h-[46px] transition-colors",
                                outsourcingType !== '工序外协' && "cursor-pointer",
                                isSelectedForBom ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50/80"
                              )}
                            >
                              {visibleProductColumns.map(col => renderProductCell(col.key))}
                              <td
                                onClick={e => e.stopPropagation()}
                                className={cn(
                                  "px-3 text-center whitespace-nowrap sticky right-0 z-10 border-l border-slate-200/80 shadow-[-2px_0_6px_rgba(15,23,42,0.04)]",
                                  isSelectedForBom ? "bg-[#f3f8ff] group-hover:bg-[#edf4ff]" : "bg-white group-hover:bg-[#f8fafc]"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMaterialRow(item.id)}
                                  className="text-red-500 hover:text-red-600 text-[12px] font-medium cursor-pointer"
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 生产明细 / 产品信息 分页栏（居左展示总数量、含税金额与未税金额） */}
              <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-slate-600 select-none">
                <div className="flex items-center gap-5">
                  <div>
                    <span className="text-slate-500">总数量：</span>
                    <span className="font-bold text-slate-900">{totalPlannedQtySum}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">含税金额：</span>
                    <span className="font-bold text-slate-900">{totalInclTax.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">未税金额：</span>
                    <span className="font-bold text-slate-900">{totalExclTax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span>共 {filteredAndSortedMaterials.length} 条</span>
                  <div className="relative">
                    <select
                      value={matPageSize}
                      onChange={e => {
                        const newSize = Number(e.target.value);
                        setMatPageSize(newSize);
                        setMatPage(1);
                        setMatJumpPage('1');
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
                      disabled={currentMatPage <= 1}
                      onClick={() => {
                        const prev = Math.max(1, currentMatPage - 1);
                        setMatPage(prev);
                        setMatJumpPage(String(prev));
                      }}
                      className={cn(
                        "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                        currentMatPage <= 1
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                      )}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {Array.from({ length: totalMatPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setMatPage(p);
                          setMatJumpPage(String(p));
                        }}
                        className={cn(
                          "min-w-[28px] h-[28px] px-2 rounded-md border text-[12px] font-medium transition-colors cursor-pointer",
                          currentMatPage === p
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentMatPage >= totalMatPages}
                      onClick={() => {
                        const next = Math.min(totalMatPages, currentMatPage + 1);
                        setMatPage(next);
                        setMatJumpPage(String(next));
                      }}
                      className={cn(
                        "w-[28px] h-[28px] rounded-md border flex items-center justify-center transition-colors",
                        currentMatPage >= totalMatPages
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
                      value={matJumpPage}
                      onChange={e => setMatJumpPage(e.target.value)}
                      onBlur={() => {
                        const num = parseInt(matJumpPage, 10);
                        if (!isNaN(num)) {
                          const target = Math.min(Math.max(1, num), totalMatPages);
                          setMatPage(target);
                          setMatJumpPage(String(target));
                        } else {
                          setMatJumpPage(String(currentMatPage));
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const num = parseInt(matJumpPage, 10);
                          if (!isNaN(num)) {
                            const target = Math.min(Math.max(1, num), totalMatPages);
                            setMatPage(target);
                            setMatJumpPage(String(target));
                          } else {
                            setMatJumpPage(String(currentMatPage));
                          }
                        }
                      }}
                      className="w-[42px] h-[28px] text-center rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <span>页</span>
                  </div>
                </div>
              </div>

              {/* 新增模块：BOM明细（仅整单外协展示，位于2产品信息模块中、产品信息下方，支持分页和字段配置） */}
              {outsourcingType !== '工序外协' && (
                <div className="mt-6 pt-5 border-t border-slate-200/80">
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
                      {renderBomColumnConfigControl('bom-section', 'right')}
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
                            <td colSpan={visibleBomColumns.length} className="h-[180px] text-center align-middle">
                              <div className="flex flex-col items-center justify-center">
                                <div className="text-[13px] text-slate-700 font-medium">暂无BOM明细</div>
                                <div className="text-[12px] text-slate-400 mt-3">
                                  在上方产品信息中添加或选择产品后将自动展示对应 BOM 明细。
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

                  {/* BOM明细 分页栏 */}
                  <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-slate-600 select-none">
                    <div className="flex items-center gap-5">
                      <div>
                        <span className="text-slate-500">总数量：</span>
                        <span className="font-bold text-slate-900">{totalBomStandardUsageSum}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span>共 {filteredAndSortedBomItems.length} 条</span>
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
            </div>

            {/* Card 3: 外协费用 */}
            <div ref={section3Ref} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h3 className="text-[14px] font-bold text-slate-900">外协费用</h3>
              </div>

              <div className="grid grid-cols-4 gap-x-5 items-center">
                {/* 合计价格 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    合计价格
                  </label>
                  <input
                    type="text"
                    value={feeTotalPrice.toFixed(2)}
                    disabled
                    readOnly
                    className="w-full h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-100/80 text-[12px] text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* * 优惠率(%) */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>优惠率(%)
                  </label>
                  <div className="h-[34px] rounded-lg border border-slate-200 bg-white flex items-stretch overflow-hidden focus-within:border-blue-500">
                    <input
                      type="text"
                      value={discountRate}
                      onChange={e => setDiscountRate(e.target.value)}
                      onBlur={() => {
                        const num = Math.min(100, Math.max(0, parseFloat(discountRate) || 0));
                        setDiscountRate(num.toFixed(2));
                      }}
                      className="flex-1 min-w-0 px-3 text-[12px] text-slate-700 focus:outline-none"
                    />
                    <div className="w-[26px] border-l border-slate-200 flex flex-col divide-y divide-slate-200 bg-slate-50/40 shrink-0">
                      <button
                        type="button"
                        onClick={() => stepDiscountRate(1)}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepDiscountRate(-1)}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* * 定金金额 */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                    <span className="text-red-500 mr-0.5">*</span>定金金额
                  </label>
                  <div className="h-[34px] rounded-lg border border-slate-200 bg-white flex items-stretch overflow-hidden focus-within:border-blue-500">
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      onBlur={() => {
                        const num = Math.max(0, parseFloat(depositAmount) || 0);
                        setDepositAmount(num.toFixed(2));
                      }}
                      className="flex-1 min-w-0 px-3 text-[12px] text-slate-700 focus:outline-none"
                    />
                    <div className="w-[26px] border-l border-slate-200 flex flex-col divide-y divide-slate-200 bg-slate-50/40 shrink-0">
                      <button
                        type="button"
                        onClick={() => stepDepositAmount(1)}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepDepositAmount(-1)}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 右侧金额汇总展示：优惠金额 / 优惠后金额 / 待付金额 */}
                <div className="flex flex-col items-end justify-center text-right select-none">
                  <div className="text-[12px] font-semibold text-red-500">
                    优惠金额：¥{discountAmountNum.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-baseline justify-end gap-1.5 mt-1">
                    <span className="text-[13px] font-medium text-slate-900">优惠后金额：</span>
                    <span className="text-[20px] font-bold text-blue-600 leading-tight">
                      ¥{afterDiscountAmountNum.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    待付金额：¥{payableAmountNum.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* 费用说明 */}
              <div className="mt-4">
                <label className="block text-[12px] font-bold text-slate-800 mb-1.5">
                  费用说明
                </label>
                <textarea
                  rows={4}
                  value={feeDescription}
                  onChange={e => setFeeDescription(e.target.value)}
                  placeholder="请输入费用构成、结算约定等说明"
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="h-[52px] bg-white border-t border-slate-200/80 px-6 flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="h-[32px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer transition-colors"
        >
          取消
        </button>

        {activeStep > 1 && (
          <button
            type="button"
            onClick={() => scrollToStep((activeStep - 1) as 1 | 2)}
            className="h-[32px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer transition-colors"
          >
            上一步
          </button>
        )}

        <button
          type="button"
          disabled={activeStep === 3}
          onClick={() => {
            if (activeStep < 3) scrollToStep((activeStep + 1) as 2 | 3);
          }}
          className={cn(
            "h-[32px] px-4 rounded-lg border text-[12px] font-medium transition-colors",
            activeStep === 3
              ? "border-blue-100 bg-blue-50/40 text-blue-300 cursor-not-allowed"
              : "border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 cursor-pointer"
          )}
        >
          下一步
        </button>

        <button
          type="button"
          onClick={() => handleSaveOrSubmit('草稿')}
          className="h-[32px] px-4 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 text-[12px] font-medium cursor-pointer transition-colors"
        >
          保存
        </button>

        <button
          type="button"
          onClick={() => handleSaveOrSubmit('进行中')}
          className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium shadow-2xs cursor-pointer transition-colors"
        >
          提交
        </button>
      </div>

      <OutsourcingAppSelectModal
        open={isAppModalOpen}
        selectedApplicationNo={outsourcingAppNo}
        onClose={() => setIsAppModalOpen(false)}
        onConfirm={handleConfirmOutsourcingAppModal}
      />

      <SalesOrderSelectModal
        isOpen={isSalesOrderModalOpen}
        onClose={() => setIsSalesOrderModalOpen(false)}
        initialOrderNo={salesOrder.split('、')[0] || undefined}
        mode="material"
        outsourcingType={outsourcingType}
        onConfirm={handleConfirmSalesOrderModal}
      />

      {/* 点击 BOM版本 弹窗展示 BOM 信息 */}
      {bomModalTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setOpenBomConfigTarget(null);
            setBomModalTarget(null);
          }}
        >
          <div
            onClick={e => {
              e.stopPropagation();
              if (openBomConfigTarget === 'bom-modal') {
                setOpenBomConfigTarget(null);
              }
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-[1180px] max-w-[96vw] max-h-[86vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-[16px] font-bold text-slate-900">BOM 信息详情</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[12px] font-medium">
                  {bomModalTarget.materialName} ({bomModalTarget.materialCode}) · BOM版本 {bomModalTarget.bomVersion}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {renderBomColumnConfigControl('bom-modal')}
                <button
                  type="button"
                  onClick={() => {
                    setOpenBomConfigTarget(null);
                    setBomModalTarget(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="关闭"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-auto custom-scrollbar">
              <div className="border border-slate-200/80 rounded-lg overflow-x-auto custom-scrollbar">
                <table className="w-max min-w-full border-collapse text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-700 font-bold">
                    <tr className="h-[38px]">
                      {visibleBomColumns.map((col, cIdx) => (
                        <th
                          key={col.key}
                          className={cn(
                            "px-3",
                            cIdx < visibleBomColumns.length - 1 && "border-r border-slate-200/60",
                            col.align === 'right' && "text-right",
                            col.align === 'center' && "text-center"
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {visibleBomColumns.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-400">
                          暂无显示字段，请在右上角「字段配置」中勾选需要展示的字段
                        </td>
                      </tr>
                    ) : (
                      getBomDetailsForMaterial(
                        bomModalTarget.materialCode,
                        bomModalTarget.materialName,
                        bomModalTarget.bomVersion,
                        {
                          salesOrder: bomModalTarget.salesOrder,
                          salesOrderLine: bomModalTarget.salesOrderLine,
                          productCode: bomModalTarget.productCode,
                          productName: bomModalTarget.productName,
                          productSpec: bomModalTarget.productSpec,
                        }
                      ).map((bom, bIdx) => (
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
                              {renderBomCellContent(bom, bIdx, col.key)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenBomConfigTarget(null);
                  setBomModalTarget(null);
                }}
                className="h-[34px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium cursor-pointer transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
