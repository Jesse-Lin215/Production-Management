import React, { useState, useRef, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Home, RefreshCw, LayoutGrid, Search,
  Plus, Settings, Calendar, X, Cpu, CheckSquare, Trash2, CheckCircle2,
  SlidersHorizontal, Lock, ListFilter, FileSpreadsheet, Filter, ArrowUpDown, ClipboardCheck, Check, Move,
  ArrowLeft, Building2, User, Clock, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  PRODUCT_OPTIONS,
  OUTSOURCING_PROCESS_OPTIONS,
  PROCESS_ROUTE_OPTIONS,
  OutsourcingType,
  OutsourcingMethod,
  ApplicationStatus,
  ApplicationMaterialRow,
  OutsourcingApplicationItem,
  getOutsourcingApplications,
  updateOutsourcingApplications,
  saveOutsourcingApplication,
  getOutsourcingOrders,
  formatApplicationSalesOrders,
  formatApplicationMaterialsInfo
} from '../outsourcingStore';
import { OverflowTooltipCell, ResizableTh } from '../components/OverflowTooltipCell';
import SalesOrderSelectModal, {
  SalesOrderModalMaterialItem,
  ONGOING_SALES_ORDERS,
  APPLICATION_MATERIAL_TEMPLATES
} from '../components/SalesOrderSelectModal';

export type { ApplicationStatus, ApplicationMaterialRow, OutsourcingApplicationItem };

interface MatColConfig {
  key: string;
  label: string;
  visible: boolean;
  type: 'search' | 'filter';
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  widthClass?: string;
  fixed?: 'left' | 'right' | null;
  onlyFor?: OutsourcingType;
}

const DEFAULT_MAT_COLS: MatColConfig[] = [
  { key: 'source', label: '销售订单号', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[160px]', fixed: 'left' },
  { key: 'lineNo', label: '项次', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[86px]', fixed: null },
  { key: 'productCode', label: '产品编码', visible: true, type: 'search', sortable: true, widthClass: 'min-w-[150px]', fixed: null },
  { key: 'productName', label: '产品名称', visible: true, type: 'search', widthClass: 'min-w-[170px]', fixed: null },
  { key: 'productCategory', label: '产品分类', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[120px]', fixed: null },
  { key: 'productSpec', label: '产品规格', visible: true, type: 'search', align: 'center', widthClass: 'min-w-[160px]', fixed: null },
  { key: 'bomVersion', label: 'BOM版本', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[110px]', fixed: null },
  { key: 'materialCode', label: '物料编码', visible: true, type: 'search', sortable: true, widthClass: 'min-w-[160px]', fixed: null, onlyFor: '工序外协' },
  { key: 'materialName', label: '物料名称', visible: true, type: 'search', widthClass: 'min-w-[190px]', fixed: null, onlyFor: '工序外协' },
  { key: 'materialCategory', label: '物料分类', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[120px]', fixed: null, onlyFor: '工序外协' },
  { key: 'specification', label: '规格', visible: true, type: 'search', align: 'center', widthClass: 'min-w-[160px]', fixed: null, onlyFor: '工序外协' },
  { key: 'unit', label: '单位', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[90px]', fixed: null },
  { key: 'currentStock', label: '当前库存', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[110px]', fixed: null },
  { key: 'requestQty', label: '请购数量', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[120px]', fixed: null },
  { key: 'remark', label: '备注', visible: true, type: 'search', align: 'center', widthClass: 'min-w-[180px]', fixed: null }
];

const DEFAULT_DETAIL_MAT_COLS: MatColConfig[] = [
  { key: 'seq', label: '序号', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[76px]', fixed: 'left' },
  { key: 'source', label: '销售订单号', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[150px]', fixed: null },
  { key: 'lineNo', label: '项次', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[84px]', fixed: null },
  { key: 'productCode', label: '产品编码', visible: true, type: 'search', sortable: true, widthClass: 'min-w-[150px]', fixed: null },
  { key: 'productName', label: '产品名称', visible: true, type: 'search', widthClass: 'min-w-[170px]', fixed: null },
  { key: 'productCategory', label: '产品分类', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[120px]', fixed: null },
  { key: 'productSpec', label: '产品规格', visible: true, type: 'search', align: 'center', widthClass: 'min-w-[150px]', fixed: null },
  { key: 'bomVersion', label: 'BOM版本', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[110px]', fixed: null },
  { key: 'materialCode', label: '物料编码', visible: true, type: 'search', sortable: true, widthClass: 'min-w-[160px]', fixed: null, onlyFor: '工序外协' },
  { key: 'materialName', label: '物料名称', visible: true, type: 'search', widthClass: 'min-w-[190px]', fixed: null, onlyFor: '工序外协' },
  { key: 'materialCategory', label: '物料分类', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[120px]', fixed: null, onlyFor: '工序外协' },
  { key: 'specification', label: '规格', visible: true, type: 'search', align: 'center', widthClass: 'min-w-[150px]', fixed: null, onlyFor: '工序外协' },
  { key: 'unit', label: '单位', visible: true, type: 'filter', align: 'center', widthClass: 'min-w-[90px]', fixed: null },
  { key: 'currentStock', label: '当前库存', visible: true, type: 'search', sortable: true, align: 'right', widthClass: 'min-w-[110px]', fixed: null },
  { key: 'requestQty', label: '请购数量', visible: true, type: 'search', sortable: true, align: 'right', widthClass: 'min-w-[110px]', fixed: null },
  { key: 'convertedRatio', label: '已转数/未转数', visible: true, type: 'search', sortable: true, align: 'center', widthClass: 'min-w-[130px]', fixed: null },
  { key: 'remark', label: '备注', visible: true, type: 'search', widthClass: 'min-w-[160px]', fixed: null }
];

function MatSortTriangles({ activeDir }: { activeDir?: 'asc' | 'desc' | null }) {
  return (
    <span className="inline-flex flex-col leading-none ml-0.5 text-[8px]">
      <span className={cn("leading-[7px]", activeDir === 'asc' ? "text-blue-600" : "text-slate-300")}>▲</span>
      <span className={cn("leading-[7px]", activeDir === 'desc' ? "text-blue-600" : "text-slate-300")}>▼</span>
    </span>
  );
}

interface OutsourcingApplicationsProps {
  onNavigateOrders?: () => void;
  onNavigateOutsourcing?: () => void;
  onConvertToOrder?: (applicationNo: string) => void;
}

export default function OutsourcingApplications({
  onNavigateOrders,
  onNavigateOutsourcing,
  onConvertToOrder
}: OutsourcingApplicationsProps) {
  const [applications, setApplications] = useState<OutsourcingApplicationItem[]>(() => getOutsourcingApplications());
  const [viewMode, setViewMode] = useState<'list' | 'wizard' | 'detail'>('list');
  const [editingItem, setEditingItem] = useState<OutsourcingApplicationItem | null>(null);
  const [detailItem, setDetailItem] = useState<OutsourcingApplicationItem | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'orders'>('info');

  // List states
  const [statusTab, setStatusTab] = useState<string>('全部');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [appliedKeyword, setAppliedKeyword] = useState<string>('');
  const [detailViewMode, setDetailViewMode] = useState<'单据视图' | '明细视图'>('明细视图');
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [jumpPage, setJumpPage] = useState<string>('1');
  const [toast, setToast] = useState<string | null>(null);

  // Wizard states
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState<boolean>(false);
  const [formAppNo, setFormAppNo] = useState<string>('HYCG-202610270002');
  const [formApplicant, setFormApplicant] = useState<string>('测试');
  const [formApplyDate, setFormApplyDate] = useState<string>('2026-10-27');
  const [formContactPerson, setFormContactPerson] = useState<string>('');
  const [formRequiredDate, setFormRequiredDate] = useState<string>('');
  const [formPriority, setFormPriority] = useState<string>('高');
  const [formOutsourcingType, setFormOutsourcingType] = useState<OutsourcingType>('工序外协');
  const [formOutsourcingMethod, setFormOutsourcingMethod] = useState<OutsourcingMethod>('包工包料');
  const [formProcessRoute, setFormProcessRoute] = useState<string>('标准机加及表面处理工艺路线');
  const [formProcesses, setFormProcesses] = useState<string[]>(['表面阳极氧化']);
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState<boolean>(false);
  const [formCompany, setFormCompany] = useState<string>('智简工厂测试租户');
  const [formRemark, setFormRemark] = useState<string>('');
  const [formMaterials, setFormMaterials] = useState<ApplicationMaterialRow[]>([]);
  const [isSalesOrderModalOpen, setIsSalesOrderModalOpen] = useState<boolean>(false);
  const [matPage, setMatPage] = useState<number>(1);
  const [matPageSize, setMatPageSize] = useState<number>(10);
  const [matJumpPage, setMatJumpPage] = useState<string>('1');

  // 物料清单 column header search/filter & sort states
  const [matColFilters, setMatColFilters] = useState<Record<string, string>>({});
  const [activeMatHeaderMenu, setActiveMatHeaderMenu] = useState<string | null>(null);
  const [matSortConfig, setMatSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [matCols, setMatCols] = useState<MatColConfig[]>(DEFAULT_MAT_COLS);
  const [isMatColConfigOpen, setIsMatColConfigOpen] = useState(false);
  const [draggedMatColIdx, setDraggedMatColIdx] = useState<number | null>(null);

  const applicableMatCols = useMemo(
    () => matCols.filter(c => !c.onlyFor || c.onlyFor === formOutsourcingType),
    [matCols, formOutsourcingType]
  );
  const visibleMatCols = useMemo(() => applicableMatCols.filter(c => c.visible), [applicableMatCols]);

  const toggleMatColVisible = (key: string) => {
    setMatCols(prev => prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const selectAllMatCols = () => {
    setMatCols(prev =>
      prev.map(c => (!c.onlyFor || c.onlyFor === formOutsourcingType ? { ...c, visible: true } : c))
    );
  };

  const clearAllMatCols = () => {
    setMatCols(prev =>
      prev.map(c => (!c.onlyFor || c.onlyFor === formOutsourcingType ? { ...c, visible: false } : c))
    );
  };

  const resetMatCols = () => {
    setMatCols(DEFAULT_MAT_COLS);
  };

  const moveMatCol = (key: string, direction: 'up' | 'down') => {
    setMatCols(prev => {
      const appKeys = prev
        .filter(c => !c.onlyFor || c.onlyFor === formOutsourcingType)
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

  const toggleMatColFixed = (key: string, side: 'left' | 'right') => {
    setMatCols(prev => {
      const index = prev.findIndex(c => c.key === key);
      if (index === -1) return prev;
      const next = [...prev];
      const current = next[index];
      const newFixed = current.fixed === side ? null : side;
      const updated = { ...current, fixed: newFixed };
      next.splice(index, 1);
      if (newFixed === 'left') {
        next.unshift(updated);
      } else if (newFixed === 'right') {
        next.push(updated);
      } else {
        next.splice(index, 0, updated);
      }
      return next;
    });
  };

  // Detail page states (基本信息收纳展开 & 物料清单筛选/字段配置)
  const [isDetailBasicCollapsed, setIsDetailBasicCollapsed] = useState<boolean>(false);
  const [detailMatColFilters, setDetailMatColFilters] = useState<Record<string, string>>({});
  const [activeDetailMatHeaderMenu, setActiveDetailMatHeaderMenu] = useState<string | null>(null);
  const [detailMatSortConfig, setDetailMatSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [detailMatCols, setDetailMatCols] = useState<MatColConfig[]>(DEFAULT_DETAIL_MAT_COLS);
  const [isDetailMatColConfigOpen, setIsDetailMatColConfigOpen] = useState(false);
  const [draggedDetailMatColIdx, setDraggedDetailMatColIdx] = useState<number | null>(null);

  const detailOutsourcingType: OutsourcingType = detailItem?.outsourcingType || '工序外协';
  const applicableDetailMatCols = useMemo(
    () => detailMatCols.filter(c => !c.onlyFor || c.onlyFor === detailOutsourcingType),
    [detailMatCols, detailOutsourcingType]
  );
  const visibleDetailMatCols = useMemo(
    () => applicableDetailMatCols.filter(c => c.visible),
    [applicableDetailMatCols]
  );

  const toggleDetailMatColVisible = (key: string) => {
    setDetailMatCols(prev => prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const selectAllDetailMatCols = () => {
    setDetailMatCols(prev =>
      prev.map(c => (!c.onlyFor || c.onlyFor === detailOutsourcingType ? { ...c, visible: true } : c))
    );
  };

  const clearAllDetailMatCols = () => {
    setDetailMatCols(prev =>
      prev.map(c => (!c.onlyFor || c.onlyFor === detailOutsourcingType ? { ...c, visible: false } : c))
    );
  };

  const resetDetailMatCols = () => {
    setDetailMatCols(DEFAULT_DETAIL_MAT_COLS);
  };

  const moveDetailMatCol = (key: string, direction: 'up' | 'down') => {
    setDetailMatCols(prev => {
      const appKeys = prev
        .filter(c => !c.onlyFor || c.onlyFor === detailOutsourcingType)
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

  const toggleDetailMatColFixed = (key: string, side: 'left' | 'right') => {
    setDetailMatCols(prev => {
      const index = prev.findIndex(c => c.key === key);
      if (index === -1) return prev;
      const next = [...prev];
      const current = next[index];
      const newFixed = current.fixed === side ? null : side;
      const updated = { ...current, fixed: newFixed };
      next.splice(index, 1);
      if (newFixed === 'left') {
        next.unshift(updated);
      } else if (newFixed === 'right') {
        next.push(updated);
      } else {
        next.splice(index, 0, updated);
      }
      return next;
    });
  };

  const wizardScrollRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const detailStep1Ref = useRef<HTMLDivElement>(null);
  const detailStep2Ref = useRef<HTMLDivElement>(null);
  const detailStep3Ref = useRef<HTMLDivElement>(null);
  const detailProgrammaticScrollRef = useRef<boolean>(false);
  const detailScrollTimerRef = useRef<number | null>(null);
  const [detailAnchorStep, setDetailAnchorStep] = useState<1 | 2 | 3>(1);
  const [isDetailSidebarCollapsed, setIsDetailSidebarCollapsed] = useState(false);
  const matTableScrollRef = useRef<HTMLDivElement>(null);
  const matDragStateRef = useRef<{ isDown: boolean; startX: number; scrollLeft: number }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleOpenNewWizard = () => {
    setEditingItem(null);
    setFormAppNo('HYCG-202610270002');
    setFormApplicant('测试');
    setFormApplyDate('2026-10-27');
    setFormContactPerson('');
    setFormRequiredDate('');
    setFormPriority('高');
    setFormOutsourcingType('工序外协');
    setFormOutsourcingMethod('包工包料');
    setFormProcessRoute('标准机加及表面处理工艺路线');
    setFormProcesses(['表面阳极氧化']);
    setIsProcessDropdownOpen(false);
    setIsBasicInfoCollapsed(false);
    setFormCompany('智简工厂测试租户');
    setFormRemark('');
    setFormMaterials([]);
    setMatColFilters({});
    setActiveMatHeaderMenu(null);
    setMatSortConfig(null);
    setMatPage(1);
    setMatJumpPage('1');
    setWizardStep(1);
    setViewMode('wizard');
  };

  const handleOpenEditWizard = (item: OutsourcingApplicationItem) => {
    setEditingItem(item);
    setFormAppNo(item.applicationNo);
    setFormApplicant(item.applicant || '测试');
    setFormApplyDate(item.applyDate !== '-' ? item.applyDate : '2026-10-27');
    setFormContactPerson(item.contactPerson !== '-' ? item.contactPerson : '');
    setFormRequiredDate(item.requiredDate !== '-' ? item.requiredDate : '');
    setFormPriority(item.priority || '高');
    setFormOutsourcingType(item.outsourcingType || '工序外协');
    setFormOutsourcingMethod(item.outsourcingMethod || '包工包料');
    setFormProcessRoute(item.processRoute || '标准机加及表面处理工艺路线');
    setFormProcesses(item.processes && item.processes.length > 0 ? item.processes : ['表面阳极氧化']);
    setIsProcessDropdownOpen(false);
    setIsBasicInfoCollapsed(false);
    setFormCompany(item.companyName !== '-' ? item.companyName : '智简工厂测试租户');
    setFormRemark(item.remark !== '-' ? item.remark : '');
    setFormMaterials(item.materials || []);
    setMatColFilters({});
    setActiveMatHeaderMenu(null);
    setMatSortConfig(null);
    setMatPage(1);
    setMatJumpPage('1');
    setWizardStep(1);
    setViewMode('wizard');
  };

  const handleOpenDetail = (item: OutsourcingApplicationItem) => {
    setDetailItem(item);
    setDetailTab('info');
    setIsDetailBasicCollapsed(false);
    setDetailMatColFilters({});
    setActiveDetailMatHeaderMenu(null);
    setDetailMatSortConfig(null);
    setIsDetailMatColConfigOpen(false);
    setViewMode('detail');
  };

  const [reviewModalItem, setReviewModalItem] = useState<OutsourcingApplicationItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const [listColWidths, setListColWidths] = useState<Record<string, number>>({
    seq: 64,
    applicationNo: 175,
    salesOrder: 215,
    materialInfo: 215,
    applyDate: 115,
    totalQty: 95,
    convertedQty: 115,
    requiredDate: 115,
    remark: 220,
    companyName: 145,
    status: 96,
    actions: 165
  });

  const handleStartListResize = (e: React.MouseEvent, colKey: string, minWidth = 70) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = listColWidths[colKey] ?? 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setListColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(minWidth, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const totalListTableWidth = (Object.values(listColWidths) as number[]).reduce((sum, w) => sum + w, 0);

  const handleDeleteApplication = (id: string) => {
    const nextList = applications.filter(item => item.id !== id);
    setApplications(nextList);
    updateOutsourcingApplications(nextList);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast('已删除申请单');
  };

  const handleSubmitApproval = (id: string) => {
    const nextList = applications.map(item =>
      item.id === id ? { ...item, status: '待审核' as ApplicationStatus } : item
    );
    setApplications(nextList);
    updateOutsourcingApplications(nextList);
    setDetailItem(prev =>
      prev && prev.id === id ? { ...prev, status: '待审核' as ApplicationStatus } : prev
    );
    showToast('已提交审核，状态更新为待审核');
  };

  const handleOpenReviewModal = (item: OutsourcingApplicationItem) => {
    setReviewModalItem(item);
    setReviewComment('');
  };

  const handleApproveApplication = (id: string) => {
    const nextList = applications.map(item =>
      item.id === id ? { ...item, status: '进行中' as ApplicationStatus } : item
    );
    setApplications(nextList);
    updateOutsourcingApplications(nextList);
    setDetailItem(prev =>
      prev && prev.id === id ? { ...prev, status: '进行中' as ApplicationStatus } : prev
    );
    setReviewModalItem(null);
    showToast('审核通过，申请单状态已变为进行中');
  };

  const handleRejectApplication = (id: string) => {
    const nextList = applications.map(item =>
      item.id === id ? { ...item, status: '审批驳回' as ApplicationStatus } : item
    );
    setApplications(nextList);
    updateOutsourcingApplications(nextList);
    setDetailItem(prev =>
      prev && prev.id === id ? { ...prev, status: '审批驳回' as ApplicationStatus } : prev
    );
    setReviewModalItem(null);
    showToast('已驳回该外协申请单');
  };

  const handleUnapproveApplication = (id: string) => {
    const nextList = applications.map(item =>
      item.id === id ? { ...item, status: '草稿' as ApplicationStatus } : item
    );
    setApplications(nextList);
    updateOutsourcingApplications(nextList);
    setDetailItem(prev =>
      prev && prev.id === id ? { ...prev, status: '草稿' as ApplicationStatus } : prev
    );
    showToast('反审批成功，申请单已退回草稿状态');
  };

  const handleSwitchFormOutsourcingType = (nextType: OutsourcingType) => {
    if (nextType === formOutsourcingType) return;
    setFormOutsourcingType(nextType);
    setFormMaterials(prev => {
      if (prev.length === 0) return prev;
      if (nextType === '整单外协') {
        const grouped = new Map<string, ApplicationMaterialRow>();
        prev.forEach(row => {
          const prodCode = row.productCode || row.materialCode.replace(/-\d+$/, '');
          const key = `${row.source}__${row.lineNo || '1'}__${prodCode}`;
          if (!grouped.has(key)) {
            const prodOpt = PRODUCT_OPTIONS.find(p => p.code === prodCode);
            const soOpt = ONGOING_SALES_ORDERS.find(so => so.orderNo === row.source);
            const soItem = soOpt?.items.find(
              it => it.materialCode === prodCode && (it.lineNo === row.lineNo || !row.lineNo)
            ) || soOpt?.items.find(it => it.materialCode === prodCode);
            const prodUnit = soItem?.unit || prodOpt?.unit || '台';
            const prodQty = soItem?.quantity ?? row.requestQty ?? 1;
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
              materialCategory: prodCategory,
              specification: prodSpec,
              unit: prodUnit,
              requestQty: prodQty,
            });
          }
        });
        return Array.from(grouped.values());
      } else {
        const expanded: ApplicationMaterialRow[] = [];
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
                materialCategory: tpl.materialCategory,
                specification: row.productSpec || row.specification,
                unit: tpl.unit,
                requestQty: (Number(row.requestQty) || 1) * tpl.usage,
              });
            });
          } else {
            expanded.push(row);
          }
        });
        return expanded;
      }
    });
  };

  const handleConfirmSalesOrderImport = (_orders: string[], items: SalesOrderModalMaterialItem[]) => {
    if (items.length === 0) return;
    const isWholeOrder = formOutsourcingType === '整单外协';
    const importedRows: ApplicationMaterialRow[] = items.map((item, idx) => {
      const prodCode = item.productCode || item.materialCode.replace(/-\d+$/, '');
      const prodOpt = PRODUCT_OPTIONS.find(p => p.code === prodCode);
      const prodName = item.productName || prodOpt?.name || item.materialName;
      const prodCategory = item.productCategory || prodOpt?.category || '成套设备';
      const prodSpec = item.productSpec || prodOpt?.spec || item.specification || 'HY-LD250';
      return {
        id: `app-so-${Date.now()}-${idx}`,
        selected: false,
        source: item.sourceOrderNo || '-',
        lineNo: item.lineNo || '1',
        productCode: prodCode,
        productName: prodName,
        productCategory: prodCategory,
        productSpec: prodSpec,
        bomVersion: item.bomVersion || 'V1.0',
        materialCode: isWholeOrder ? prodCode : item.materialCode,
        materialName: isWholeOrder ? prodName : item.materialName,
        materialCategory: isWholeOrder ? prodCategory : (item.materialCategory || item.category || '机加件'),
        specification: isWholeOrder ? prodSpec : item.specification,
        unit: isWholeOrder ? (item.unit || prodOpt?.unit || '台') : item.unit,
        priority: formPriority || '高',
        currentStock: 8,
        requestQty: item.quantity || 1,
        remark: ''
      };
    });
    setFormMaterials(prev => [...prev, ...importedRows]);
  };

  const handleDeleteSelectedMaterials = () => {
    const hasSelected = formMaterials.some(m => m.selected);
    if (!hasSelected) {
      showToast('请先勾选要删除的物料行');
      return;
    }
    setFormMaterials(prev => prev.filter(m => !m.selected));
  };

  const handleSaveOrSubmitWizard = (targetStatus: ApplicationStatus) => {
    if (!formApplicant.trim() || !formApplyDate.trim()) {
      showToast('请填写请购人和申请日期等必填项');
      return;
    }
    if (formOutsourcingType === '工序外协' && (!formProcessRoute.trim() || formProcesses.length === 0)) {
      showToast('工序外协必须选择工艺路线和至少一道工序');
      return;
    }
    const sumQty = formMaterials.reduce((acc, m) => acc + (Number(m.requestQty) || 0), 0) || 1;
    const newRecord: OutsourcingApplicationItem = {
      id: editingItem?.id || `app-${Date.now()}`,
      applicationNo: formAppNo,
      applyDate: formApplyDate || '2026-10-28',
      totalQty: sumQty,
      convertedQty: editingItem?.convertedQty || 0,
      contactPerson: formContactPerson || '-',
      requiredDate: formRequiredDate || '-',
      remark: formRemark || '-',
      companyName: formCompany || '智简工厂测试租户',
      status: targetStatus,
      applicant: formApplicant || '测试',
      priority: formPriority || '高',
      outsourcingType: formOutsourcingType,
      outsourcingMethod: formOutsourcingMethod,
      processRoute: formOutsourcingType === '工序外协' ? formProcessRoute : undefined,
      processes: formOutsourcingType === '工序外协' ? formProcesses : undefined,
      materials: formMaterials
    };

    saveOutsourcingApplication(newRecord);
    setApplications([...getOutsourcingApplications()]);
    setViewMode('list');
    showToast(targetStatus === '草稿' ? '已保存为草稿' : '已提交审批，状态变为待审核');
  };

  const scrollToWizardStep = (step: 1 | 2) => {
    setWizardStep(step);
    const target = step === 1 ? step1Ref.current : step2Ref.current;
    if (target && wizardScrollRef.current) {
      const containerTop = wizardScrollRef.current.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const offset = targetTop - containerTop + wizardScrollRef.current.scrollTop;
      wizardScrollRef.current.scrollTo({ top: Math.max(0, offset - 4), behavior: 'smooth' });
    }
  };

  const scrollToDetailStep = (step: 1 | 2 | 3) => {
    setDetailAnchorStep(step);
    detailProgrammaticScrollRef.current = true;
    if (detailScrollTimerRef.current) {
      window.clearTimeout(detailScrollTimerRef.current);
    }
    detailScrollTimerRef.current = window.setTimeout(() => {
      detailProgrammaticScrollRef.current = false;
    }, 650);

    const target =
      step === 1
        ? detailStep1Ref.current
        : step === 2
        ? detailStep2Ref.current
        : detailStep3Ref.current;
    if (target && detailScrollRef.current) {
      const containerRect = detailScrollRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + detailScrollRef.current.scrollTop;
      detailScrollRef.current.scrollTo({ top: Math.max(0, offset - 4), behavior: 'smooth' });
    }
  };

  // Filtered list
  const filteredApplications = applications.filter(item => {
    if (statusTab !== '全部' && item.status !== statusTab) {
      return false;
    }
    if (appliedKeyword.trim()) {
      const kw = appliedKeyword.trim().toLowerCase();
      const matchNo = item.applicationNo.toLowerCase().includes(kw);
      const matchSo = formatApplicationSalesOrders(item).toLowerCase().includes(kw);
      const matchMatInfo = formatApplicationMaterialsInfo(item).toLowerCase().includes(kw);
      const matchMat = item.materials.some(
        m => m.materialCode.toLowerCase().includes(kw) || m.materialName.toLowerCase().includes(kw)
      );
      if (!matchNo && !matchSo && !matchMatInfo && !matchMat) return false;
    }
    return true;
  });

  const availableProcessesForRoute = useMemo(() => {
    const matched = PROCESS_ROUTE_OPTIONS.find(r => r.name === formProcessRoute);
    return matched ? matched.processes : OUTSOURCING_PROCESS_OPTIONS;
  }, [formProcessRoute]);

  const toggleProcessSelection = (proc: string) => {
    setFormProcesses(prev =>
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    );
  };

  // Filled fields count in wizard
  const totalInfoFields = formOutsourcingType === '工序外协' ? 11 : 9;
  const filledInfoCount = [
    formAppNo,
    formOutsourcingType,
    formOutsourcingMethod,
    ...(formOutsourcingType === '工序外协'
      ? [formProcessRoute, formProcesses.length > 0 ? 'yes' : '']
      : []),
    formApplicant,
    formApplyDate,
    formRequiredDate,
    formCompany,
    formRemark,
    formMaterials.length > 0 ? 'yes' : ''
  ].filter(Boolean).length;

  const totalRequiredFields = formOutsourcingType === '工序外协' ? 8 : 6;
  const requiredFilledCount = [
    formAppNo,
    formOutsourcingType,
    formOutsourcingMethod,
    ...(formOutsourcingType === '工序外协'
      ? [formProcessRoute, formProcesses.length > 0 ? 'yes' : '']
      : []),
    formApplicant,
    formApplyDate,
    formCompany
  ].filter(Boolean).length;

  const getMatFieldValue = (row: ApplicationMaterialRow, colKey: string): string => {
    switch (colKey) {
      case 'source':
        return row.source || '';
      case 'lineNo':
        return row.lineNo || '1';
      case 'productCode':
        return row.productCode || '02-00DX-02161';
      case 'productName':
        return row.productName || '欧标插头线';
      case 'productCategory':
        return row.productCategory || '成套设备';
      case 'productSpec':
        return row.productSpec || 'HY-LD250';
      case 'bomVersion':
        return row.bomVersion || 'V1.0';
      case 'materialCode':
        return row.materialCode || '';
      case 'materialName':
        return row.materialName || '';
      case 'materialCategory':
        return row.materialCategory || '机加件';
      case 'specification':
        return row.specification || '';
      case 'unit':
        return row.unit || '';
      case 'currentStock':
        return String(row.currentStock ?? 0);
      case 'requestQty':
        return String(row.requestQty ?? 1);
      case 'remark':
        return row.remark || '';
      default:
        return '';
    }
  };

  const filteredAndSortedMaterials = useMemo(() => {
    const filtered = formMaterials.filter(row => {
      for (const [colKey, filterVal] of Object.entries(matColFilters)) {
        const trimmed = String(filterVal || '').trim().toLowerCase();
        if (!trimmed) continue;
        const cellVal = getMatFieldValue(row, colKey).toLowerCase();
        if (!cellVal.includes(trimmed)) return false;
      }
      return true;
    });

    if (!matSortConfig) return filtered;
    const { key, dir } = matSortConfig;
    return [...filtered].sort((a, b) => {
      if (key === 'lineNo' || key === 'currentStock' || key === 'requestQty') {
        const numA = parseFloat(getMatFieldValue(a, key)) || 0;
        const numB = parseFloat(getMatFieldValue(b, key)) || 0;
        return dir === 'asc' ? numA - numB : numB - numA;
      }
      const valA = getMatFieldValue(a, key);
      const valB = getMatFieldValue(b, key);
      return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
    });
  }, [formMaterials, matColFilters, matSortConfig]);

  const totalMatPages = Math.max(1, Math.ceil(filteredAndSortedMaterials.length / matPageSize));
  const currentMatPage = Math.min(matPage, totalMatPages);
  const paginatedMaterials = filteredAndSortedMaterials.slice(
    (currentMatPage - 1) * matPageSize,
    currentMatPage * matPageSize
  );

  const renderMatFilterableTh = (
    colKey: string,
    label: string,
    type: 'search' | 'filter',
    options?: { sortable?: boolean; align?: 'left' | 'right' | 'center'; widthClass?: string }
  ) => {
    const currentVal = matColFilters[colKey] || '';
    const isActive = Boolean(currentVal.trim());
    const isMenuOpen = activeMatHeaderMenu === colKey;
    const isSorted = matSortConfig?.key === colKey ? matSortConfig.dir : null;

    const defaultFilterFallbacks: Record<string, string[]> = {
      productCategory: ['成套设备', '自动化装备', '通信设备', '标准件'],
      bomVersion: ['V1.0', 'V1.5', 'V2.0'],
      materialCategory: ['机加件', '钣金件', '结构件', '标准件'],
      unit: ['件', 'PCS', '台', '套']
    };

    const dynamicOpts = Array.from(
      new Set(formMaterials.map(r => getMatFieldValue(r, colKey)).filter(Boolean))
    );
    const uniqueOptions =
      type === 'filter'
        ? dynamicOpts.length > 0
          ? dynamicOpts
          : defaultFilterFallbacks[colKey] || []
        : [];

    return (
      <th
        key={colKey}
        onClick={e => e.stopPropagation()}
        className={cn(
          "px-3 border-r border-slate-200/60 font-bold text-slate-800 whitespace-nowrap relative select-none",
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
            onClick={() => setActiveMatHeaderMenu(prev => (prev === colKey ? null : colKey))}
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
            <span className={cn("text-[12px] font-bold", isActive ? "text-blue-600" : "text-slate-800")}>
              {label}
            </span>
          </button>

          {options?.sortable && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setMatSortConfig(prev => {
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
              <MatSortTriangles activeDir={isSorted} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className={cn(
              "absolute top-full mt-1 z-30 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal",
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
                    onChange={e => {
                      setMatColFilters(prev => ({ ...prev, [colKey]: e.target.value }));
                      setMatPage(1);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setActiveMatHeaderMenu(null);
                    }}
                    placeholder={`搜索${label}...`}
                    className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMatColFilters(prev => ({ ...prev, [colKey]: '' }));
                      setActiveMatHeaderMenu(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMatHeaderMenu(null)}
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
                    setMatColFilters(prev => ({ ...prev, [colKey]: '' }));
                    setActiveMatHeaderMenu(null);
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
                          setMatColFilters(prev => ({ ...prev, [colKey]: opt }));
                          setMatPage(1);
                          setActiveMatHeaderMenu(null);
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

  if (viewMode === 'wizard') {
    return (
      <div
        onClick={() => {
          setActiveMatHeaderMenu(null);
          setIsMatColConfigOpen(false);
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

        {/* Top White Sub-Header Card */}
        <div className="h-[46px] bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-bold text-slate-900">
              {editingItem ? '编辑外协申请单' : '新增外协申请单'}
            </span>
            <span className="text-[12px] text-blue-600 font-medium">{formAppNo}</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
              草稿
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 flex gap-3 p-3 overflow-hidden">
          {/* Left Step Sidebar */}
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
                  title="展开导航"
                  className="w-8 h-8 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-slate-100 my-3" />
                <div className="space-y-2.5 flex flex-col items-center w-full">
                  {[
                    { step: 1 as const, short: '基本', title: '基本信息' },
                    { step: 2 as const, short: '物料', title: '物料清单' }
                  ].map(item => (
                    <button
                      key={item.step}
                      type="button"
                      title={item.title}
                      onClick={() => scrollToWizardStep(item.step)}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold cursor-pointer border",
                        wizardStep === item.step
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-100 text-slate-600 border-slate-200"
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
                    <h2 className="text-[15px] font-bold text-slate-900">新增外协申请单</h2>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      title="收纳导航"
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    按步骤填写外协申请单，保存时统一校验必填项。
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 mb-4 flex">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300 rounded-full"
                      style={{ width: wizardStep === 1 ? '50%' : '100%' }}
                    />
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2">
                    {[
                      { step: 1 as const, title: '基本信息' },
                      { step: 2 as const, title: '物料清单' }
                    ].map(item => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => scrollToWizardStep(item.step)}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center transition-all cursor-pointer border",
                          wizardStep === item.step
                            ? "bg-[#eef5ff] border-blue-200/80"
                            : "bg-white border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div className={cn("text-[13px] font-bold truncate", wizardStep === item.step ? "text-blue-600" : "text-slate-800")}>
                          {item.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Summary Boxes */}
                <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="text-[11px] text-slate-400">信息录入</div>
                    <div className="text-[18px] font-bold text-slate-900 mt-0.5">{filledInfoCount}/{totalInfoFields}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="text-[11px] text-slate-400">必填项</div>
                    <div className="text-[18px] font-bold text-slate-900 mt-0.5">{requiredFilledCount}/{totalRequiredFields}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Scrollable Form Sections */}
          <div
            ref={wizardScrollRef}
            onScroll={() => {
              if (!wizardScrollRef.current) return;
              if (wizardScrollRef.current.scrollTop > 180) {
                setWizardStep(2);
              } else {
                setWizardStep(1);
              }
            }}
            className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar"
          >
            {/* Card 1: 基本信息 */}
            <div ref={step1Ref} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className={cn("flex items-center justify-between", !isBasicInfoCollapsed && "mb-5")}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">基本信息</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBasicInfoCollapsed(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{isBasicInfoCollapsed ? '展开' : '收起'}</span>
                  {isBasicInfoCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {!isBasicInfoCollapsed && (
                <>
                  <div className="grid grid-cols-4 gap-x-5 gap-y-4">
                    {/* * 申请单编号 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>申请单编号
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formAppNo}
                          disabled
                          className="flex-1 h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-400 text-[12px]"
                        />
                        <button
                          type="button"
                          className="w-[34px] h-[34px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* * 外协方式 (放在外协类型左边) */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>外协方式
                      </label>
                      <div className="grid grid-cols-2 h-[34px] rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setFormOutsourcingMethod('包工包料')}
                          className={cn(
                            "text-[12px] font-medium transition-colors cursor-pointer",
                            formOutsourcingMethod === '包工包料'
                              ? "bg-blue-50/80 text-blue-600 border border-blue-500 rounded-l-lg"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          包工包料
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormOutsourcingMethod('包工不包料')}
                          className={cn(
                            "text-[12px] font-medium transition-colors cursor-pointer",
                            formOutsourcingMethod === '包工不包料'
                              ? "bg-blue-50/80 text-blue-600 border border-blue-500 rounded-r-lg"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          包工不包料
                        </button>
                      </div>
                    </div>

                    {/* * 外协类型 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>外协类型
                      </label>
                      <div className="grid grid-cols-2 h-[34px] rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleSwitchFormOutsourcingType('工序外协')}
                          className={cn(
                            "text-[12px] font-medium transition-colors cursor-pointer",
                            formOutsourcingType === '工序外协'
                              ? "bg-blue-50/80 text-blue-600 border border-blue-500 rounded-l-lg"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          工序外协
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchFormOutsourcingType('整单外协')}
                          className={cn(
                            "text-[12px] font-medium transition-colors cursor-pointer",
                            formOutsourcingType === '整单外协'
                              ? "bg-blue-50/80 text-blue-600 border border-blue-500 rounded-r-lg"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          整单外协
                        </button>
                      </div>
                    </div>

                    {/* 当外协类型为工序外协时：新增必填项 工艺路线（单选）、工序（多选） */}
                    {formOutsourcingType === '工序外协' && (
                      <>
                        {/* * 工艺路线 (单选) */}
                        <div>
                          <label className="block text-[12px] text-slate-700 mb-1.5">
                            <span className="text-red-500 mr-0.5">*</span>工艺路线
                          </label>
                          <div className="relative">
                            <select
                              value={formProcessRoute}
                              onChange={e => {
                                const newRoute = e.target.value;
                                setFormProcessRoute(newRoute);
                                const routeObj = PROCESS_ROUTE_OPTIONS.find(r => r.name === newRoute);
                                if (routeObj) {
                                  const validExisting = formProcesses.filter(p => routeObj.processes.includes(p));
                                  setFormProcesses(validExisting.length > 0 ? validExisting : [routeObj.processes[0]]);
                                }
                              }}
                              className="w-full h-[34px] px-3 pr-8 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              {PROCESS_ROUTE_OPTIONS.map(route => (
                                <option key={route.code} value={route.name}>
                                  {route.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* * 工序 (多选) */}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <label className="block text-[12px] text-slate-700 mb-1.5">
                            <span className="text-red-500 mr-0.5">*</span>工序
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsProcessDropdownOpen(prev => !prev)}
                            className={cn(
                              "w-full min-h-[34px] px-2.5 py-1 pr-8 rounded-lg border bg-white text-left text-[12px] flex items-center flex-wrap gap-1 relative cursor-pointer transition-colors",
                              isProcessDropdownOpen ? "border-blue-500" : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {formProcesses.length === 0 ? (
                              <span className="text-slate-400 px-0.5">请选择工序（可多选）</span>
                            ) : (
                              formProcesses.map(proc => (
                                <span
                                  key={proc}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[11px] font-medium border border-blue-200/60"
                                >
                                  <span>{proc}</span>
                                  <X
                                    className="w-3 h-3 hover:text-blue-800 cursor-pointer"
                                    onClick={e => {
                                      e.stopPropagation();
                                      toggleProcessSelection(proc);
                                    }}
                                  />
                                </span>
                              ))
                            )}
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </button>

                          {isProcessDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 px-1.5">
                              <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">可多选工序</span>
                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setFormProcesses([...availableProcessesForRoute])}
                                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                  >
                                    全选
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormProcesses([])}
                                    className="text-slate-500 hover:text-slate-700 cursor-pointer"
                                  >
                                    清空
                                  </button>
                                </div>
                              </div>
                              <div className="max-h-[180px] overflow-y-auto py-1 space-y-0.5 custom-scrollbar">
                                {availableProcessesForRoute.map(proc => {
                                  const checked = formProcesses.includes(proc);
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

                    {/* * 请购人 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>请购人
                      </label>
                      <div className="relative">
                        <select
                          value={formApplicant}
                          onChange={e => setFormApplicant(e.target.value)}
                          className="w-full h-[34px] px-3 pr-8 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="测试">测试</option>
                          <option value="张工">张工</option>
                          <option value="李主管">李主管</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* * 申请日期 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>申请日期
                      </label>
                      <div className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={formApplyDate}
                          onChange={e => setFormApplyDate(e.target.value)}
                          placeholder="选择申请日期"
                          className="w-full text-[12px] text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* 需求日期 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        需求日期
                      </label>
                      <div className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={formRequiredDate}
                          onChange={e => setFormRequiredDate(e.target.value)}
                          placeholder="选择需求日期"
                          className="w-full text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* * 所属公司 */}
                    <div>
                      <label className="block text-[12px] text-slate-700 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>所属公司
                      </label>
                      <div className="relative">
                        <select
                          value={formCompany}
                          onChange={e => setFormCompany(e.target.value)}
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
                    <label className="block text-[12px] text-slate-700 mb-1.5">
                      备注
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        maxLength={1024}
                        value={formRemark}
                        onChange={e => setFormRemark(e.target.value)}
                        placeholder="请输入备注"
                        className="w-full p-3 pb-6 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-y"
                      />
                      <span className="absolute right-3 bottom-2 text-[11px] text-slate-400 select-none">
                        {formRemark.length} / 1024
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Card 2: 物料清单 */}
            <div ref={step2Ref} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[14px] font-bold text-slate-900">物料清单</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {Object.values(matColFilters).some(v => String(v || '').trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => setMatColFilters({})}
                      className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer mr-1"
                    >
                      清空列筛选
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSalesOrderModalOpen(true)}
                    className="h-[32px] px-3.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 text-[12px] font-medium inline-flex items-center cursor-pointer transition-colors"
                  >
                    从销售订单导入
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMaterials}
                    className="h-[32px] px-3.5 rounded-lg border border-red-100 bg-red-50/60 hover:bg-red-100/60 text-red-400 hover:text-red-600 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除选中</span>
                  </button>

                  {/* 字段配置 Icon & Popover */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMatColConfigOpen(prev => !prev);
                        setActiveMatHeaderMenu(null);
                      }}
                      title="字段配置"
                      className={cn(
                        "w-[32px] h-[32px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors",
                        isMatColConfigOpen
                          ? "bg-blue-50 border-blue-400 text-blue-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
                    </button>

                    {isMatColConfigOpen && (
                      <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-40 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-900">显示字段</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={selectAllMatCols}
                              className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              全选
                            </button>
                            <button
                              type="button"
                              onClick={clearAllMatCols}
                              className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              清空
                            </button>
                          </div>
                        </div>

                        {/* Column List */}
                        <div className="max-h-[300px] overflow-y-auto px-3 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                          {applicableMatCols.map((col, idx) => (
                            <div
                              key={col.key}
                              draggable
                              onDragStart={() => setDraggedMatColIdx(idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => {
                                if (draggedMatColIdx === null || draggedMatColIdx === idx) return;
                                const draggedKey = applicableMatCols[draggedMatColIdx]?.key;
                                const targetKey = col.key;
                                if (!draggedKey || draggedKey === targetKey) return;
                                setMatCols(prev => {
                                  const fromIdx = prev.findIndex(c => c.key === draggedKey);
                                  const toIdx = prev.findIndex(c => c.key === targetKey);
                                  if (fromIdx === -1 || toIdx === -1) return prev;
                                  const next = [...prev];
                                  const [moved] = next.splice(fromIdx, 1);
                                  next.splice(toIdx, 0, moved);
                                  return next;
                                });
                                setDraggedMatColIdx(null);
                              }}
                              className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-50/70 rounded-lg transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => toggleMatColVisible(col.key)}
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
                                  onClick={() => moveMatCol(col.key, 'up')}
                                  title="上移"
                                  className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === applicableMatCols.length - 1}
                                  onClick={() => moveMatCol(col.key, 'down')}
                                  title="下移"
                                  className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleMatColFixed(col.key, 'left')}
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
                                  onClick={() => toggleMatColFixed(col.key, 'right')}
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
                            onClick={() => setIsMatColConfigOpen(false)}
                            className="h-[32px] px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium cursor-pointer transition-colors"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={resetMatCols}
                            className="h-[32px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium cursor-pointer transition-colors"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                ref={matTableScrollRef}
                onMouseDown={e => {
                  const tag = (e.target as HTMLElement).tagName;
                  if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'LABEL') return;
                  if (!matTableScrollRef.current) return;
                  matDragStateRef.current = {
                    isDown: true,
                    startX: e.pageX - matTableScrollRef.current.offsetLeft,
                    scrollLeft: matTableScrollRef.current.scrollLeft
                  };
                }}
                onMouseLeave={() => {
                  matDragStateRef.current.isDown = false;
                }}
                onMouseUp={() => {
                  matDragStateRef.current.isDown = false;
                }}
                onMouseMove={e => {
                  if (!matDragStateRef.current.isDown || !matTableScrollRef.current) return;
                  e.preventDefault();
                  const x = e.pageX - matTableScrollRef.current.offsetLeft;
                  const walk = x - matDragStateRef.current.startX;
                  matTableScrollRef.current.scrollLeft = matDragStateRef.current.scrollLeft - walk;
                }}
                className="border border-slate-200/80 rounded-lg overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing"
              >
                <table className="w-max min-w-full border-collapse text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                    <tr className="h-[40px]">
                      {visibleMatCols.map(col =>
                        renderMatFilterableTh(col.key, col.label, col.type, {
                          sortable: col.sortable,
                          align: col.align,
                          widthClass: col.widthClass
                        })
                      )}
                      <th className="min-w-[80px] px-3 text-center whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedMaterials.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleMatCols.length + 1}
                          className="h-[72px] text-center text-slate-500 whitespace-nowrap"
                        >
                          暂无物料，请点击「从销售订单导入」添加
                        </td>
                      </tr>
                    ) : (
                      paginatedMaterials.map(row => (
                        <tr key={row.id} className="h-[44px] hover:bg-slate-50/80">
                          {visibleMatCols.map(col => {
                            switch (col.key) {
                              case 'source':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap"
                                  >
                                    <label className="inline-flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(row.selected)}
                                        onChange={e => {
                                          const checked = e.target.checked;
                                          setFormMaterials(prev =>
                                            prev.map(m => (m.id === row.id ? { ...m, selected: checked } : m))
                                          );
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{row.source}</span>
                                    </label>
                                  </td>
                                );
                              case 'lineNo':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap"
                                  >
                                    {row.lineNo || '1'}
                                  </td>
                                );
                              case 'productCode':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap"
                                  >
                                    {row.productCode || '02-00DX-02161'}
                                  </td>
                                );
                              case 'productName':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap"
                                  >
                                    {row.productName || '欧标插头线'}
                                  </td>
                                );
                              case 'productCategory':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap"
                                  >
                                    {row.productCategory || '成套设备'}
                                  </td>
                                );
                              case 'productSpec':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap"
                                  >
                                    {row.productSpec || 'HY-LD250'}
                                  </td>
                                );
                              case 'bomVersion':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap"
                                  >
                                    {row.bomVersion || 'V1.0'}
                                  </td>
                                );
                              case 'materialCode':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap"
                                  >
                                    {row.materialCode}
                                  </td>
                                );
                              case 'materialName':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 font-medium text-slate-800 whitespace-nowrap"
                                  >
                                    {row.materialName}
                                  </td>
                                );
                              case 'materialCategory':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap"
                                  >
                                    {row.materialCategory || '机加件'}
                                  </td>
                                );
                              case 'specification':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center font-mono text-slate-600 whitespace-nowrap"
                                  >
                                    {row.specification}
                                  </td>
                                );
                              case 'unit':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center text-slate-600 whitespace-nowrap"
                                  >
                                    {row.unit}
                                  </td>
                                );
                              case 'currentStock':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    {row.currentStock}
                                  </td>
                                );
                              case 'requestQty':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <input
                                      type="number"
                                      min={1}
                                      value={row.requestQty}
                                      onChange={e => {
                                        const val = Math.max(1, Number(e.target.value) || 1);
                                        setFormMaterials(prev =>
                                          prev.map(m => (m.id === row.id ? { ...m, requestQty: val } : m))
                                        );
                                      }}
                                      className="w-[84px] h-[28px] px-2 text-center rounded border border-slate-200 bg-white text-[12px] focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                );
                              case 'remark':
                                return (
                                  <td
                                    key={col.key}
                                    className="px-3 border-r border-slate-100 text-center whitespace-nowrap"
                                  >
                                    <input
                                      type="text"
                                      value={row.remark}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setFormMaterials(prev =>
                                          prev.map(m => (m.id === row.id ? { ...m, remark: val } : m))
                                        );
                                      }}
                                      placeholder="备注"
                                      className="w-[150px] h-[28px] px-2 rounded border border-slate-200 bg-white text-[12px] focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                );
                              default:
                                return null;
                            }
                          })}
                          <td className="px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setFormMaterials(prev => prev.filter(m => m.id !== row.id))}
                              className="text-red-500 hover:text-red-600 cursor-pointer whitespace-nowrap"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 物料清单分页栏 */}
              <div className="mt-3 flex items-center justify-end gap-2.5 text-[12px] text-slate-600 select-none">
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
          </div>
        </div>

        {/* Bottom Sticky Footer */}
        <div className="h-[52px] bg-white border-t border-slate-200/80 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-[12px] text-slate-500">
            <span>物料 {formMaterials.length} 项</span>
            <span>基本信息</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="h-[32px] px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer transition-colors"
            >
              取 消
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrSubmitWizard('草稿')}
              className="h-[32px] px-4 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 text-[12px] font-medium cursor-pointer transition-colors"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrSubmitWizard('待审核')}
              className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium shadow-2xs cursor-pointer transition-colors"
            >
              提交审批
            </button>
          </div>
        </div>

        <SalesOrderSelectModal
          isOpen={isSalesOrderModalOpen}
          onClose={() => setIsSalesOrderModalOpen(false)}
          mode="material"
          outsourcingType={formOutsourcingType}
          onConfirm={handleConfirmSalesOrderImport}
        />
      </div>
    );
  }

  if (viewMode === 'detail' && detailItem) {
    const relatedOrders = getOutsourcingOrders().filter(
      o => o.outsourcingAppNo === detailItem.applicationNo
    );
    const detailProcesses =
      detailItem.outsourcingType === '工序外协'
        ? detailItem.processes && detailItem.processes.length > 0
          ? detailItem.processes
          : ['表面阳极氧化']
        : [];

    // Compute per-row converted and unconverted quantities based on detailItem.convertedQty
    let remainingToAllocate = detailItem.convertedQty;
    const enrichedDetailMaterials = detailItem.materials.map((row, idx) => {
      const reqQty = Number(row.requestQty) || 0;
      const rowConv = Math.min(reqQty, Math.max(0, remainingToAllocate));
      remainingToAllocate = Math.max(0, remainingToAllocate - rowConv);
      const rowUnconv = Math.max(0, reqQty - rowConv);
      return {
        ...row,
        seqNum: idx + 1,
        convertedQty: rowConv,
        unconvertedQty: rowUnconv,
        convertedRatioText: `${rowConv}/${rowUnconv}`
      };
    });

    const getDetailMatFieldValue = (
      row: (typeof enrichedDetailMaterials)[number],
      colKey: string
    ): string => {
      switch (colKey) {
        case 'seq':
          return String(row.seqNum);
        case 'source':
          return row.source || '';
        case 'lineNo':
          return row.lineNo || '1';
        case 'productCode':
          return row.productCode || '';
        case 'productName':
          return row.productName || '';
        case 'productCategory':
          return row.productCategory || '';
        case 'productSpec':
          return row.productSpec || '';
        case 'bomVersion':
          return row.bomVersion || '';
        case 'materialCode':
          return row.materialCode || '';
        case 'materialName':
          return row.materialName || '';
        case 'materialCategory':
          return row.materialCategory || '';
        case 'specification':
          return row.specification || '';
        case 'unit':
          return row.unit || '';
        case 'currentStock':
          return String(row.currentStock ?? 0);
        case 'requestQty':
          return String(row.requestQty ?? 0);
        case 'convertedRatio':
          return row.convertedRatioText;
        case 'remark':
          return row.remark || '-';
        default:
          return '';
      }
    };

    const filteredAndSortedDetailMaterials = enrichedDetailMaterials
      .filter(row => {
        for (const [colKey, filterVal] of Object.entries(detailMatColFilters)) {
          const trimmed = String(filterVal || '').trim().toLowerCase();
          if (!trimmed) continue;
          const cellVal = getDetailMatFieldValue(row, colKey).toLowerCase();
          if (!cellVal.includes(trimmed)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!detailMatSortConfig) return 0;
        const { key, dir } = detailMatSortConfig;
        if (key === 'seq' || key === 'lineNo' || key === 'currentStock' || key === 'requestQty') {
          const numA = parseFloat(getDetailMatFieldValue(a, key)) || 0;
          const numB = parseFloat(getDetailMatFieldValue(b, key)) || 0;
          return dir === 'asc' ? numA - numB : numB - numA;
        }
        if (key === 'convertedRatio') {
          return dir === 'asc' ? a.convertedQty - b.convertedQty : b.convertedQty - a.convertedQty;
        }
        const valA = getDetailMatFieldValue(a, key);
        const valB = getDetailMatFieldValue(b, key);
        return dir === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
      });

    const renderDetailMatFilterableTh = (
      colKey: string,
      label: string,
      type: 'search' | 'filter',
      options?: { sortable?: boolean; align?: 'left' | 'right' | 'center'; widthClass?: string }
    ) => {
      const currentVal = detailMatColFilters[colKey] || '';
      const isActive = Boolean(currentVal.trim());
      const isMenuOpen = activeDetailMatHeaderMenu === colKey;
      const isSorted = detailMatSortConfig?.key === colKey ? detailMatSortConfig.dir : null;

      const defaultFilterFallbacks: Record<string, string[]> = {
        productCategory: ['成套设备', '自动化装备', '通信设备', '标准件'],
        bomVersion: ['V1.0', 'V1.1', 'V1.2', 'V1.5', 'V2.0'],
        materialCategory: ['机加件', '钣金件', '结构件', '标准件'],
        unit: ['件', 'PCS', '台', '套']
      };

      const dynamicOpts = Array.from(
        new Set(enrichedDetailMaterials.map(r => getDetailMatFieldValue(r, colKey)).filter(Boolean))
      );
      const uniqueOptions =
        type === 'filter'
          ? dynamicOpts.length > 0
            ? dynamicOpts
            : defaultFilterFallbacks[colKey] || []
          : [];

      return (
        <th
          key={colKey}
          onClick={e => e.stopPropagation()}
          className={cn(
            "px-3 border-r border-slate-200/60 font-bold text-slate-800 whitespace-nowrap relative select-none",
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
              onClick={() => setActiveDetailMatHeaderMenu(prev => (prev === colKey ? null : colKey))}
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
              <span className={cn("text-[12px] font-bold", isActive ? "text-blue-600" : "text-slate-800")}>
                {label}
              </span>
            </button>

            {options?.sortable && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setDetailMatSortConfig(prev => {
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
                <MatSortTriangles activeDir={isSorted} />
              </button>
            )}
          </div>

          {isMenuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              className={cn(
                "absolute top-full mt-1 z-30 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left font-normal",
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
                      onChange={e => {
                        setDetailMatColFilters(prev => ({ ...prev, [colKey]: e.target.value }));
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setActiveDetailMatHeaderMenu(null);
                      }}
                      placeholder={`搜索${label}...`}
                      className="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailMatColFilters(prev => ({ ...prev, [colKey]: '' }));
                        setActiveDetailMatHeaderMenu(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      重置
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailMatHeaderMenu(null)}
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
                      setDetailMatColFilters(prev => ({ ...prev, [colKey]: '' }));
                      setActiveDetailMatHeaderMenu(null);
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
                            setDetailMatColFilters(prev => ({ ...prev, [colKey]: opt }));
                            setActiveDetailMatHeaderMenu(null);
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
          setActiveDetailMatHeaderMenu(null);
          setIsDetailMatColConfigOpen(false);
        }}
        className="flex flex-col h-full bg-[#f4f6f9] w-full overflow-hidden relative"
      >
        {toast && (
          <div className="fixed top-16 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Top White Sub-Header Card (与新增/编辑页面高度与风格一致) */}
        <div className="h-[46px] bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer transition-colors shrink-0"
              title="返回申请单列表"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[14px] font-bold text-slate-900 shrink-0">外协申请单详情</span>
            <span className="text-[13px] text-blue-600 font-mono font-semibold shrink-0">
              {detailItem.applicationNo}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium border shrink-0",
                detailItem.status === '进行中'
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : detailItem.status === '已完成'
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : detailItem.status === '待审核'
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : detailItem.status === '审批驳回'
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              {detailItem.status}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200/80 shrink-0">
              {detailItem.outsourcingMethod || '包工包料'}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium border shrink-0",
                detailItem.outsourcingType === '整单外协'
                  ? "bg-amber-50 text-amber-600 border-amber-200/80"
                  : "bg-blue-50 text-blue-600 border-blue-200/80"
              )}
            >
              {detailItem.outsourcingType || '工序外协'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(detailItem.status === '草稿' || detailItem.status === '审批驳回') && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEditWizard(detailItem)}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitApproval(detailItem.id)}
                  className="h-[34px] px-5 rounded-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium shadow-[0_2px_8px_rgba(59,130,246,0.3)] cursor-pointer transition-colors"
                >
                  提交审核
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteApplication(detailItem.id);
                    setDetailItem(null);
                    setViewMode('list');
                  }}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  删除
                </button>
              </>
            )}

            {detailItem.status === '进行中' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onConvertToOrder) {
                      onConvertToOrder(detailItem.applicationNo);
                    } else if (onNavigateOutsourcing) {
                      onNavigateOutsourcing();
                    }
                  }}
                  className="h-[34px] px-5 rounded-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium shadow-[0_2px_8px_rgba(59,130,246,0.3)] cursor-pointer transition-colors"
                >
                  转外协工单
                </button>
                <button
                  type="button"
                  onClick={() => handleUnapproveApplication(detailItem.id)}
                  className="h-[34px] px-4 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] text-[#3b82f6] text-[13px] font-medium cursor-pointer transition-colors"
                >
                  反审批
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1 ml-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Body: Left Anchor Sidebar + Right Scrollable Detail Content */}
        <div className="flex-1 min-h-0 flex gap-3 p-3 overflow-hidden">
          {/* Left Anchor Navigation Sidebar */}
          <div
            className={cn(
              "h-full min-h-0 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shrink-0 transition-all duration-200 overflow-hidden",
              isDetailSidebarCollapsed ? "w-[56px] p-2.5 items-center" : "w-[248px] p-4"
            )}
          >
            {isDetailSidebarCollapsed ? (
              <div className="flex flex-col items-center w-full h-full min-h-0">
                <button
                  type="button"
                  onClick={() => setIsDetailSidebarCollapsed(false)}
                  title="展开导航"
                  className="w-8 h-8 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-slate-100 my-3 shrink-0" />
                <div className="space-y-2.5 flex flex-col items-center w-full flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  {[
                    { step: 1 as const, short: '基本', title: '基本信息' },
                    { step: 2 as const, short: '物料', title: '物料清单' },
                    { step: 3 as const, short: '工单', title: '关联外协工单' }
                  ].map(item => (
                    <button
                      key={item.step}
                      type="button"
                      title={item.title}
                      onClick={e => {
                        e.stopPropagation();
                        scrollToDetailStep(item.step);
                      }}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold cursor-pointer border shrink-0 transition-all",
                        detailAnchorStep === item.step
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
                      <h2 className="text-[15px] font-bold text-slate-900">外协申请单详情</h2>
                      <button
                        type="button"
                        onClick={() => setIsDetailSidebarCollapsed(true)}
                        title="收纳导航"
                        className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-slate-500 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      点击左侧页签快速定位对应模块，或上下滚动查看。
                    </p>

                    {/* Progress Indicator Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 mb-3.5 flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300 rounded-full"
                        style={{
                          width:
                            detailAnchorStep === 1
                              ? '33.33%'
                              : detailAnchorStep === 2
                              ? '66.66%'
                              : '100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Anchor Steps List */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                    {[
                      { step: 1 as const, title: '基本信息' },
                      { step: 2 as const, title: '物料清单' },
                      { step: 3 as const, title: '关联外协工单' }
                    ].map(item => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          scrollToDetailStep(item.step);
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center transition-all cursor-pointer border",
                          detailAnchorStep === item.step
                            ? "bg-[#eef5ff] border-blue-200/80 shadow-2xs"
                            : "bg-white border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div
                          className={cn(
                            "text-[13px] font-bold truncate",
                            detailAnchorStep === item.step ? "text-blue-600" : "text-slate-800"
                          )}
                        >
                          {item.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Summary Boxes */}
                <div className="shrink-0 grid grid-cols-2 gap-2.5 pt-3 mt-2 border-t border-slate-100">
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">申请总数量</div>
                    <div className="text-[17px] font-bold text-slate-900 mt-0.5">{detailItem.totalQty}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-[11px] text-slate-400">已转外协数</div>
                    <div className="text-[17px] font-bold text-blue-600 mt-0.5">{detailItem.convertedQty}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Scrollable Detail Content */}
          <div
            ref={detailScrollRef}
            onScroll={() => {
              if (!detailScrollRef.current || detailProgrammaticScrollRef.current) return;
              const el = detailScrollRef.current;
              const maxScroll = el.scrollHeight - el.clientHeight;
              if (maxScroll > 0 && el.scrollTop >= maxScroll - 24) {
                setDetailAnchorStep(3);
                return;
              }
              const containerTop = el.getBoundingClientRect().top;
              const s2Top = detailStep2Ref.current
                ? detailStep2Ref.current.getBoundingClientRect().top - containerTop
                : Infinity;
              const s3Top = detailStep3Ref.current
                ? detailStep3Ref.current.getBoundingClientRect().top - containerTop
                : Infinity;
              if (s3Top <= 160) {
                setDetailAnchorStep(3);
              } else if (s2Top <= 160) {
                setDetailAnchorStep(2);
              } else {
                setDetailAnchorStep(1);
              }
            }}
            className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-28 custom-scrollbar"
          >
            {/* Card 1: 基本信息 */}
            <div ref={detailStep1Ref} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div
                className={cn(
                  "bg-[#f8fafc] px-5 py-3.5 flex items-center justify-between",
                  !isDetailBasicCollapsed && "border-b border-slate-100"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">基本信息</h3>
                </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailBasicCollapsed(prev => !prev)}
                    className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                  >
                    <span>{isDetailBasicCollapsed ? '展开' : '收起'}</span>
                    {isDetailBasicCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {!isDetailBasicCollapsed && (
                  <div className="p-5 grid grid-cols-4 gap-x-8 gap-y-5">
                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">申请单编号</div>
                      <div className="text-[13px] text-slate-900 font-mono">{detailItem.applicationNo}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">外协方式</div>
                      <div className="text-[13px] text-slate-900">{detailItem.outsourcingMethod || '-'}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">外协类型</div>
                      <div className="text-[13px] text-slate-900">{detailItem.outsourcingType || '-'}</div>
                    </div>

                    {detailItem.outsourcingType === '工序外协' && (
                      <>
                        <div>
                          <div className="text-[12px] text-slate-400 mb-1.5">工艺路线</div>
                          <div className="text-[13px] text-slate-900">
                            {detailItem.processRoute || '标准机加及表面处理工艺路线'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[12px] text-slate-400 mb-1.5">工序</div>
                          <div className="text-[13px] text-slate-900">
                            {detailProcesses.length > 0 ? detailProcesses.join(' / ') : '-'}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">请购人</div>
                      <div className="text-[13px] text-slate-900">{detailItem.applicant || '-'}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">申请日期</div>
                      <div className="text-[13px] text-slate-900 font-mono">{detailItem.applyDate || '-'}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">需求日期</div>
                      <div className="text-[13px] text-slate-900 font-mono">{detailItem.requiredDate || '-'}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">所属公司</div>
                      <div className="text-[13px] text-slate-900">{detailItem.companyName || '-'}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-slate-400 mb-1.5">备注</div>
                      <div className="text-[13px] text-slate-900 whitespace-pre-wrap">{detailItem.remark || '-'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: 物料清单明细 */}
              <div ref={detailStep2Ref} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[14px] font-bold text-slate-900">物料清单</h3>
                    <span className="text-[12px] text-slate-400 ml-1">
                      共 {filteredAndSortedDetailMaterials.length} 条记录
                    </span>
                  </div>

                  {/* 字段配置按钮与弹窗 */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setIsDetailMatColConfigOpen(prev => !prev)}
                      title="字段配置"
                      className={cn(
                        "w-[32px] h-[32px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors",
                        isDetailMatColConfigOpen
                          ? "bg-blue-50 border-blue-400 text-blue-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 rotate-90" />
                    </button>

                    {isDetailMatColConfigOpen && (
                      <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-40 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-900">显示字段</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={selectAllDetailMatCols}
                              className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              全选
                            </button>
                            <button
                              type="button"
                              onClick={clearAllDetailMatCols}
                              className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              清空
                            </button>
                          </div>
                        </div>

                        {/* Column List */}
                        <div className="max-h-[300px] overflow-y-auto px-3 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                          {applicableDetailMatCols.map((col, idx) => (
                            <div
                              key={col.key}
                              draggable
                              onDragStart={() => setDraggedDetailMatColIdx(idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => {
                                if (draggedDetailMatColIdx === null || draggedDetailMatColIdx === idx) return;
                                const draggedKey = applicableDetailMatCols[draggedDetailMatColIdx]?.key;
                                const targetKey = col.key;
                                if (!draggedKey || draggedKey === targetKey) return;
                                setDetailMatCols(prev => {
                                  const fromIdx = prev.findIndex(c => c.key === draggedKey);
                                  const toIdx = prev.findIndex(c => c.key === targetKey);
                                  if (fromIdx === -1 || toIdx === -1) return prev;
                                  const next = [...prev];
                                  const [moved] = next.splice(fromIdx, 1);
                                  next.splice(toIdx, 0, moved);
                                  return next;
                                });
                                setDraggedDetailMatColIdx(null);
                              }}
                              className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-50/70 rounded-lg transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => toggleDetailMatColVisible(col.key)}
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
                                  onClick={() => moveDetailMatCol(col.key, 'up')}
                                  title="上移"
                                  className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === applicableDetailMatCols.length - 1}
                                  onClick={() => moveDetailMatCol(col.key, 'down')}
                                  title="下移"
                                  className="w-[22px] h-[22px] rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[9px] cursor-pointer"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleDetailMatColFixed(col.key, 'left')}
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
                                  onClick={() => toggleDetailMatColFixed(col.key, 'right')}
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
                            onClick={() => setIsDetailMatColConfigOpen(false)}
                            className="h-[32px] px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium cursor-pointer transition-colors"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={resetDetailMatCols}
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
                        {visibleDetailMatCols.map(col =>
                          renderDetailMatFilterableTh(col.key, col.label, col.type, {
                            sortable: col.sortable,
                            align: col.align,
                            widthClass: col.widthClass
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAndSortedDetailMaterials.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(1, visibleDetailMatCols.length)}
                            className="h-[64px] text-center text-slate-400"
                          >
                            暂无匹配的物料记录
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedDetailMaterials.map(row => (
                          <tr key={row.id} className="h-[42px] hover:bg-slate-50/70">
                            {visibleDetailMatCols.map(col => {
                              switch (col.key) {
                                case 'seq':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-500 font-mono"
                                    >
                                      {row.seqNum}
                                    </td>
                                  );
                                case 'source':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono text-slate-700"
                                    >
                                      {row.source}
                                    </td>
                                  );
                                case 'lineNo':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono text-slate-700"
                                    >
                                      {row.lineNo || '1'}
                                    </td>
                                  );
                                case 'productCode':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 font-mono text-slate-700"
                                    >
                                      {row.productCode}
                                    </td>
                                  );
                                case 'productName':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-slate-700">
                                      {row.productName}
                                    </td>
                                  );
                                case 'productCategory':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-700"
                                    >
                                      {row.productCategory}
                                    </td>
                                  );
                                case 'productSpec':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono text-slate-700"
                                    >
                                      {row.productSpec}
                                    </td>
                                  );
                                case 'bomVersion':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-700"
                                    >
                                      {row.bomVersion}
                                    </td>
                                  );
                                case 'materialCode':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 font-mono text-slate-800"
                                    >
                                      {row.materialCode}
                                    </td>
                                  );
                                case 'materialName':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 font-medium text-slate-800"
                                    >
                                      {row.materialName}
                                    </td>
                                  );
                                case 'materialCategory':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-700"
                                    >
                                      {row.materialCategory}
                                    </td>
                                  );
                                case 'specification':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono text-slate-700"
                                    >
                                      {row.specification}
                                    </td>
                                  );
                                case 'unit':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center text-slate-700"
                                    >
                                      {row.unit}
                                    </td>
                                  );
                                case 'currentStock':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-right font-mono text-slate-700"
                                    >
                                      {row.currentStock}
                                    </td>
                                  );
                                case 'requestQty':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-right font-mono text-slate-700"
                                    >
                                      {row.requestQty}
                                    </td>
                                  );
                                case 'convertedRatio':
                                  return (
                                    <td
                                      key={col.key}
                                      className="px-3 border-r border-slate-100 text-center font-mono text-slate-700"
                                    >
                                      {row.convertedRatioText}
                                    </td>
                                  );
                                case 'remark':
                                  return (
                                    <td key={col.key} className="px-3 border-r border-slate-100 text-slate-500">
                                      {row.remark || '-'}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: 关联外协工单 */}
              <div ref={detailStep3Ref} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-[14px] font-bold text-slate-900">关联外协工单</h3>
                </div>
                <span className="text-[12px] text-slate-400">
                  共 {relatedOrders.length} 条记录
                </span>
              </div>

              <div className="border border-slate-200/70 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-left text-[12px] whitespace-nowrap">
                  <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold">
                    <tr className="h-[40px]">
                      <th className="px-4 border-r border-slate-100">外协工单号</th>
                      <th className="px-4 border-r border-slate-100">产品名称</th>
                      <th className="px-4 border-r border-slate-100">供应商名称</th>
                      <th className="px-4 border-r border-slate-100">外协方式</th>
                      <th className="px-4 border-r border-slate-100">外协类型</th>
                      <th className="px-4 border-r border-slate-100 text-right">计划数量</th>
                      <th className="px-4 border-r border-slate-100">生产进度</th>
                      <th className="px-4 border-r border-slate-100">入库进度</th>
                      <th className="px-4 border-r border-slate-100">计划交期</th>
                      <th className="px-4">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {relatedOrders.length === 0 ? (
                      <tr className="h-[64px]">
                        <td colSpan={10} className="text-center text-slate-400">
                          当前外协申请单暂未生成关联外协工单
                        </td>
                      </tr>
                    ) : (
                      relatedOrders.map(ord => (
                        <tr key={ord.id} className="h-[42px] hover:bg-slate-50/70">
                          <td className="px-4 border-r border-slate-100 font-mono text-blue-600 font-medium">
                            {ord.orderNo}
                          </td>
                          <td className="px-4 border-r border-slate-100">{ord.productName}</td>
                          <td className="px-4 border-r border-slate-100">{ord.supplierName}</td>
                          <td className="px-4 border-r border-slate-100">{ord.outsourcingMethod}</td>
                          <td className="px-4 border-r border-slate-100">{ord.outsourcingType}</td>
                          <td className="px-4 border-r border-slate-100 text-right font-bold">
                            {ord.plannedQty} {ord.unit}
                          </td>
                          <td className="px-4 border-r border-slate-100">{ord.productionProgress}%</td>
                          <td className="px-4 border-r border-slate-100">{ord.receiptProgress}%</td>
                          <td className="px-4 border-r border-slate-100 font-mono">{ord.plannedDeliveryDate}</td>
                          <td className="px-4">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[11px] font-medium">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Footer */}
        <div className="h-[50px] bg-white border-t border-slate-200/80 px-6 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium shadow-2xs cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  const draftCount = applications.filter(a => a.status === '草稿').length;
  const pendingCount = applications.filter(a => a.status === '待审核').length;
  const inProgressCount = applications.filter(a => a.status === '进行中').length;
  const rejectedCount = applications.filter(a => a.status === '审批驳回').length;
  const completedCount = applications.filter(a => a.status === '已完成').length;
  const cancelledCount = applications.filter(a => a.status === '已取消').length;

  const statusTabs = [
    { key: '全部', label: '全部', count: null },
    { key: '草稿', label: '草稿', count: draftCount },
    { key: '待审核', label: '待审核', count: pendingCount },
    { key: '进行中', label: '进行中', count: inProgressCount },
    { key: '审批驳回', label: '审批驳回', count: rejectedCount },
    { key: '已完成', label: '已完成', count: completedCount },
    { key: '已取消', label: '已取消', count: cancelledCount }
  ];

  const totalListPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const safeListPage = Math.min(currentPage, totalListPages);
  const paginatedApplications = filteredApplications.slice(
    (safeListPage - 1) * pageSize,
    safeListPage * pageSize
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f6f9] w-full overflow-hidden relative">
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
            onClick={onNavigateOrders}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>工单管理</span>
          </button>

          <button
            onClick={onNavigateOutsourcing}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 text-[12px] cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>外协工单</span>
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-500 bg-blue-50/70 text-blue-600 font-medium text-[12px] cursor-pointer shadow-2xs">
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>外协申请单</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400 pl-2 border-l border-slate-100">
          <button className="p-1 hover:text-slate-600 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => setApplications([...getOutsourcingApplications()])}
            className="p-1 hover:text-slate-600 cursor-pointer"
            title="刷新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-slate-600 cursor-pointer"><LayoutGrid className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Main White Card Container (Unified style with OutsourcingOrders) */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden p-4">
          {/* Row 1: Status Tabs + Search Input */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-6 text-[13px]">
              {statusTabs.map(tab => {
                const isActive = statusTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "relative pb-1.5 transition-colors cursor-pointer",
                      isActive
                        ? "text-blue-600 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>
                      {tab.label}
                      {tab.count !== null && <span className="ml-1">({tab.count})</span>}
                    </span>
                    {isActive && (
                      <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setAppliedKeyword(searchKeyword);
                    setCurrentPage(1);
                  }
                }}
                placeholder="请输入申请单编号、物料编码"
                className="w-[210px] h-[32px] px-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedKeyword(searchKeyword);
                  setCurrentPage(1);
                }}
                className="h-[32px] px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>搜索</span>
              </button>
            </div>
          </div>

          {/* Row 2: Action Buttons Toolbar */}
          <div className="flex items-center justify-between py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenNewWizard}
                className="h-[32px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBatchMode(prev => !prev);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "h-[32px] px-3.5 rounded-lg border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors",
                  batchMode
                    ? "border-blue-600 bg-blue-50 text-blue-600"
                    : "border-blue-500 bg-white hover:bg-blue-50/50 text-blue-600"
                )}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>批量操作</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === 0) {
                    showToast('请先通过批量操作勾选「进行中」的申请单');
                    return;
                  }
                  const selectedApps = applications.filter(item => selectedIds.has(item.id));
                  const nonInProgress = selectedApps.filter(item => item.status !== '进行中');
                  if (nonInProgress.length > 0) {
                    showToast('仅「进行中」状态的外协申请单支持转外协工单');
                    return;
                  }
                  const nextList = applications.map(item =>
                    selectedIds.has(item.id)
                      ? {
                          ...item,
                          convertedQty: item.totalQty,
                          status: '已完成' as ApplicationStatus
                        }
                      : item
                  );
                  setApplications(nextList);
                  updateOutsourcingApplications(nextList);
                  setSelectedIds(new Set());
                  showToast(`已将 ${selectedApps.length} 条申请单全部转外协工单，状态已更新为已完成`);
                }}
                className="h-[32px] px-3.5 rounded-lg border border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-50 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>转外协工单</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('自定义字段设置已打开')}
                className="h-[32px] px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>自定义字段</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('暂无待处理审批批次')}
                className="h-[32px] px-3.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-600 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>审批批次</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-[32px] p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center text-[12px]">
                <button
                  type="button"
                  onClick={() => setDetailViewMode('单据视图')}
                  className={cn(
                    "h-full px-3 rounded-md transition-colors cursor-pointer",
                    detailViewMode === '单据视图'
                      ? "bg-blue-600 text-white font-medium shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  单据视图
                </button>
                <button
                  type="button"
                  onClick={() => setDetailViewMode('明细视图')}
                  className={cn(
                    "h-full px-3 rounded-md transition-colors cursor-pointer",
                    detailViewMode === '明细视图'
                      ? "bg-blue-600 text-white font-medium shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  明细视图
                </button>
              </div>

              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="锁定列"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="展开/收起"
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
                title="字段配置"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table (Supports draggable column width + ellipsis + hover full tooltip) */}
          <div className="flex-1 border border-slate-200/70 rounded-lg overflow-auto custom-scrollbar">
            <table
              style={{ width: totalListTableWidth, minWidth: '100%' }}
              className="table-fixed border-collapse text-center text-[12px] whitespace-nowrap"
            >
              <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-800 font-bold sticky top-0 z-10">
                <tr className="h-[40px]">
                  <ResizableTh
                    colKey="seq"
                    width={listColWidths.seq}
                    minWidth={56}
                    onStartResize={handleStartListResize}
                  >
                    序号
                  </ResizableTh>

                  <ResizableTh
                    colKey="applicationNo"
                    width={listColWidths.applicationNo}
                    minWidth={130}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 font-normal shrink-0" />
                      <span>申请单编号</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="salesOrder"
                    width={listColWidths.salesOrder}
                    minWidth={110}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 font-normal shrink-0" />
                      <span>销售订单</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="materialInfo"
                    width={listColWidths.materialInfo}
                    minWidth={110}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 font-normal shrink-0" />
                      <span>物料信息</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="applyDate"
                    width={listColWidths.applyDate}
                    minWidth={95}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>申请日期</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="totalQty"
                    width={listColWidths.totalQty}
                    minWidth={80}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>总数量</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="convertedQty"
                    width={listColWidths.convertedQty}
                    minWidth={100}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>已转外协数量</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="requiredDate"
                    width={listColWidths.requiredDate}
                    minWidth={95}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>需求日期</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="remark"
                    width={listColWidths.remark}
                    minWidth={100}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>备注</span>
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="companyName"
                    width={listColWidths.companyName}
                    minWidth={100}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>所属公司</span>
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="status"
                    width={listColWidths.status}
                    minWidth={84}
                    onStartResize={handleStartListResize}
                  >
                    <div className="inline-flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>状态</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-300 shrink-0" />
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    colKey="actions"
                    width={listColWidths.actions}
                    minWidth={145}
                    onStartResize={handleStartListResize}
                    hideResizer
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>操作</span>
                      <Settings className="w-3 h-3 text-slate-400 shrink-0" />
                    </div>
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedApplications.map((item, idx) => {
                  const salesOrderText = formatApplicationSalesOrders(item);
                  const materialInfoText = formatApplicationMaterialsInfo(item);

                  return (
                    <tr
                      key={item.id}
                      className="h-[44px] hover:bg-blue-50/30 transition-colors bg-white"
                    >
                      <td
                        style={{ width: listColWidths.seq, minWidth: listColWidths.seq, maxWidth: listColWidths.seq }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        {batchMode ? (
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={e => {
                                const checked = e.target.checked;
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                });
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <span>{(safeListPage - 1) * pageSize + idx + 1}</span>
                          </label>
                        ) : (
                          <span className="text-slate-600">{(safeListPage - 1) * pageSize + idx + 1}</span>
                        )}
                      </td>

                      <td
                        style={{ width: listColWidths.applicationNo, minWidth: listColWidths.applicationNo, maxWidth: listColWidths.applicationNo }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        <OverflowTooltipCell text={item.applicationNo}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                          >
                            {item.applicationNo}
                          </button>
                        </OverflowTooltipCell>
                      </td>

                      <td
                        style={{ width: listColWidths.salesOrder, minWidth: listColWidths.salesOrder, maxWidth: listColWidths.salesOrder }}
                        className="px-3 border-r border-slate-100/70 text-slate-800 font-medium"
                      >
                        <OverflowTooltipCell text={salesOrderText} />
                      </td>

                      <td
                        style={{ width: listColWidths.materialInfo, minWidth: listColWidths.materialInfo, maxWidth: listColWidths.materialInfo }}
                        className="px-3 border-r border-slate-100/70 text-slate-800"
                      >
                        <OverflowTooltipCell text={materialInfoText} />
                      </td>

                      <td
                        style={{ width: listColWidths.applyDate, minWidth: listColWidths.applyDate, maxWidth: listColWidths.applyDate }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={item.applyDate} />
                      </td>

                      <td
                        style={{ width: listColWidths.totalQty, minWidth: listColWidths.totalQty, maxWidth: listColWidths.totalQty }}
                        className="px-3 border-r border-slate-100/70 text-slate-800"
                      >
                        <OverflowTooltipCell text={String(item.totalQty)} />
                      </td>

                      <td
                        style={{ width: listColWidths.convertedQty, minWidth: listColWidths.convertedQty, maxWidth: listColWidths.convertedQty }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={String(item.convertedQty)} />
                      </td>

                      <td
                        style={{ width: listColWidths.requiredDate, minWidth: listColWidths.requiredDate, maxWidth: listColWidths.requiredDate }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={item.requiredDate} />
                      </td>

                      <td
                        style={{ width: listColWidths.remark, minWidth: listColWidths.remark, maxWidth: listColWidths.remark }}
                        className="px-3 border-r border-slate-100/70 text-slate-500"
                      >
                        <OverflowTooltipCell text={item.remark} />
                      </td>

                      <td
                        style={{ width: listColWidths.companyName, minWidth: listColWidths.companyName, maxWidth: listColWidths.companyName }}
                        className="px-3 border-r border-slate-100/70 text-slate-700"
                      >
                        <OverflowTooltipCell text={item.companyName} />
                      </td>

                      <td
                        style={{ width: listColWidths.status, minWidth: listColWidths.status, maxWidth: listColWidths.status }}
                        className="px-3 border-r border-slate-100/70"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium",
                            item.status === '进行中'
                              ? "bg-blue-50 text-blue-600"
                              : item.status === '待审核'
                              ? "bg-amber-50 text-amber-600"
                              : item.status === '审批驳回'
                              ? "bg-red-50 text-red-600"
                              : item.status === '已完成'
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td
                        style={{ width: listColWidths.actions, minWidth: listColWidths.actions, maxWidth: listColWidths.actions }}
                        className="px-3"
                      >
                        {item.status === '草稿' || item.status === '审批驳回' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditWizard(item)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              编辑
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleSubmitApproval(item.id)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              提交审核
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteApplication(item.id)}
                              className="text-red-500 hover:text-red-600 cursor-pointer"
                            >
                              删除
                            </button>
                          </div>
                        ) : item.status === '进行中' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onConvertToOrder) {
                                  onConvertToOrder(item.applicationNo);
                                } else if (onNavigateOutsourcing) {
                                  onNavigateOutsourcing();
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              转外协工单
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleUnapproveApplication(item.id)}
                              className="text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
                            >
                              反审批
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {paginatedApplications.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400 text-xs">
                      暂无符合条件的外协申请单数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="pt-3 flex items-center justify-between text-[12px] text-slate-600 shrink-0 select-none">
            <div className="text-slate-400">
              已选中 {selectedIds.size} 条
            </div>

            <div className="flex items-center gap-2.5">
              <span>共 {filteredApplications.length} 条</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                    setJumpPage('1');
                  }}
                  className="h-[28px] pl-2.5 pr-7 rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  disabled={safeListPage <= 1}
                  onClick={() => {
                    const prev = Math.max(1, safeListPage - 1);
                    setCurrentPage(prev);
                    setJumpPage(String(prev));
                  }}
                  className="w-[28px] h-[28px] rounded-md border border-slate-100 bg-slate-50/70 text-slate-400 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalListPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentPage(p);
                      setJumpPage(String(p));
                    }}
                    className={cn(
                      "min-w-[28px] h-[28px] px-2 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
                      safeListPage === p
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safeListPage >= totalListPages}
                  onClick={() => {
                    const next = Math.min(totalListPages, safeListPage + 1);
                    setCurrentPage(next);
                    setJumpPage(String(next));
                  }}
                  className="w-[28px] h-[28px] rounded-md border border-slate-100 bg-slate-50/70 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span>前往</span>
                <input
                  type="text"
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const num = parseInt(jumpPage, 10);
                      if (!isNaN(num)) {
                        const target = Math.min(totalListPages, Math.max(1, num));
                        setCurrentPage(target);
                        setJumpPage(String(target));
                      }
                    }
                  }}
                  className="w-[44px] h-[28px] text-center rounded-md border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <span>页</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 查看审核弹窗 */}
      {reviewModalItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setReviewModalItem(null)}
        >
          <div
            className="w-full max-w-[540px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[14px] font-bold text-slate-900">
                  外协申请单审核 · {reviewModalItem.applicationNo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-[12px]">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-slate-400">外协类型：</span>
                  <span className="text-slate-800 font-medium">{reviewModalItem.outsourcingType}</span>
                </div>
                <div>
                  <span className="text-slate-400">外协方式：</span>
                  <span className="text-slate-800 font-medium">{reviewModalItem.outsourcingMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400">请购人：</span>
                  <span className="text-slate-800 font-medium">{reviewModalItem.applicant}</span>
                </div>
                <div>
                  <span className="text-slate-400">请购总数量：</span>
                  <span className="text-slate-800 font-bold">{reviewModalItem.totalQty}</span>
                </div>
                <div>
                  <span className="text-slate-400">申请日期：</span>
                  <span className="text-slate-700 font-mono">{reviewModalItem.applyDate}</span>
                </div>
                <div>
                  <span className="text-slate-400">需求日期：</span>
                  <span className="text-slate-700 font-mono">{reviewModalItem.requiredDate}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">备注说明：</span>
                  <span className="text-slate-700">{reviewModalItem.remark || '-'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                  审批意见（选填）
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="请输入审核通过或驳回的意见说明..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 bg-[#f8fafc] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = reviewModalItem;
                  setReviewModalItem(null);
                  handleOpenDetail(target);
                }}
                className="text-[12px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                查看完整单据详情
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalItem(null)}
                  className="h-[32px] px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectApplication(reviewModalItem.id)}
                  className="h-[32px] px-3.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100/80 text-red-600 text-[12px] font-medium cursor-pointer transition-colors"
                >
                  审批驳回
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveApplication(reviewModalItem.id)}
                  className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium shadow-2xs cursor-pointer transition-colors"
                >
                  审核通过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
