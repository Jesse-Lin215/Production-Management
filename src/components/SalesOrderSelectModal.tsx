import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check, Maximize2, Minimize2, Filter, SlidersHorizontal, Move, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SalesOrderModalMaterialItem {
  id: string;
  sourceOrderNo: string;
  lineNo: string;
  materialName: string;
  materialCode: string;
  materialCategory?: string;
  specification: string;
  quantity: number;
  unit: string;
  category?: string;
  bomVersion?: string;
  customer?: string;
  planDeliveryDate?: string;
  productCode?: string;
  productName?: string;
  productSpec?: string;
  productCategory?: string;
}

export interface OngoingSalesOrder {
  orderNo: string;
  customer: string;
  planDeliveryDate: string;
  items: SalesOrderModalMaterialItem[];
}

interface ModalColConfig {
  key: string;
  label: string;
  type: 'search' | 'filter';
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
  visible: boolean;
  pinned?: 'left' | 'right' | null;
}

const DEFAULT_MODAL_MATERIAL_COLS: ModalColConfig[] = [
  { key: 'sourceOrderNo', label: '来源销售订单', type: 'search', sortable: true, visible: true },
  { key: 'lineNo', label: '项次', type: 'search', sortable: true, widthClass: 'w-[86px]', visible: true },
  { key: 'productCode', label: '产品编码', type: 'search', sortable: true, visible: true },
  { key: 'productName', label: '产品名称', type: 'search', visible: true },
  { key: 'productCategory', label: '产品分类', type: 'filter', visible: true },
  { key: 'productSpec', label: '产品规格', type: 'search', widthClass: 'w-[150px]', visible: true },
  { key: 'bomVersion', label: 'BOM版本', type: 'filter', visible: true },
  { key: 'materialCode', label: '物料编码', type: 'search', sortable: true, visible: true },
  { key: 'materialName', label: '物料名称', type: 'search', visible: true },
  { key: 'materialCategory', label: '物料分类', type: 'filter', visible: true },
  { key: 'specification', label: '物料规格', type: 'search', widthClass: 'w-[150px]', visible: true },
  { key: 'unit', label: '单位', type: 'filter', widthClass: 'w-[86px]', visible: true },
  { key: 'quantity', label: '数量', type: 'search', sortable: true, align: 'right', widthClass: 'w-[96px]', visible: true },
];

const DEFAULT_MODAL_WHOLE_ORDER_COLS: ModalColConfig[] = [
  { key: 'sourceOrderNo', label: '来源销售订单', type: 'search', sortable: true, visible: true },
  { key: 'lineNo', label: '项次', type: 'search', sortable: true, widthClass: 'w-[86px]', visible: true },
  { key: 'productCode', label: '产品编码', type: 'search', sortable: true, visible: true },
  { key: 'productName', label: '产品名称', type: 'search', visible: true },
  { key: 'productCategory', label: '产品分类', type: 'filter', visible: true },
  { key: 'productSpec', label: '产品规格', type: 'search', widthClass: 'w-[150px]', visible: true },
  { key: 'bomVersion', label: 'BOM版本', type: 'filter', visible: true },
  { key: 'unit', label: '单位', type: 'filter', widthClass: 'w-[86px]', visible: true },
  { key: 'quantity', label: '数量', type: 'search', sortable: true, align: 'right', widthClass: 'w-[96px]', visible: true },
];

const DEFAULT_MODAL_PRODUCT_COLS: ModalColConfig[] = [
  { key: 'sourceOrderNo', label: '来源销售订单', type: 'search', sortable: true, widthClass: 'w-[140px]', visible: true },
  { key: 'lineNo', label: '项次', type: 'search', sortable: true, widthClass: 'w-[80px]', visible: true },
  { key: 'category', label: '物料分类', type: 'filter', widthClass: 'w-[110px]', visible: true },
  { key: 'materialName', label: '物料名称', type: 'search', widthClass: 'w-[160px]', visible: true },
  { key: 'materialCode', label: '物料编码', type: 'search', sortable: true, widthClass: 'w-[140px]', visible: true },
  { key: 'bomVersion', label: 'BOM版本', type: 'filter', widthClass: 'w-[100px]', visible: true },
  { key: 'specification', label: '规格', type: 'search', widthClass: 'w-[150px]', visible: true },
  { key: 'quantity', label: '数量', type: 'search', sortable: true, align: 'right', widthClass: 'w-[90px]', visible: true },
  { key: 'unit', label: '单位', type: 'filter', widthClass: 'w-[80px]', visible: true },
];

export const ONGOING_SALES_ORDERS: OngoingSalesOrder[] = [
  {
    orderNo: 'HY-26C-081',
    customer: '华域自动化设备有限公司',
    planDeliveryDate: '2026-11-15',
    items: [
      {
        id: 'hy-081-1',
        sourceOrderNo: 'HY-26C-081',
        lineNo: '1',
        materialName: '欧标插头线',
        materialCode: '02-00DX-02161',
        specification: 'HY-LD250',
        quantity: 1,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '华域自动化设备有限公司',
        planDeliveryDate: '2026-11-15',
      },
      {
        id: 'hy-081-2',
        sourceOrderNo: 'HY-26C-081',
        lineNo: '2',
        materialName: '普通急停按钮',
        materialCode: '02-00KG-02165',
        specification: 'B0409-M606-D11',
        quantity: 1,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '华域自动化设备有限公司',
        planDeliveryDate: '2026-11-15',
      },
      {
        id: 'hy-081-3',
        sourceOrderNo: 'HY-26C-081',
        lineNo: '3',
        materialName: '换边机',
        materialCode: 'CG-02167',
        specification: 'B0393-M007-D11',
        quantity: 5,
        unit: 'PCS',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '华域自动化设备有限公司',
        planDeliveryDate: '2026-11-15',
      },
      {
        id: 'hy-081-4',
        sourceOrderNo: 'HY-26C-081',
        lineNo: '4',
        materialName: '2米移栽机',
        materialCode: 'CG-00002',
        specification: 'B0376-M007-D11',
        quantity: 2,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '华域自动化设备有限公司',
        planDeliveryDate: '2026-11-15',
      },
    ],
  },
  {
    orderNo: 'HY-26C-080',
    customer: '比亚迪精密制造有限公司',
    planDeliveryDate: '2026-11-18',
    items: [
      {
        id: 'hy-080-1',
        sourceOrderNo: 'HY-26C-080',
        lineNo: '1',
        materialName: '0.5米双轨接驳台 2台',
        materialCode: '05-00240',
        specification: 'B0392-M007-D11',
        quantity: 2,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '比亚迪精密制造有限公司',
        planDeliveryDate: '2026-11-18',
      },
      {
        id: 'hy-080-2',
        sourceOrderNo: 'HY-26C-080',
        lineNo: '2',
        materialName: '2米移栽机',
        materialCode: 'CG-00002',
        specification: 'B0376-M007-D11',
        quantity: 3,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '比亚迪精密制造有限公司',
        planDeliveryDate: '2026-11-18',
      },
      {
        id: 'hy-080-3',
        sourceOrderNo: 'HY-26C-080',
        lineNo: '3',
        materialName: '换边机',
        materialCode: 'CG-02167',
        specification: 'B0393-M007-D11',
        quantity: 4,
        unit: 'PCS',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '比亚迪精密制造有限公司',
        planDeliveryDate: '2026-11-18',
      },
      {
        id: 'hy-080-4',
        sourceOrderNo: 'HY-26C-080',
        lineNo: '4',
        materialName: '欧标插头线',
        materialCode: '02-00DX-02161',
        specification: 'HY-LD250',
        quantity: 6,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '比亚迪精密制造有限公司',
        planDeliveryDate: '2026-11-18',
      },
    ],
  },
  {
    orderNo: 'HY-26C-079',
    customer: '华为技术有限公司',
    planDeliveryDate: '2026-11-20',
    items: [
      {
        id: 'hy-079-1',
        sourceOrderNo: 'HY-26C-079',
        lineNo: '1',
        materialName: '自动送板机 (Loader)',
        materialCode: 'A-00004',
        specification: 'B0344-M007-D11',
        quantity: 4,
        unit: '台',
        category: '自动化装备',
        bomVersion: 'V1.0',
        customer: '华为技术有限公司',
        planDeliveryDate: '2026-11-20',
      },
      {
        id: 'hy-079-2',
        sourceOrderNo: 'HY-26C-079',
        lineNo: '2',
        materialName: '智能手机A型 (Pro Max)',
        materialCode: 'PROD001',
        specification: 'B0344-M007-D11',
        quantity: 20,
        unit: '台',
        category: '智能终端',
        bomVersion: 'V2.1',
        customer: '华为技术有限公司',
        planDeliveryDate: '2026-11-20',
      },
      {
        id: 'hy-079-3',
        sourceOrderNo: 'HY-26C-079',
        lineNo: '3',
        materialName: '5G工业智能网关',
        materialCode: 'GW-5G-08',
        specification: 'B0341-M007-D11',
        quantity: 8,
        unit: '台',
        category: '通信设备',
        bomVersion: 'V1.5',
        customer: '华为技术有限公司',
        planDeliveryDate: '2026-11-20',
      },
    ],
  },
  {
    orderNo: 'HY-26C-078',
    customer: '立讯精密工业股份有限公司',
    planDeliveryDate: '2026-11-22',
    items: [
      {
        id: 'hy-078-1',
        sourceOrderNo: 'HY-26C-078',
        lineNo: '1',
        materialName: '伺服电机',
        materialCode: '02-00108',
        specification: 'B0342-M007-D11',
        quantity: 6,
        unit: '台',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '立讯精密工业股份有限公司',
        planDeliveryDate: '2026-11-22',
      },
      {
        id: 'hy-078-2',
        sourceOrderNo: 'HY-26C-078',
        lineNo: '2',
        materialName: '自动送板机 (Loader)',
        materialCode: 'A-00004',
        specification: 'B0344-M007-D11',
        quantity: 3,
        unit: '台',
        category: '自动化装备',
        bomVersion: 'V1.0',
        customer: '立讯精密工业股份有限公司',
        planDeliveryDate: '2026-11-22',
      },
      {
        id: 'hy-078-3',
        sourceOrderNo: 'HY-26C-078',
        lineNo: '3',
        materialName: '智能手机A型 (Pro Max)',
        materialCode: 'PROD001',
        specification: 'B0342-M007-D11',
        quantity: 15,
        unit: '台',
        category: '智能终端',
        bomVersion: 'V2.1',
        customer: '立讯精密工业股份有限公司',
        planDeliveryDate: '2026-11-22',
      },
    ],
  },
  {
    orderNo: 'HY-26C-077',
    customer: '汇川技术股份有限公司',
    planDeliveryDate: '2026-11-25',
    items: [
      {
        id: 'hy-077-1',
        sourceOrderNo: 'HY-26C-077',
        lineNo: '1',
        materialName: '5G工业智能网关',
        materialCode: 'GW-5G-08',
        specification: 'B0341-M007-D11',
        quantity: 10,
        unit: '台',
        category: '通信设备',
        bomVersion: 'V1.5',
        customer: '汇川技术股份有限公司',
        planDeliveryDate: '2026-11-25',
      },
      {
        id: 'hy-077-2',
        sourceOrderNo: 'HY-26C-077',
        lineNo: '2',
        materialName: '智能扫地机器人 V3',
        materialCode: 'ROB-V3-PRO',
        specification: 'B0341-M007-D11',
        quantity: 12,
        unit: '台',
        category: '智能家电',
        bomVersion: 'V3.0',
        customer: '汇川技术股份有限公司',
        planDeliveryDate: '2026-11-25',
      },
      {
        id: 'hy-077-3',
        sourceOrderNo: 'HY-26C-077',
        lineNo: '3',
        materialName: '智能人脸识别门锁 Pro',
        materialCode: 'LCK-FACE-01',
        specification: 'B0340-M007-D11',
        quantity: 15,
        unit: '套',
        category: '智能安防',
        bomVersion: 'V1.2',
        customer: '汇川技术股份有限公司',
        planDeliveryDate: '2026-11-25',
      },
    ],
  },
  {
    orderNo: 'HY-26C-076',
    customer: '大族激光科技产业集团',
    planDeliveryDate: '2026-11-26',
    items: [
      {
        id: 'hy-076-1',
        sourceOrderNo: 'HY-26C-076',
        lineNo: '1',
        materialName: '设备配件44',
        materialCode: '09-00412',
        specification: 'B0340-M007-D11',
        quantity: 8,
        unit: '件',
        category: '机加件',
        bomVersion: 'V1.0',
        customer: '大族激光科技产业集团',
        planDeliveryDate: '2026-11-26',
      },
      {
        id: 'hy-076-2',
        sourceOrderNo: 'HY-26C-076',
        lineNo: '2',
        materialName: '车载中控旋转大屏 15.6寸',
        materialCode: 'AUTO-DSP-15',
        specification: 'B0339-M007-D11',
        quantity: 10,
        unit: '套',
        category: '汽车电子',
        bomVersion: 'V2.0',
        customer: '大族激光科技产业集团',
        planDeliveryDate: '2026-11-26',
      },
      {
        id: 'hy-076-3',
        sourceOrderNo: 'HY-26C-076',
        lineNo: '3',
        materialName: '50W车载无线快充模块',
        materialCode: 'CHG-WLS-50',
        specification: 'B0331-M606-D11',
        quantity: 20,
        unit: '个',
        category: '汽车电子',
        bomVersion: 'V1.0',
        customer: '大族激光科技产业集团',
        planDeliveryDate: '2026-11-26',
      },
    ],
  },
  {
    orderNo: 'HY-26C-067',
    customer: '东莞市安可精密机械有限公司',
    planDeliveryDate: '2026-11-28',
    items: [
      {
        id: 'hy-067-1',
        sourceOrderNo: 'HY-26C-067',
        lineNo: '1',
        materialName: '换边机 (PRO)',
        materialCode: '08-00315',
        specification: 'B0339-M007-D11',
        quantity: 10,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '东莞市安可精密机械有限公司',
        planDeliveryDate: '2026-11-28',
      },
      {
        id: 'hy-067-2',
        sourceOrderNo: 'HY-26C-067',
        lineNo: '2',
        materialName: '换边机',
        materialCode: 'CG-02167',
        specification: 'B0393-M007-D11',
        quantity: 6,
        unit: 'PCS',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '东莞市安可精密机械有限公司',
        planDeliveryDate: '2026-11-28',
      },
    ],
  },
  {
    orderNo: 'HY-26C-074',
    customer: '宁德时代新能源科技股份有限公司',
    planDeliveryDate: '2026-12-01',
    items: [
      {
        id: 'hy-074-1',
        sourceOrderNo: 'HY-26C-074',
        lineNo: '1',
        materialName: '2米移栽机',
        materialCode: 'CG-00002',
        specification: 'B0331-M606-D11',
        quantity: 5,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '宁德时代新能源科技股份有限公司',
        planDeliveryDate: '2026-12-01',
      },
      {
        id: 'hy-074-2',
        sourceOrderNo: 'HY-26C-074',
        lineNo: '2',
        materialName: '0.5米双轨接驳台 2台',
        materialCode: '05-00240',
        specification: 'B0392-M007-D11',
        quantity: 4,
        unit: '台',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '宁德时代新能源科技股份有限公司',
        planDeliveryDate: '2026-12-01',
      },
    ],
  },
  {
    orderNo: 'HY-26C-073',
    customer: '格力智能装备有限公司',
    planDeliveryDate: '2026-12-03',
    items: [
      {
        id: 'hy-073-1',
        sourceOrderNo: 'HY-26C-073',
        lineNo: '1',
        materialName: '欧标插头线',
        materialCode: '02-00DX-02161',
        specification: 'B0331-M007-D11',
        quantity: 12,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '格力智能装备有限公司',
        planDeliveryDate: '2026-12-03',
      },
      {
        id: 'hy-073-2',
        sourceOrderNo: 'HY-26C-073',
        lineNo: '2',
        materialName: '普通急停按钮',
        materialCode: '02-00KG-02165',
        specification: 'B0409-M606-D11',
        quantity: 8,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '格力智能装备有限公司',
        planDeliveryDate: '2026-12-03',
      },
    ],
  },
  {
    orderNo: 'HY-26C-072',
    customer: '美的库卡智能制造科技园',
    planDeliveryDate: '2026-12-05',
    items: [
      {
        id: 'hy-072-1',
        sourceOrderNo: 'HY-26C-072',
        lineNo: '1',
        materialName: '换边机',
        materialCode: 'CG-02167',
        specification: 'HY-LD250',
        quantity: 3,
        unit: 'PCS',
        category: '成套设备',
        bomVersion: 'V1.0',
        customer: '美的库卡智能制造科技园',
        planDeliveryDate: '2026-12-05',
      },
      {
        id: 'hy-072-2',
        sourceOrderNo: 'HY-26C-072',
        lineNo: '2',
        materialName: '欧标插头线',
        materialCode: '02-00DX-02161',
        specification: 'HY-LD250',
        quantity: 5,
        unit: 'PCS',
        category: '标准件',
        bomVersion: 'V1.0',
        customer: '美的库卡智能制造科技园',
        planDeliveryDate: '2026-12-05',
      },
    ],
  },
];

// Specification codes matching the standard coding rule
export const SPEC_CODES = [
  'HY-LD250',
  'B0409-M606-D11',
  'B0393-M007-D11',
  'B0392-M007-D11',
  'B0376-M007-D11',
  'B0344-M007-D11',
  'B0342-M007-D11',
  'B0341-M007-D11',
  'B0340-M007-D11',
  'B0339-M007-D11',
  'B0331-M606-D11',
  'B0331-M007-D11',
];

// Outsourceable material items derived from sales orders for 外协申请单 / 外协工单 (工序外协)
export const APPLICATION_MATERIAL_TEMPLATES = [
  { suffix: '01', nameSuffix: '主结构件', materialCategory: '机加件', unit: '件', usage: 1 },
  { suffix: '02', nameSuffix: '钣金防护罩', materialCategory: '钣金件', unit: '件', usage: 2 },
];

function SortTriangles({ activeDir }: { activeDir?: 'asc' | 'desc' | null }) {
  return (
    <span className="inline-flex flex-col leading-none ml-0.5 text-[8px]">
      <span className={cn("leading-[7px]", activeDir === 'asc' ? "text-blue-600" : "text-slate-300")}>▲</span>
      <span className={cn("leading-[7px]", activeDir === 'desc' ? "text-blue-600" : "text-slate-300")}>▼</span>
    </span>
  );
}

interface SalesOrderSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNo?: string;
  selectedOrderNos?: string[];
  filterProductCode?: string;
  filterProductName?: string;
  mode?: 'product' | 'material' | 'wholeOrder';
  outsourcingType?: '工序外协' | '整单外协';
  onConfirm: (selectedOrders: string[], selectedItems: SalesOrderModalMaterialItem[]) => void;
}

export default function SalesOrderSelectModal({
  isOpen,
  onClose,
  initialOrderNo,
  selectedOrderNos,
  filterProductCode,
  filterProductName,
  mode = 'product',
  outsourcingType,
  onConfirm,
}: SalesOrderSelectModalProps) {
  const effectiveMode: 'product' | 'material' | 'wholeOrder' =
    outsourcingType === '整单外协'
      ? 'wholeOrder'
      : outsourcingType === '工序外协'
      ? 'material'
      : mode;

  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mergeQuantity, setMergeQuantity] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [jumpPage, setJumpPage] = useState<string>('1');

  // Column header search/filter & sort states
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  // Column configuration states
  const [materialCols, setMaterialCols] = useState<ModalColConfig[]>(() =>
    DEFAULT_MODAL_MATERIAL_COLS.map(c => ({ ...c }))
  );
  const [wholeOrderCols, setWholeOrderCols] = useState<ModalColConfig[]>(() =>
    DEFAULT_MODAL_WHOLE_ORDER_COLS.map(c => ({ ...c }))
  );
  const [productCols, setProductCols] = useState<ModalColConfig[]>(() =>
    DEFAULT_MODAL_PRODUCT_COLS.map(c => ({ ...c }))
  );
  const [isColConfigOpen, setIsColConfigOpen] = useState(false);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  const activeCols =
    effectiveMode === 'wholeOrder'
      ? wholeOrderCols
      : effectiveMode === 'material'
      ? materialCols
      : productCols;
  const setActiveCols =
    effectiveMode === 'wholeOrder'
      ? setWholeOrderCols
      : effectiveMode === 'material'
      ? setMaterialCols
      : setProductCols;
  const visibleCols = activeCols.filter(c => c.visible);

  const toggleColVisible = (key: string) => {
    setActiveCols(prev => prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const handleSelectAllCols = () => {
    setActiveCols(prev => prev.map(c => ({ ...c, visible: true })));
  };

  const handleClearAllCols = () => {
    setActiveCols(prev => prev.map(c => ({ ...c, visible: false })));
  };

  const handleResetCols = () => {
    if (effectiveMode === 'wholeOrder') {
      setWholeOrderCols(DEFAULT_MODAL_WHOLE_ORDER_COLS.map(c => ({ ...c })));
    } else if (effectiveMode === 'material') {
      setMaterialCols(DEFAULT_MODAL_MATERIAL_COLS.map(c => ({ ...c })));
    } else {
      setProductCols(DEFAULT_MODAL_PRODUCT_COLS.map(c => ({ ...c })));
    }
  };

  const moveColOrder = (idx: number, direction: 'up' | 'down') => {
    setActiveCols(prev => {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const toggleColPin = (idx: number, side: 'left' | 'right') => {
    setActiveCols(prev => {
      const current = prev[idx];
      const nextPin = current.pinned === side ? null : side;
      const updated = prev.map((c, i) => (i === idx ? { ...c, pinned: nextPin } : c));
      if (nextPin === 'left') {
        const [moved] = updated.splice(idx, 1);
        updated.unshift(moved);
      } else if (nextPin === 'right') {
        const [moved] = updated.splice(idx, 1);
        updated.push(moved);
      }
      return updated;
    });
  };

  const handleDropCol = (targetIdx: number) => {
    if (draggedColIdx === null || draggedColIdx === targetIdx) {
      setDraggedColIdx(null);
      return;
    }
    setActiveCols(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedColIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDraggedColIdx(null);
  };

  const allRawItems = useMemo(() => {
    const list: SalesOrderModalMaterialItem[] = [];
    let specIdx = 0;
    const candidateOrders = filterProductCode
      ? ONGOING_SALES_ORDERS.filter(order =>
          order.items.some(item => item.materialCode === filterProductCode)
        )
      : ONGOING_SALES_ORDERS;

    candidateOrders.forEach(order => {
      if (effectiveMode === 'material') {
        order.items.forEach(prodItem => {
          if (filterProductCode && prodItem.materialCode !== filterProductCode) return;
          APPLICATION_MATERIAL_TEMPLATES.forEach((tpl, tIdx) => {
            const matSpec = SPEC_CODES[specIdx % SPEC_CODES.length];
            specIdx += 1;
            list.push({
              id: `${prodItem.id}-mat-${tIdx + 1}`,
              sourceOrderNo: prodItem.sourceOrderNo,
              lineNo: prodItem.lineNo,
              productCode: prodItem.materialCode,
              productName: prodItem.materialName,
              productSpec: prodItem.specification,
              productCategory: prodItem.category || '成套设备',
              bomVersion: prodItem.bomVersion || 'V1.0',
              materialCode: `${prodItem.materialCode}-${tpl.suffix}`,
              materialName: `${prodItem.materialName}${tpl.nameSuffix}`,
              materialCategory: tpl.materialCategory,
              specification: matSpec,
              unit: tpl.unit,
              quantity: prodItem.quantity * tpl.usage,
              category: tpl.materialCategory,
              customer: prodItem.customer,
              planDeliveryDate: prodItem.planDeliveryDate,
            });
          });
        });
      } else if (effectiveMode === 'wholeOrder') {
        order.items.forEach(prodItem => {
          if (filterProductCode && prodItem.materialCode !== filterProductCode) return;
          list.push({
            id: `${prodItem.id}-whole`,
            sourceOrderNo: prodItem.sourceOrderNo,
            lineNo: prodItem.lineNo,
            productCode: prodItem.materialCode,
            productName: prodItem.materialName,
            productSpec: prodItem.specification,
            productCategory: prodItem.category || '成套设备',
            bomVersion: prodItem.bomVersion || 'V1.0',
            materialCode: prodItem.materialCode,
            materialName: prodItem.materialName,
            materialCategory: prodItem.category || '成套设备',
            specification: prodItem.specification,
            unit: prodItem.unit,
            quantity: prodItem.quantity,
            category: prodItem.category || '成套设备',
            customer: prodItem.customer,
            planDeliveryDate: prodItem.planDeliveryDate,
          });
        });
      } else {
        const orderItems = filterProductCode
          ? order.items.filter(item => item.materialCode === filterProductCode)
          : order.items;
        list.push(...orderItems);
      }
    });
    return list;
  }, [effectiveMode, filterProductCode]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    const targetOrders =
      selectedOrderNos && selectedOrderNos.length > 0
        ? selectedOrderNos
        : initialOrderNo
        ? initialOrderNo.split('、').map(s => s.trim()).filter(Boolean)
        : [];
    if (targetOrders.length > 0) {
      const matchedIds = allRawItems
        .filter(item => targetOrders.includes(item.sourceOrderNo))
        .map(item => item.id);
      if (matchedIds.length > 0) {
        return new Set(matchedIds);
      }
    }
    const firstOrderNo = allRawItems[0]?.sourceOrderNo;
    const firstOrderItems = allRawItems.filter(i => i.sourceOrderNo === firstOrderNo).map(i => i.id);
    return new Set(firstOrderItems);
  });

  useEffect(() => {
    if (!isOpen) return;
    const targetOrders =
      selectedOrderNos && selectedOrderNos.length > 0
        ? selectedOrderNos
        : initialOrderNo
        ? initialOrderNo.split('、').map(s => s.trim()).filter(Boolean)
        : [];
    if (targetOrders.length > 0) {
      const matchedIds = allRawItems
        .filter(item => targetOrders.includes(item.sourceOrderNo))
        .map(item => item.id);
      if (matchedIds.length > 0) {
        setSelectedItemIds(new Set(matchedIds));
        return;
      }
    }
    const firstOrderNo = allRawItems[0]?.sourceOrderNo;
    const firstOrderItems = allRawItems.filter(i => i.sourceOrderNo === firstOrderNo).map(i => i.id);
    setSelectedItemIds(new Set(firstOrderItems));
  }, [isOpen, allRawItems, selectedOrderNos, initialOrderNo]);

  const getFieldValue = (item: SalesOrderModalMaterialItem, colKey: string): string => {
    switch (colKey) {
      case 'sourceOrderNo':
        return item.sourceOrderNo || '';
      case 'lineNo':
        return item.lineNo || '';
      case 'productCode':
        return item.productCode || '';
      case 'productName':
        return item.productName || '';
      case 'productCategory':
        return item.productCategory || '成套设备';
      case 'productSpec':
        return item.productSpec || '';
      case 'bomVersion':
        return item.bomVersion || 'V1.0';
      case 'materialCode':
        return item.materialCode || '';
      case 'materialName':
        return item.materialName || '';
      case 'materialCategory':
        return item.materialCategory || item.category || '机加件';
      case 'category':
        return item.category || '成套设备';
      case 'specification':
        return item.specification || '';
      case 'unit':
        return item.unit || '';
      case 'quantity':
        return String(item.quantity ?? '');
      default:
        return '';
    }
  };

  const filteredRawItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRawItems.filter(item => {
      if (q) {
        const matchGlobal =
          item.sourceOrderNo.toLowerCase().includes(q) ||
          item.materialName.toLowerCase().includes(q) ||
          item.materialCode.toLowerCase().includes(q) ||
          (item.productName && item.productName.toLowerCase().includes(q)) ||
          (item.productCode && item.productCode.toLowerCase().includes(q)) ||
          (item.productCategory && item.productCategory.toLowerCase().includes(q)) ||
          (item.materialCategory && item.materialCategory.toLowerCase().includes(q)) ||
          (item.productSpec && item.productSpec.toLowerCase().includes(q)) ||
          (item.specification && item.specification.toLowerCase().includes(q));
        if (!matchGlobal) return false;
      }

      for (const [colKey, filterVal] of Object.entries(colFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getFieldValue(item, colKey).toLowerCase();
        if (!cellVal.includes(trimmed)) {
          return false;
        }
      }
      return true;
    });
  }, [allRawItems, searchQuery, colFilters]);

  const displayedItems = useMemo(() => {
    let baseList = filteredRawItems;
    if (mergeQuantity) {
      const mergedMap = new Map<string, SalesOrderModalMaterialItem>();
      filteredRawItems.forEach(item => {
        const mergeKey = effectiveMode === 'wholeOrder' ? (item.productCode || item.materialCode) : item.materialCode;
        const existing = mergedMap.get(mergeKey);
        if (existing) {
          mergedMap.set(mergeKey, {
            ...existing,
            sourceOrderNo: Array.from(new Set([...existing.sourceOrderNo.split('、'), item.sourceOrderNo])).join('、'),
            lineNo: Array.from(new Set([...existing.lineNo.split('、'), item.lineNo])).join('、'),
            quantity: existing.quantity + item.quantity,
          });
        } else {
          mergedMap.set(mergeKey, { ...item });
        }
      });
      baseList = Array.from(mergedMap.values());
    }

    if (!sortConfig) return baseList;
    const { key, dir } = sortConfig;
    return [...baseList].sort((a, b) => {
      if (key === 'quantity' || key === 'lineNo') {
        const numA = parseFloat(getFieldValue(a, key)) || 0;
        const numB = parseFloat(getFieldValue(b, key)) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      const valA = getFieldValue(a, key);
      const valB = getFieldValue(b, key);
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [filteredRawItems, mergeQuantity, sortConfig, effectiveMode]);

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () => displayedItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [displayedItems, safePage, pageSize]
  );

  if (!isOpen) return null;

  const handleToggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allDisplayedChecked =
    paginatedItems.length > 0 && paginatedItems.every(item => selectedItemIds.has(item.id));

  const handleToggleAllItems = () => {
    if (allDisplayedChecked) {
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        paginatedItems.forEach(item => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        paginatedItems.forEach(item => next.add(item.id));
        return next;
      });
    }
  };

  const selectedCount = displayedItems.filter(item => selectedItemIds.has(item.id)).length;

  const handleConfirm = () => {
    const chosenItems = displayedItems.filter(item => selectedItemIds.has(item.id));
    const finalItems = chosenItems.length > 0 ? chosenItems : displayedItems.slice(0, 1);
    const uniqueOrderNos: string[] = Array.from(
      new Set<string>(
        finalItems.flatMap(item =>
          String(item.sourceOrderNo || '')
            .split('、')
            .map(s => s.trim())
            .filter(Boolean)
        )
      )
    );
    onConfirm(uniqueOrderNos, finalItems);
    onClose();
  };

  const renderFilterableTh = (
    colKey: string,
    label: string,
    type: 'search' | 'filter',
    options?: { sortable?: boolean; align?: 'left' | 'right' | 'center'; widthClass?: string }
  ) => {
    const currentVal = colFilters[colKey] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeHeaderMenu === colKey;
    const isSorted = sortConfig?.key === colKey ? sortConfig.dir : null;

    const uniqueOptions =
      type === 'filter'
        ? Array.from(new Set(allRawItems.map(item => getFieldValue(item, colKey)).filter(Boolean)))
        : [];

    return (
      <th
        key={colKey}
        onClick={e => e.stopPropagation()}
        className={cn(
          "px-3.5 border-r border-slate-200/60 font-bold text-slate-800 relative select-none",
          options?.widthClass,
          options?.align === 'right' && "text-right",
          options?.align === 'center' && "text-center"
        )}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 cursor-pointer group",
            options?.align === 'right' && "justify-end",
            options?.align === 'center' && "justify-center"
          )}
        >
          <button
            type="button"
            onClick={() => setActiveHeaderMenu(prev => (prev === colKey ? null : colKey))}
            className="inline-flex items-center gap-1.5 cursor-pointer"
          >
            {type === 'search' ? (
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
            <span className={cn("text-[13px] font-bold", isActive ? "text-blue-600" : "text-slate-800")}>
              {label}
            </span>
          </button>

          {options?.sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setSortConfig(prev => {
                  if (prev?.key === colKey) {
                    if (prev.dir === 'asc') return { key: colKey, dir: 'desc' };
                    return null;
                  }
                  return { key: colKey, dir: 'asc' };
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
              "absolute top-full mt-1 z-30 w-[210px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal",
              options?.align === 'right' ? "right-2" : "left-2"
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
                    onChange={e => setColFilters(prev => ({ ...prev, [colKey]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveHeaderMenu(null);
                    }}
                    placeholder={`搜索${label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setColFilters(prev => ({ ...prev, [colKey]: '' }));
                      setActiveHeaderMenu(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHeaderMenu(null)}
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
                    setColFilters(prev => ({ ...prev, [colKey]: '' }));
                    setActiveHeaderMenu(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] flex items-center justify-between cursor-pointer",
                    !currentVal ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>全部</span>
                  {!currentVal && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <div className="max-h-[180px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {uniqueOptions.map(opt => {
                    const selected = currentVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setColFilters(prev => ({ ...prev, [colKey]: opt }));
                          setActiveHeaderMenu(null);
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

  const renderModalCell = (item: SalesOrderModalMaterialItem, colKey: string) => {
    switch (colKey) {
      case 'sourceOrderNo':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-800 font-medium">
            {item.sourceOrderNo}
          </td>
        );
      case 'lineNo':
        return (
          <td key={colKey} className="px-3 border-r border-slate-200/60 text-slate-800 font-mono">
            {item.lineNo}
          </td>
        );
      case 'productCode':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-600 font-mono">
            {item.productCode}
          </td>
        );
      case 'productName':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-700">
            {item.productName}
          </td>
        );
      case 'productCategory':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-600">
            {item.productCategory || '成套设备'}
          </td>
        );
      case 'productSpec':
        return (
          <td key={colKey} className="w-[150px] max-w-[150px] truncate px-3.5 border-r border-slate-200/60 text-slate-700 font-mono">
            {item.productSpec || '-'}
          </td>
        );
      case 'bomVersion':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-600">
            {item.bomVersion || 'V1.0'}
          </td>
        );
      case 'materialCode':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-800 font-mono font-medium">
            {item.materialCode}
          </td>
        );
      case 'materialName':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-800 font-medium">
            {item.materialName}
          </td>
        );
      case 'materialCategory':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-600">
            {item.materialCategory || item.category || '机加件'}
          </td>
        );
      case 'category':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-600">
            {item.category || '成套设备'}
          </td>
        );
      case 'specification':
        return (
          <td key={colKey} className="w-[150px] max-w-[150px] truncate px-3.5 border-r border-slate-200/60 text-slate-700 font-mono">
            {item.specification}
          </td>
        );
      case 'unit':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-slate-700">
            {item.unit}
          </td>
        );
      case 'quantity':
        return (
          <td key={colKey} className="px-3.5 border-r border-slate-200/60 text-right text-slate-800 font-medium">
            {item.quantity}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={e => {
          e.stopPropagation();
          setActiveHeaderMenu(null);
          setIsColConfigOpen(false);
        }}
        className={cn(
          "bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200",
          isFullscreen
            ? "w-[98vw] h-[94vh]"
            : effectiveMode === 'material'
            ? "w-[1440px] max-w-[96vw] h-[680px] max-h-[90vh]"
            : "w-[1120px] max-w-[96vw] h-[680px] max-h-[90vh]"
        )}
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
              从销售订单导入
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[12px] font-medium">
              已选 {selectedCount} / {displayedItems.length} 项
            </span>
            {filterProductCode && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[12px] font-medium">
                已按产品过滤：仅显示包含「{filterProductName || filterProductCode} ({filterProductCode})」的销售订单
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title={isFullscreen ? "还原窗口" : "最大化窗口"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="关闭"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Single-List Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 px-6 pb-2 overflow-hidden">
          {/* Toolbar: Search + Merge Toggle + Column Config */}
          <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
            <div className="relative w-[340px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  effectiveMode === 'wholeOrder'
                    ? "搜索销售订单号、产品名称或编码..."
                    : "搜索销售订单号、物料名称或编码..."
                }
                className="w-full h-[36px] pl-9 pr-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {Object.values(colFilters).some(v => String(v || '').trim() !== '') && (
                <button
                  type="button"
                  onClick={() => setColFilters({})}
                  className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  清空列筛选
                </button>
              )}
              <div
                onClick={() => setMergeQuantity(prev => !prev)}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <span className="text-[13px] text-slate-700">
                  {effectiveMode === 'wholeOrder' ? '合并相同产品数量' : '合并相同物料数量'}
                </span>
                <div
                  className={cn(
                    "w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center",
                    mergeQuantity ? "bg-[#2563eb] justify-end" : "bg-slate-300 justify-start"
                  )}
                >
                  <div className="w-4.5 h-4.5 rounded-full bg-white shadow-2xs" />
                </div>
              </div>

              {/* 字段配置按钮与弹窗（参考图样式） */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveHeaderMenu(null);
                    setIsColConfigOpen(prev => !prev);
                  }}
                  title="字段配置"
                  className={cn(
                    "w-[34px] h-[34px] rounded-lg border flex items-center justify-center transition-colors cursor-pointer",
                    isColConfigOpen
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-600 hover:text-blue-600"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4 rotate-90" />
                </button>

                {isColConfigOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 text-[13px] select-none overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[14px]">显示字段</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleSelectAllCols}
                          className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllCols}
                          className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto px-3 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                      {activeCols.map((col, idx) => (
                        <div
                          key={col.key}
                          draggable
                          onDragStart={() => setDraggedColIdx(idx)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleDropCol(idx)}
                          className={cn(
                            "flex items-center justify-between py-2.5 px-1.5 rounded-lg hover:bg-slate-50/80 transition-colors",
                            draggedColIdx === idx && "opacity-50 bg-blue-50/40"
                          )}
                        >
                          <div
                            onClick={() => toggleColVisible(col.key)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            <span
                              className={cn(
                                "w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-colors shrink-0",
                                col.visible
                                  ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                                  : "border-slate-300 bg-white"
                              )}
                            >
                              {col.visible && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </span>
                            <span
                              className={cn(
                                "text-[13px] truncate",
                                col.visible ? "text-[#2563eb] font-medium" : "text-slate-600"
                              )}
                            >
                              {col.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColOrder(idx, 'up')}
                              title="向前移动"
                              className={cn(
                                "w-6 h-5 rounded border text-[9px] flex items-center justify-center transition-colors",
                                idx === 0
                                  ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                                  : "border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500 cursor-pointer"
                              )}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeCols.length - 1}
                              onClick={() => moveColOrder(idx, 'down')}
                              title="向后移动"
                              className={cn(
                                "w-6 h-5 rounded border text-[9px] flex items-center justify-center transition-colors",
                                idx === activeCols.length - 1
                                  ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                                  : "border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500 cursor-pointer"
                              )}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColPin(idx, 'left')}
                              title="移至最左/左固定"
                              className={cn(
                                "w-6 h-5 rounded border text-[11px] font-medium flex items-center justify-center transition-colors cursor-pointer",
                                col.pinned === 'left'
                                  ? "border-[#3b82f6] bg-[#3b82f6] text-white"
                                  : "border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500"
                              )}
                            >
                              左
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColPin(idx, 'right')}
                              title="移至最右/右固定"
                              className={cn(
                                "w-6 h-5 rounded border text-[11px] font-medium flex items-center justify-center transition-colors cursor-pointer",
                                col.pinned === 'right'
                                  ? "border-[#3b82f6] bg-[#3b82f6] text-white"
                                  : "border-slate-200 bg-white hover:border-blue-400 hover:text-blue-600 text-slate-500"
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

                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white">
                      <button
                        type="button"
                        onClick={() => setIsColConfigOpen(false)}
                        className="h-[34px] px-4 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-[13px] font-medium cursor-pointer transition-colors"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCols}
                        className="h-[34px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium cursor-pointer transition-colors"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width Multi-Select Table */}
          <div className="flex-1 border border-slate-200/80 rounded-lg overflow-auto custom-scrollbar bg-white">
            <table className="w-max min-w-full border-collapse text-left text-[13px] whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="h-[42px] bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                  <th className="w-[46px] text-center border-r border-slate-200/60">
                    <button
                      type="button"
                      onClick={handleToggleAllItems}
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center mx-auto cursor-pointer transition-colors",
                        allDisplayedChecked
                          ? "bg-[#2563eb] text-white"
                          : "border border-slate-300 bg-white"
                      )}
                    >
                      {allDisplayedChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                  </th>
                  {visibleCols.map(col =>
                    renderFilterableTh(col.key, col.label, col.type, {
                      sortable: col.sortable,
                      align: col.align,
                      widthClass: col.widthClass,
                    })
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-slate-800">
                {visibleCols.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="h-[220px] text-center text-slate-400">
                      暂无显示字段，请在右上角「字段配置」中勾选需要展示的字段
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="h-[220px] text-center text-slate-400">
                      未找到匹配的销售订单明细
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(item => {
                    const isChecked = selectedItemIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleItem(item.id)}
                        className={cn(
                          "h-[44px] cursor-pointer transition-colors",
                          isChecked ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="text-center border-r border-slate-200/60">
                          <div
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center mx-auto transition-colors",
                              isChecked
                                ? "bg-[#2563eb] text-white"
                                : "border border-slate-300 bg-white"
                            )}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </td>
                        {visibleCols.map(col => renderModalCell(item, col.key))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar matching Image 1 */}
          <div className="pt-3 pb-1 flex items-center justify-between gap-4 text-[13px] text-slate-600 select-none shrink-0">
            <div className="text-slate-400">
              已选中 {selectedCount} 条
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-700">共 {displayedItems.length} 条</span>

              <div className="relative">
                <select
                  value={pageSize}
                  onChange={e => {
                    const nextSize = Number(e.target.value);
                    setPageSize(nextSize);
                    setCurrentPage(1);
                    setJumpPage('1');
                  }}
                  className="h-[32px] pl-3 pr-7 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    const prev = Math.max(1, safePage - 1);
                    setCurrentPage(prev);
                    setJumpPage(String(prev));
                  }}
                  className={cn(
                    "w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-colors",
                    safePage <= 1
                      ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "bg-slate-50/70 text-slate-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentPage(p);
                      setJumpPage(String(p));
                    }}
                    className={cn(
                      "min-w-[32px] h-[32px] px-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                      safePage === p
                        ? "bg-[#3b82f6] text-white font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, safePage + 1);
                    setCurrentPage(next);
                    setJumpPage(String(next));
                  }}
                  className={cn(
                    "w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-colors",
                    safePage >= totalPages
                      ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "bg-slate-50/70 text-slate-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-700">前往</span>
                <input
                  type="text"
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onBlur={() => {
                    const num = parseInt(jumpPage, 10);
                    if (!isNaN(num)) {
                      const target = Math.min(Math.max(1, num), totalPages);
                      setCurrentPage(target);
                      setJumpPage(String(target));
                    } else {
                      setJumpPage(String(safePage));
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const num = parseInt(jumpPage, 10);
                      if (!isNaN(num)) {
                        const target = Math.min(Math.max(1, num), totalPages);
                        setCurrentPage(target);
                        setJumpPage(String(target));
                      } else {
                        setJumpPage(String(safePage));
                      }
                    }
                  }}
                  className="w-[48px] h-[32px] text-center rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-700">页</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] text-slate-700 font-medium transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-[36px] px-5 rounded-lg bg-[#2563eb] hover:bg-blue-600 text-white text-[13px] font-medium transition-colors cursor-pointer shadow-xs"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
