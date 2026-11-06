import React, { useState, useEffect } from 'react';
import { initialBomTree, mockSalesOrders, defaultStockProducts } from '../data';
import type { BomNode, Operation, SchedulePlanItem, SalesOrder, SalesOrderProduct } from '../types';
import BomTree from '../components/BomTree';
import RoutingEditor from '../components/RoutingEditor';
import BomCompositionTable from '../components/BomCompositionTable';
import SchedulingPanel from '../components/SchedulingPanel';
import RoutingSchedulingPanel from '../components/RoutingSchedulingPanel';
import TaskPanel from '../components/TaskPanel';
import ProductInfoSection from '../components/ProductInfoSection';
import SalesOrderSelectModal, { SalesOrderModalMaterialItem, ONGOING_SALES_ORDERS } from '../components/SalesOrderSelectModal';
import { Layers, Settings, FileText, ChevronRight, ChevronLeft, Package, Truck, Calendar, Activity, Minus, Plus, ChevronDown, ChevronUp, AlertCircle, Sparkles, CheckCircle2, X, Send, QrCode, Printer, Search } from 'lucide-react';
import { cn } from '../lib/utils';

const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  }
};

// Unified sales orders list combining ONGOING_SALES_ORDERS from modal and mockSalesOrders
export const allSalesOrders: SalesOrder[] = [
  ...ONGOING_SALES_ORDERS.map(order => ({
    orderNo: order.orderNo,
    customer: order.customer,
    orderDate: '2026-10-28',
    planDeliveryDate: order.planDeliveryDate,
    startDate: '2026-10-29',
    endDate: order.planDeliveryDate,
    status: 'TO_BE_SCHEDULED' as const,
    products: order.items.map((item, idx) => ({
      id: item.id,
      lineNo: Number(item.lineNo) || idx + 1,
      productCode: item.materialCode,
      productName: item.materialName,
      category: item.category || '成套设备',
      specification: item.specification,
      routingName: `${item.materialName}标准工艺路线`,
      bomVersion: item.bomVersion || 'V1.0',
      unit: item.unit,
      orderQuantity: item.quantity,
      productionQuantity: item.quantity,
      customer: item.customer || order.customer,
      planDeliveryDate: item.planDeliveryDate || order.planDeliveryDate,
    })),
  })),
  ...mockSalesOrders.filter(
    so => !ONGOING_SALES_ORDERS.some(ongoing => ongoing.orderNo === so.orderNo)
  ),
];

// Helper to detect product department based on routing/process characteristics
export function detectProductDepartment(product?: SalesOrderProduct | null): { departments: string[]; autoSelectedDept: string } {
  if (!product) return { departments: [], autoSelectedDept: '' };

  const routingName = (product.routingName || '').toLowerCase();
  const productName = (product.productName || '').toLowerCase();
  const productCode = (product.productCode || '').toLowerCase();

  const deptSet = new Set<string>();

  if (productCode === 'cg-00002' || productName.includes('移栽机')) {
    deptSet.add('机加部');
  } else if (productCode === '12-00008' || productName.includes('送板机')) {
    deptSet.add('组装部');
  } else if (productCode.startsWith('bj-') || productName.includes('钣金') || productName.includes('机柜') || routingName.includes('钣金')) {
    deptSet.add('钣金部');
  } else if (productName.includes('智能') || productName.includes('门锁')) {
    deptSet.add('机加部');
    deptSet.add('组装部');
  } else if (productName.includes('网关') || productName.includes('复合') || productName.includes('自动化')) {
    deptSet.add('钣金部');
    deptSet.add('机加部');
    deptSet.add('组装部');
  } else {
    if (/cnc|机加|铣床|车床|线割|攻牙|编程|钻孔/.test(productName + routingName)) {
      deptSet.add('机加部');
    }
    if (/钣金|激光|折弯|冲压|焊接/.test(productName + routingName)) {
      deptSet.add('钣金部');
    }
    if (/组装|装配|钳工|电工|调试|测试/.test(productName + routingName)) {
      deptSet.add('组装部');
    }
  }

  const depts = Array.from(deptSet);
  const autoSelectedDept = depts.length === 1 ? depts[0] : '';

  return { departments: depts, autoSelectedDept };
}

// Helper to compute common products (strict intersection) across selected sales orders
export function computeCommonProducts(orderNos: string[]): SalesOrderProduct[] {
  if (orderNos.length === 0) return [];
  
  const selectedOrders = orderNos
    .map(no => allSalesOrders.find(so => so.orderNo === no))
    .filter((so): so is SalesOrder => Boolean(so));
  if (selectedOrders.length === 0) return [];

  if (selectedOrders.length === 1) {
    const singleSo = selectedOrders[0];
    return singleSo.products.map(p => ({
      ...p,
      orderBreakdown: [{
        orderNo: singleSo.orderNo,
        customer: singleSo.customer,
        lineNo: p.lineNo,
        orderQuantity: p.orderQuantity,
        productionQuantity: p.productionQuantity || p.orderQuantity,
        planDeliveryDate: p.planDeliveryDate || singleSo.planDeliveryDate,
        remark: p.remark || ''
      }]
    }));
  }

  // Find productCodes that exist in ALL selected sales orders (Intersection / 交集)
  const firstOrder = selectedOrders[0];
  const commonProducts: SalesOrderProduct[] = [];
  const seenCodes = new Set<string>();

  for (const baseProd of firstOrder.products) {
    if (seenCodes.has(baseProd.productCode)) continue;
    const existsInAll = selectedOrders.every(so => 
      so.products.some(p => p.productCode === baseProd.productCode)
    );

    if (existsInAll) {
      seenCodes.add(baseProd.productCode);
      const breakdown = selectedOrders.map(so => {
        const matchingProd = so.products.find(p => p.productCode === baseProd.productCode)!;
        return {
          orderNo: so.orderNo,
          customer: so.customer,
          lineNo: matchingProd.lineNo,
          orderQuantity: matchingProd.orderQuantity,
          productionQuantity: matchingProd.productionQuantity || matchingProd.orderQuantity,
          planDeliveryDate: matchingProd.planDeliveryDate || so.planDeliveryDate,
          remark: matchingProd.remark || ''
        };
      });

      const totalOrderQty = breakdown.reduce((sum, item) => sum + item.orderQuantity, 0);
      const totalProdQty = breakdown.reduce((sum, item) => sum + item.productionQuantity, 0);

      commonProducts.push({
        ...baseProd,
        id: `common-${baseProd.productCode}`,
        orderQuantity: totalOrderQty,
        productionQuantity: totalProdQty,
        orderBreakdown: breakdown
      });
    }
  }

  return commonProducts;
}

// Master product catalog for product-dimension scheduling
export const productCatalog = [
  {
    productCode: 'PROD001',
    productName: '智能手机A型 (Pro Max)',
    category: '智能终端',
    specification: '6.5寸全面屏 8G+256G 黑色',
    routingName: '智能手机组装标准路线',
    bomVersions: ['V2.1', 'V2.0', 'V1.0'],
    unit: '台'
  },
  {
    productCode: 'A-00004',
    productName: '自动送板机 (Loader)',
    category: '自动化装备',
    specification: '标准SMT上板机 宽轨双向进出',
    routingName: '送板机精密制造路线',
    bomVersions: ['V1.0', 'V1.1', 'V2.0'],
    unit: '台'
  },
  {
    productCode: 'GW-5G-08',
    productName: '5G工业智能网关',
    category: '通信设备',
    specification: '工业级全网通 4口LAN/WAN 导轨安装',
    routingName: '工业网关精密焊接装配线',
    bomVersions: ['V1.5', 'V1.0', 'V2.0'],
    unit: '台'
  },
  {
    productCode: 'ROB-V3-PRO',
    productName: '智能扫地机器人 V3',
    category: '智能家电',
    specification: 'LDS激光导航 5000Pa双盘旋擦',
    routingName: '扫地机器人精益装配线',
    bomVersions: ['V3.0', 'V2.0', 'V1.0'],
    unit: '台'
  },
  {
    productCode: 'LCK-FACE-01',
    productName: '智能人脸识别门锁 Pro',
    category: '智能安防',
    specification: '3D结构光人脸+半导体指纹+防撬报警',
    routingName: '智能门锁电子机械装配路线',
    bomVersions: ['V1.2', 'V1.0'],
    unit: '套'
  },
  {
    productCode: 'AUTO-DSP-15',
    productName: '车载中控旋转大屏 15.6寸',
    category: '汽车电子',
    specification: '车规级2K OLED窄边框 8核8G',
    routingName: '车载显示模组百级无尘装配线',
    bomVersions: ['V2.0', 'V1.0'],
    unit: '套'
  },
  {
    productCode: 'CHG-WLS-50',
    productName: '50W车载无线快充模块',
    category: '汽车电子',
    specification: '主动风冷散热 双线圈Qi标准',
    routingName: '车载充电模组PCBA制造线',
    bomVersions: ['V1.0', 'V1.1'],
    unit: '个'
  },
  {
    productCode: '02-00DX-02161',
    productName: '欧标插头线',
    category: '标准件',
    specification: '3*0.75',
    routingName: '线束标准装配工艺路线',
    bomVersions: ['V1.0', 'V1.1'],
    unit: 'PCS'
  },
  {
    productCode: '02-00KG-02165',
    productName: '普通急停按钮',
    category: '标准件',
    specification: 'ZB2-B2102C(常闭)',
    routingName: '按钮开关标准装配线',
    bomVersions: ['V1.0'],
    unit: 'PCS'
  },
  {
    productCode: 'CG-02167',
    productName: '换边机',
    category: '成套设备',
    specification: 'SDWJ234',
    routingName: '换边机精密制造与装配路线',
    bomVersions: ['V1.0', 'V2.0'],
    unit: 'PCS'
  },
  {
    productCode: '05-00240',
    productName: '0.5米双轨接驳台 2台',
    category: '钣金件',
    specification: 'XZZQ-26C-123单7项',
    routingName: '双轨接驳台标准工艺路线',
    bomVersions: ['V1.0', 'V1.2'],
    unit: '台'
  },
  {
    productCode: 'CG-00002',
    productName: '2米移栽机',
    category: '成套设备',
    specification: '2000×650×1800mm / 45#钢',
    routingName: '移栽机机加组装工艺路线',
    bomVersions: ['V1.0', 'V1.1'],
    unit: '台'
  },
  {
    productCode: '02-00108',
    productName: '伺服电机',
    category: '标准件',
    specification: '750W / 220V 标准型',
    routingName: '电机检测与装配路线',
    bomVersions: ['V1.0'],
    unit: '台'
  },
  {
    productCode: '08-00315',
    productName: '换边机 (PRO)',
    category: '成套设备',
    specification: 'HBJ-2026-PRO',
    routingName: '换边机标准制造工艺路线',
    bomVersions: ['V1.0', 'V2.0'],
    unit: '台'
  },
  {
    productCode: '09-00412',
    productName: '设备配件44',
    category: '机加件',
    specification: 'PJ-44-AL6061',
    routingName: '精密机加标准路线',
    bomVersions: ['V1.0'],
    unit: '件'
  }
];

// Helper to build order products for product dimension
export function computeProductDimensionProducts(
  productCode: string, 
  bomVersion: string, 
  selectedOrderNos: string[]
): SalesOrderProduct[] {
  const prodMeta = productCatalog.find(p => p.productCode === productCode) || productCatalog[0];

  // Filter sales orders containing this product (must exist in each selected sales order)
  const matchingOrders = allSalesOrders.filter(so => 
    selectedOrderNos.includes(so.orderNo) &&
    so.products.some(p => p.productCode === productCode)
  );

  const breakdown = matchingOrders.map(so => {
    const p = so.products.find(item => item.productCode === productCode)!;
    return {
      orderNo: so.orderNo,
      customer: so.customer,
      lineNo: p.lineNo,
      orderQuantity: p.orderQuantity,
      productionQuantity: p.productionQuantity || p.orderQuantity,
      planDeliveryDate: p.planDeliveryDate || so.planDeliveryDate,
      remark: p.remark || ''
    };
  });

  const totalOrderQty = breakdown.reduce((sum, item) => sum + item.orderQuantity, 0) || 0;
  const totalProdQty = breakdown.reduce((sum, item) => sum + item.productionQuantity, 0) || 0;

  return [{
    id: `prod-dim-${productCode}`,
    lineNo: breakdown[0]?.lineNo || 1,
    productCode: prodMeta.productCode,
    productName: prodMeta.productName,
    category: prodMeta.category,
    specification: prodMeta.specification,
    routingName: prodMeta.routingName,
    bomVersion: bomVersion,
    unit: prodMeta.unit,
    orderQuantity: totalOrderQty,
    productionQuantity: totalProdQty,
    customer: matchingOrders.map(so => so.customer).join('、') || '',
    planDeliveryDate: matchingOrders[0]?.planDeliveryDate || '2026-07-15',
    startDate: matchingOrders[0]?.startDate || '2026-06-15',
    endDate: matchingOrders[0]?.endDate || '2026-07-10',
    orderBreakdown: breakdown
  }];
}

interface OrderWizardProps {
  onBack?: () => void;
  onTaskClick?: (taskCode: string, task?: any) => void;
}

export default function OrderWizard({ onBack, onTaskClick }: OrderWizardProps) {
  const [bomData, setBomData] = useState<BomNode>(() => {
    try {
      const saved = safeStorage.getItem('mes_bomData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.code === 'A-00004') {
          parsed.operations = initialBomTree.operations;
        }
        return parsed;
      }
      return initialBomTree;
    } catch {
      return initialBomTree;
    }
  });

  const [schedulePlanMap, setSchedulePlanMap] = useState<Record<string, SchedulePlanItem>>(() => {
    try {
      const saved = safeStorage.getItem('mes_schedulePlanMap');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Department state (Auto-detected from product routing, empty if multiple departments)
  const [department, setDepartment] = useState<string>(() => {
    const saved = safeStorage.getItem('mes_department');
    if (saved) return saved;
    const initialCommon = computeCommonProducts(['SO-20260601-001']);
    const { autoSelectedDept } = detectProductDepartment(initialCommon[0]);
    return autoSelectedDept;
  });

  const [productInfoExpanded, setProductInfoExpanded] = useState<boolean>(true);

  // Sales order & Products state for Step 1
  const [selectedSalesOrderNos, setSelectedSalesOrderNos] = useState<string[]>([]);
  const [salesOrderLineInput, setSalesOrderLineInput] = useState<string>('1');
  const [isSoModalOpen, setIsSoModalOpen] = useState<boolean>(false);
  const [isSoDropdownOpen, setIsSoDropdownOpen] = useState<boolean>(false);
  const [soSearchText, setSoSearchText] = useState<string>('');

  const [customerName, setCustomerName] = useState<string>(() => {
    return safeStorage.getItem('mes_customerName') || '华为技术有限公司';
  });

  const [planDeliveryDate, setPlanDeliveryDate] = useState<string>(() => {
    return safeStorage.getItem('mes_planDeliveryDate') || '2026-06-30';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return safeStorage.getItem('mes_startDate') || '2026-06-10';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return safeStorage.getItem('mes_endDate') || '2026-06-28';
  });

  const [orderType, setOrderType] = useState<string>(() => {
    return safeStorage.getItem('mes_orderType') || '成品自制';
  });

  const [remarkText, setRemarkText] = useState<string>(() => {
    return safeStorage.getItem('mes_remarkText') || '';
  });

  // Current product list loaded into step 1
  const [orderProducts, setOrderProducts] = useState<SalesOrderProduct[]>(() => {
    try {
      const saved = safeStorage.getItem('mes_orderProducts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return computeCommonProducts(['SO-20260601-001']);
  });

  // Mandatory selected single product ID
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const saved = safeStorage.getItem('mes_selectedProductId');
    if (saved) return saved;
    const initialCommon = computeCommonProducts(['SO-20260601-001']);
    return initialCommon[0]?.id || 'so-prod-101';
  });

  const handleUpdateSchedulePlan = (nodeId: string, opId: string, updates: Partial<SchedulePlanItem>) => {
    setSchedulePlanMap(prev => {
      const key = `${nodeId}-${opId}`;
      const existing = prev[key] || {
        nodeId,
        opId,
        scheduledQuantity: 1,
      };
      return {
        ...prev,
        [key]: { ...existing, ...updates }
      };
    });
  };

  const [activeNodeId, setActiveNodeId] = useState<string>(() => {
    return safeStorage.getItem('mes_activeNodeId') || initialBomTree.id;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = safeStorage.getItem('mes_currentStep');
    return saved ? Number(saved) : 1;
  });

  const [orderCode, setOrderCode] = useState<string>(() => {
    return safeStorage.getItem('mes_orderCode') || 'MO202606090001';
  });

  const [sourceType, setSourceType] = useState<string>(() => {
    return safeStorage.getItem('mes_sourceType') || '手工创建';
  });

  const [priority, setPriority] = useState<string>(() => {
    return safeStorage.getItem('mes_priority') || '中';
  });

  const [checkedNodes, setCheckedNodes] = useState<Set<string>>(() => {
    try {
      const saved = safeStorage.getItem('mes_checkedNodes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [isStep3SidebarOpen, setIsStep3SidebarOpen] = useState(true);
  const [schedulingViewMode, setSchedulingViewMode] = useState<'material' | 'routing'>(() => {
    return (safeStorage.getItem('mes_schedulingViewMode') as 'material' | 'routing') || 'material';
  });

  // Dimension state for Customer Orders: '销售订单维度' vs '产品维度'
  const [orderDimension, setOrderDimension] = useState<'销售订单维度' | '产品维度'>(() => {
    return (safeStorage.getItem('mes_orderDimension') as '销售订单维度' | '产品维度') || '销售订单维度';
  });

  const [selectedProductCode, setSelectedProductCode] = useState<string>(() => {
    return safeStorage.getItem('mes_selectedProductCode') || 'PROD001';
  });

  const [selectedBomVersion, setSelectedBomVersion] = useState<string>(() => {
    return safeStorage.getItem('mes_selectedBomVersion') || 'V2.1';
  });

  // Notification Toast for sub-work-order actions and reminders
  const [showOrderQrModal, setShowOrderQrModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{
    show: boolean;
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (notificationToast?.show) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // Handle Generate Sub-Work-Orders action
  const handleGenerateSubWorkOrders = () => {
    if (checkedNodes.size === 0) {
      setNotificationToast({
        show: true,
        type: 'warning',
        message: '请先在左侧「产品与物料树」中勾选需要独立排产的半成品或零部件！'
      });
      return;
    }

    const checkedNames: string[] = [];
    checkedNodes.forEach(id => {
      const node = findNode(bomData, id);
      if (node) checkedNames.push(node.name);
    });

    const displaySummary = checkedNames.length <= 2 
      ? checkedNames.join('、') 
      : `${checkedNames.slice(0, 2).join('、')} 等 ${checkedNames.length} 项物料`;

    setNotificationToast({
      show: true,
      type: 'success',
      message: `已成功为「${displaySummary}」生成独立子工单，对应工艺与物料任务已拆分到排产池！`
    });
  };

  // Quick select all descendant subassemblies
  const handleQuickCheckSubassemblies = () => {
    const allDescendantIds = getAllDescendantIds(bomData);
    if (allDescendantIds.length === 0) return;
    
    setCheckedNodes(new Set(allDescendantIds));
    setNotificationToast({
      show: true,
      type: 'info',
      message: `已一键勾选所有下级半成品/零件 (${allDescendantIds.length} 项)，记得点击「生成子工单」完成工单拆分！`
    });
  };

  // Handle Toggling Sales Order Selection (Supports multi-select)
  const handleToggleSalesOrder = (soNo: string) => {
    let nextNos: string[];
    if (selectedSalesOrderNos.includes(soNo)) {
      nextNos = selectedSalesOrderNos.filter(n => n !== soNo);
    } else {
      nextNos = [...selectedSalesOrderNos, soNo];
    }
    
    setSelectedSalesOrderNos(nextNos);

    if (sourceType === '客户订单' && orderDimension === '产品维度') {
      const prodList = computeProductDimensionProducts(selectedProductCode, selectedBomVersion, nextNos);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
        const lineStr = prodList[0].orderBreakdown?.map(b => b.lineNo).join(', ') || '';
        setSalesOrderLineInput(lineStr);
        const selectedOrders = allSalesOrders.filter(so => nextNos.includes(so.orderNo));
        if (selectedOrders.length > 0) {
          const customers = Array.from(new Set(selectedOrders.map(so => so.customer))).join('、');
          setCustomerName(customers);
          const deliveryDates = selectedOrders.map(so => so.planDeliveryDate).filter(Boolean).sort();
          if (deliveryDates.length > 0) setPlanDeliveryDate(deliveryDates[0]);
        } else {
          setCustomerName('');
        }
      }
    } else {
      const common = computeCommonProducts(nextNos);
      setOrderProducts(common);

      if (common.length > 0) {
        setSelectedProductId(common[0].id);
        setSelectedProductCode(common[0].productCode);
        setSelectedBomVersion(common[0].bomVersion || 'V1.0');
        const lineStr = common[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(common[0].lineNo);
        setSalesOrderLineInput(lineStr);
        setBomData(prev => ({
          ...prev,
          name: common[0].productName,
          code: common[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      } else {
        setSelectedProductId('');
        setSalesOrderLineInput('');
      }

      const selectedOrders = allSalesOrders.filter(so => nextNos.includes(so.orderNo));
      if (selectedOrders.length > 0) {
        const customers = Array.from(new Set(selectedOrders.map(so => so.customer))).join('、');
        setCustomerName(customers);
        const deliveryDates = selectedOrders.map(so => so.planDeliveryDate).filter(Boolean).sort();
        if (deliveryDates.length > 0) setPlanDeliveryDate(deliveryDates[0]);
      } else {
        setCustomerName('');
      }
    }
  };

  // Handle Dimension Change for Customer Orders
  const handleOrderDimensionChange = (dimension: '销售订单维度' | '产品维度') => {
    setOrderDimension(dimension);
    if (dimension === '销售订单维度') {
      const defaultOrders = selectedSalesOrderNos.length > 0 ? selectedSalesOrderNos : ['HY-26C-081'];
      setSelectedSalesOrderNos(defaultOrders);
      const common = computeCommonProducts(defaultOrders);
      setOrderProducts(common);
      if (common.length > 0) {
        setSelectedProductId(common[0].id);
        setSelectedProductCode(common[0].productCode);
        setSelectedBomVersion(common[0].bomVersion || 'V1.0');
        const lineStr = common[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(common[0].lineNo);
        setSalesOrderLineInput(lineStr);
        setBomData(prev => ({
          ...prev,
          name: common[0].productName,
          code: common[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      } else {
        setSelectedProductId('');
        setSalesOrderLineInput('');
      }
      const selectedOrders = allSalesOrders.filter(so => defaultOrders.includes(so.orderNo));
      if (selectedOrders.length > 0) {
        setCustomerName(Array.from(new Set(selectedOrders.map(so => so.customer))).join('、'));
        const deliveryDates = selectedOrders.map(so => so.planDeliveryDate).filter(Boolean).sort();
        if (deliveryDates.length > 0) setPlanDeliveryDate(deliveryDates[0]);
      }
    } else {
      // Product Dimension: find sales orders from ONGOING_SALES_ORDERS that contain selectedProductCode
      const targetProdCode = productCatalog.some(p => p.productCode === selectedProductCode)
        ? selectedProductCode
        : 'CG-02167';
      const meta = productCatalog.find(p => p.productCode === targetProdCode) || productCatalog[0];
      const targetBom = meta.bomVersions.includes(selectedBomVersion) ? selectedBomVersion : meta.bomVersions[0];
      setSelectedProductCode(targetProdCode);
      setSelectedBomVersion(targetBom);

      const matchingOrders = ONGOING_SALES_ORDERS.filter(so => 
        so.items.some(p => p.materialCode === targetProdCode)
      );
      const matchingNos = matchingOrders.map(so => so.orderNo);
      setSelectedSalesOrderNos(matchingNos);
      const prodList = computeProductDimensionProducts(targetProdCode, targetBom, matchingNos);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
        const lineStr = prodList[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(prodList[0].lineNo);
        setSalesOrderLineInput(lineStr);
        setBomData(prev => ({
          ...prev,
          name: prodList[0].productName,
          code: prodList[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(prodList[0]);
        setDepartment(autoSelectedDept);
        setCustomerName(prodList[0].customer || '');
        setPlanDeliveryDate(prodList[0].planDeliveryDate || '2026-07-15');
      }
    }
  };

  // Handle Product change in Product Dimension
  const handleProductDimensionProductChange = (newCode: string) => {
    setSelectedProductCode(newCode);
    const meta = productCatalog.find(p => p.productCode === newCode);
    const defaultBom = meta?.bomVersions[0] || 'V1.0';
    setSelectedBomVersion(defaultBom);

    // Filter selectable sales orders to ONLY those that contain this product
    const matchingOrders = ONGOING_SALES_ORDERS.filter(so => 
      so.items.some(p => p.materialCode === newCode)
    );
    const matchingNos = matchingOrders.map(so => so.orderNo);
    setSelectedSalesOrderNos(matchingNos);
    const prodList = computeProductDimensionProducts(newCode, defaultBom, matchingNos);
    setOrderProducts(prodList);
    if (prodList.length > 0) {
      setSelectedProductId(prodList[0].id);
      const lineStr = prodList[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(prodList[0].lineNo);
      setSalesOrderLineInput(lineStr);
      setBomData(prev => ({
        ...prev,
        name: prodList[0].productName,
        code: prodList[0].productCode
      }));
      const { autoSelectedDept } = detectProductDepartment(prodList[0]);
      setDepartment(autoSelectedDept);
      setCustomerName(prodList[0].customer || '');
      setPlanDeliveryDate(prodList[0].planDeliveryDate || '2026-07-15');
    }
  };

  // Handle BOM version change in Product Dimension
  const handleProductDimensionBomChange = (newBom: string) => {
    setSelectedBomVersion(newBom);

    const matchingOrders = ONGOING_SALES_ORDERS.filter(so => 
      so.items.some(p => p.materialCode === selectedProductCode)
    );
    const matchingNos = selectedSalesOrderNos.filter(no =>
      matchingOrders.some(so => so.orderNo === no)
    );
    const finalNos = matchingNos.length > 0 ? matchingNos : matchingOrders.map(so => so.orderNo);
    setSelectedSalesOrderNos(finalNos);
    const prodList = computeProductDimensionProducts(selectedProductCode, newBom, finalNos);
    setOrderProducts(prodList);
    if (prodList.length > 0) {
      setSelectedProductId(prodList[0].id);
      setCustomerName(prodList[0].customer || '');
      setPlanDeliveryDate(prodList[0].planDeliveryDate || '2026-07-15');
    }
  };

  // Handle Source Type switch
  const handleSourceTypeChange = (newType: string) => {
    setSourceType(newType);
    if (newType === '库存备货') {
      setCustomerName('内部库存中心');
      setOrderProducts(defaultStockProducts);
      setSelectedProductId(defaultStockProducts[0].id);
      setSelectedProductCode(defaultStockProducts[0].productCode);
      const { autoSelectedDept } = detectProductDepartment(defaultStockProducts[0]);
      setDepartment(autoSelectedDept);
    } else if (newType === '客户订单' && orderDimension === '产品维度') {
      const matchingOrders = ONGOING_SALES_ORDERS.filter(so => 
        so.items.some(p => p.materialCode === selectedProductCode)
      );
      const matchingNos = matchingOrders.map(so => so.orderNo);
      setSelectedSalesOrderNos(matchingNos);
      const prodList = computeProductDimensionProducts(selectedProductCode, selectedBomVersion, matchingNos);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
        const lineStr = prodList[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(prodList[0].lineNo);
        setSalesOrderLineInput(lineStr);
        setBomData(prev => ({
          ...prev,
          name: prodList[0].productName,
          code: prodList[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(prodList[0]);
        setDepartment(autoSelectedDept);
        setCustomerName(prodList[0].customer || '');
        setPlanDeliveryDate(prodList[0].planDeliveryDate || '2026-07-15');
      }
    } else {
      const targetOrders = selectedSalesOrderNos.length > 0 ? selectedSalesOrderNos : ['HY-26C-081'];
      setSelectedSalesOrderNos(targetOrders);
      const common = computeCommonProducts(targetOrders);
      setOrderProducts(common);
      if (common.length > 0) {
        setSelectedProductId(common[0].id);
        setSelectedProductCode(common[0].productCode);
        const lineStr = common[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(common[0].lineNo);
        setSalesOrderLineInput(lineStr);
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      }
      const selectedOrders = allSalesOrders.filter(so => targetOrders.includes(so.orderNo));
      if (selectedOrders.length > 0) {
        setCustomerName(Array.from(new Set(selectedOrders.map(so => so.customer))).join('、'));
      }
    }
  };

  // Handle Product Selection (Mandatory single choice)
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = orderProducts.find(p => p.id === productId);
    if (prod) {
      setSelectedProductCode(prod.productCode);
      const lineStr = prod.orderBreakdown?.map(b => b.lineNo).join(', ') || (prod.lineNo ? String(prod.lineNo) : '');
      if (lineStr) {
        setSalesOrderLineInput(lineStr);
      }
      setBomData(prev => ({
        ...prev,
        name: prod.productName,
        code: prod.productCode
      }));
      // Auto derive department from routing
      const { autoSelectedDept } = detectProductDepartment(prod);
      setDepartment(autoSelectedDept);
    }
  };

  // Handle Confirm from SalesOrderSelectModal
  const handleConfirmSalesOrderModal = (selectedOrders: string[], _selectedItems: SalesOrderModalMaterialItem[]) => {
    if (sourceType === '客户订单' && orderDimension === '产品维度') {
      // In Product Dimension: only sales orders containing the selected product are valid
      const validOrders = selectedOrders.filter(orderNo =>
        allSalesOrders.some(
          so => so.orderNo === orderNo && so.products.some(p => p.productCode === selectedProductCode)
        )
      );
      setSelectedSalesOrderNos(validOrders);
      const prodList = computeProductDimensionProducts(selectedProductCode, selectedBomVersion, validOrders);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
        const lineStr = prodList[0].orderBreakdown?.map(b => b.lineNo).join(', ') || String(prodList[0].lineNo);
        setSalesOrderLineInput(lineStr);
        if (prodList[0].customer) setCustomerName(prodList[0].customer);
        if (prodList[0].planDeliveryDate) setPlanDeliveryDate(prodList[0].planDeliveryDate);
        setBomData(prev => ({
          ...prev,
          name: prodList[0].productName,
          code: prodList[0].productCode,
        }));
        const { autoSelectedDept } = detectProductDepartment(prodList[0]);
        if (autoSelectedDept) setDepartment(autoSelectedDept);
      }
      return;
    }

    // In Sales Order Dimension (or Manual with sales orders):
    // Displayed products MUST be the strict intersection (交集) of all selected sales orders
    setSelectedSalesOrderNos(selectedOrders);
    const commonProducts = computeCommonProducts(selectedOrders);
    setOrderProducts(commonProducts);

    const matchedSoList = allSalesOrders.filter(so => selectedOrders.includes(so.orderNo));
    if (matchedSoList.length > 0) {
      setCustomerName(Array.from(new Set(matchedSoList.map(so => so.customer))).join('、'));
      const deliveryDates = matchedSoList.map(so => so.planDeliveryDate).filter(Boolean).sort();
      if (deliveryDates.length > 0) setPlanDeliveryDate(deliveryDates[0]);
    }

    if (commonProducts.length > 0) {
      const firstProd = commonProducts[0];
      setSelectedProductId(firstProd.id);
      setSelectedProductCode(firstProd.productCode);
      setSelectedBomVersion(firstProd.bomVersion || 'V1.0');
      const lineStr = firstProd.orderBreakdown?.map(b => b.lineNo).join(', ') || String(firstProd.lineNo);
      setSalesOrderLineInput(lineStr);
      setBomData(prev => ({
        ...prev,
        name: firstProd.productName,
        code: firstProd.productCode,
      }));
      const { autoSelectedDept } = detectProductDepartment(firstProd);
      if (autoSelectedDept) setDepartment(autoSelectedDept);
    } else {
      setSelectedProductId('');
      setSalesOrderLineInput('');
      setNotificationToast({
        show: true,
        type: 'warning',
        message: '所选销售订单没有共同交集产品，请重新选择包含相同产品的销售订单！',
      });
    }
  };

  // Handle Production Quantity modification (Overall)
  const handleUpdateProductionQuantity = (productId: string, newQty: number) => {
    setOrderProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      if (!p.orderBreakdown || p.orderBreakdown.length === 0) {
        return { ...p, productionQuantity: newQty };
      }
      // Scale breakdown proportionally
      const oldTotal = p.productionQuantity || p.orderQuantity || 1;
      const ratio = newQty / oldTotal;
      const updatedBreakdown = p.orderBreakdown.map(bd => ({
        ...bd,
        productionQuantity: Math.max(1, Math.round(bd.productionQuantity * ratio))
      }));
      const recalculatedTotal = updatedBreakdown.reduce((sum, bd) => sum + bd.productionQuantity, 0);
      return {
        ...p,
        productionQuantity: recalculatedTotal,
        orderBreakdown: updatedBreakdown
      };
    }));
  };

  // Handle Individual Sales Order Production Quantity Modification
  const handleUpdateBreakdownQuantity = (productId: string, orderNo: string, newQty: number) => {
    setOrderProducts(prev => prev.map(p => {
      if (p.id !== productId || !p.orderBreakdown) return p;
      const nextBreakdown = p.orderBreakdown.map(bd => 
        bd.orderNo === orderNo ? { ...bd, productionQuantity: newQty } : bd
      );
      const nextTotalProdQty = nextBreakdown.reduce((sum, bd) => sum + bd.productionQuantity, 0);
      return {
        ...p,
        productionQuantity: nextTotalProdQty,
        orderBreakdown: nextBreakdown
      };
    }));
  };

  useEffect(() => {
    safeStorage.setItem('mes_currentStep', String(currentStep));
  }, [currentStep]);

  useEffect(() => {
    safeStorage.setItem('mes_sourceType', sourceType);
  }, [sourceType]);

  useEffect(() => {
    safeStorage.setItem('mes_priority', priority);
  }, [priority]);

  useEffect(() => {
    safeStorage.setItem('mes_activeNodeId', activeNodeId);
  }, [activeNodeId]);

  useEffect(() => {
    safeStorage.setItem('mes_schedulingViewMode', schedulingViewMode);
  }, [schedulingViewMode]);

  useEffect(() => {
    safeStorage.setItem('mes_checkedNodes', JSON.stringify(Array.from(checkedNodes)));
  }, [checkedNodes]);

  useEffect(() => {
    safeStorage.setItem('mes_schedulePlanMap', JSON.stringify(schedulePlanMap));
  }, [schedulePlanMap]);

  useEffect(() => {
    safeStorage.setItem('mes_bomData', JSON.stringify(bomData));
  }, [bomData]);

  useEffect(() => {
    safeStorage.setItem('mes_selectedSalesOrderNos', JSON.stringify(selectedSalesOrderNos));
  }, [selectedSalesOrderNos]);

  useEffect(() => {
    safeStorage.setItem('mes_customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    safeStorage.setItem('mes_planDeliveryDate', planDeliveryDate);
  }, [planDeliveryDate]);

  useEffect(() => {
    safeStorage.setItem('mes_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    safeStorage.setItem('mes_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    safeStorage.setItem('mes_orderType', orderType);
  }, [orderType]);

  useEffect(() => {
    safeStorage.setItem('mes_remarkText', remarkText);
  }, [remarkText]);

  useEffect(() => {
    safeStorage.setItem('mes_orderProducts', JSON.stringify(orderProducts));
  }, [orderProducts]);

  useEffect(() => {
    safeStorage.setItem('mes_selectedProductId', selectedProductId);
  }, [selectedProductId]);

  useEffect(() => {
    safeStorage.setItem('mes_department', department);
  }, [department]);

  useEffect(() => {
    safeStorage.setItem('mes_orderDimension', orderDimension);
  }, [orderDimension]);

  useEffect(() => {
    safeStorage.setItem('mes_selectedProductCode', selectedProductCode);
  }, [selectedProductCode]);

  useEffect(() => {
    safeStorage.setItem('mes_selectedBomVersion', selectedBomVersion);
  }, [selectedBomVersion]);

  const steps = ['基础信息', 'BOM组成', '工艺路线与工序', '排产计划', '生产任务'];

  // Find active node recursively
  const findNode = (node: BomNode, id: string): BomNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getParentPath = (node: BomNode, targetId: string, path: BomNode[] = []): BomNode[] | null => {
    if (node.id === targetId) return path;
    if (node.children) {
      for (const child of node.children) {
         const p = getParentPath(child, targetId, [...path, node]);
         if (p) return p;
      }
    }
    return null;
  };

  const getAllDescendantIds = (node: BomNode): string[] => {
    const ids: string[] = [];
    if (node.children) {
      for (const child of node.children) {
        ids.push(child.id);
        ids.push(...getAllDescendantIds(child));
      }
    }
    return ids;
  };

  // Fields config dynamically adjusted by sourceType and orderDimension
  const getFieldsConfig = () => {
    switch (sourceType) {
      case '手工创建':
        return [
          'orderCode',
          'sourceType',
          'salesOrder',
          'salesOrderLine',
          'productSelect',
          'planDeliveryDate',
          'priority',
          'department',
          'orderType',
          'dateRange'
        ];
      case '客户订单':
        if (orderDimension === '产品维度') {
          return [
            'orderCode', 
            'sourceType', 
            'orderDimension', 
            'productSelect', 
            'bomVersionSelect', 
            'salesOrder', 
            'salesOrderLine', 
            'planDeliveryDate', 
            'priority', 
            'department', 
            'orderType', 
            'dateRange'
          ];
        }
        return [
          'orderCode', 
          'sourceType', 
          'orderDimension', 
          'salesOrder', 
          'salesOrderLine', 
          'productSelect',
          'planDeliveryDate', 
          'priority', 
          'department', 
          'orderType', 
          'dateRange'
        ];
      case '库存备货':
        return ['orderCode', 'sourceType', 'productSelect', 'priority', 'planDeliveryDate', 'department', 'orderType', 'dateRange'];
      default:
        return [];
    }
  };

  const currentlySelectedProduct = orderProducts.find(p => p.id === selectedProductId) || orderProducts[0];
  const currentProductMeta = productCatalog.find(p => p.productCode === selectedProductCode) || productCatalog[0];

  const renderField = (fieldName: string, index?: number) => {
    if (fieldName === 'empty') return <div key={`empty-${index}`} />;

    if (fieldName === 'PRODUCT_INFO') {
      return (
        <ProductInfoSection 
          key="PRODUCT_INFO"
          products={orderProducts}
          selectedProductId={selectedProductId}
          onSelectProduct={handleSelectProduct}
          onUpdateProductionQuantity={handleUpdateProductionQuantity}
          onUpdateBreakdownQuantity={handleUpdateBreakdownQuantity}
          isExpanded={productInfoExpanded}
          onToggleExpand={() => setProductInfoExpanded(!productInfoExpanded)}
          salesOrderNo={sourceType !== '库存备货' ? selectedSalesOrderNos.join(', ') : undefined}
          selectedSalesOrderNos={sourceType !== '库存备货' ? selectedSalesOrderNos : []}
          sourceType={sourceType}
        />
      );
    }

    const required = ['orderCode', 'sourceType', 'orderType', 'dateRange', 'salesOrder', 'department', 'productSelect', 'bomVersionSelect'].includes(fieldName);
    const Label = ({ children }: any) => (
      <label className="w-24 text-right pt-2 text-[13px] text-slate-600 shrink-0">
        {required && <span className="text-red-500 mr-1">*</span>}
        {children}
      </label>
    );
    
    switch (fieldName) {
      case 'orderDimension':
        return (
          <div key={fieldName} className="flex items-start gap-4 col-span-1 md:col-span-2 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <label className="w-24 text-right pt-1.5 text-[13px] text-blue-900 font-bold shrink-0">
              <span className="text-red-500 mr-1">*</span>排产维度
            </label>
            <div className="flex-1 flex flex-wrap items-center gap-6 text-[13px]">
              <label 
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer select-none transition-all border",
                  orderDimension === '销售订单维度' 
                    ? "bg-white border-blue-300 text-blue-700 font-bold shadow-2xs" 
                    : "bg-transparent border-transparent text-slate-600 hover:text-slate-900"
                )}
                onClick={() => handleOrderDimensionChange('销售订单维度')}
              >
                <input 
                  type="radio" 
                  name="orderDimension" 
                  checked={orderDimension === '销售订单维度'} 
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>销售订单维度</span>
                  <span className="text-[11px] font-normal text-slate-400">(选订单合并共有产品)</span>
                </span>
              </label>

              <label 
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer select-none transition-all border",
                  orderDimension === '产品维度' 
                    ? "bg-white border-blue-300 text-blue-700 font-bold shadow-2xs" 
                    : "bg-transparent border-transparent text-slate-600 hover:text-slate-900"
                )}
                onClick={() => handleOrderDimensionChange('产品维度')}
              >
                <input 
                  type="radio" 
                  name="orderDimension" 
                  checked={orderDimension === '产品维度'} 
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-500" />
                  <span>产品维度</span>
                  <span className="text-[11px] font-normal text-slate-400">(先选产品与BOM版本，自动过滤同版本订单)</span>
                </span>
              </label>
            </div>
          </div>
        );

      case 'productSelect': {
        const isProductDimension = sourceType === '客户订单' && orderDimension === '产品维度';
        const isSalesOrderDimensionWithSo = !isProductDimension && sourceType !== '库存备货' && selectedSalesOrderNos.length > 0;
        const isDisabled = isSalesOrderDimensionWithSo && orderProducts.length === 0;

        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>产品名称</Label>
            <div className="flex-1">
              <select 
                value={isSalesOrderDimensionWithSo ? (currentlySelectedProduct?.productCode || '') : selectedProductCode}
                disabled={isDisabled}
                onChange={(e) => {
                  const nextCode = e.target.value;
                  if (isSalesOrderDimensionWithSo) {
                    const matchedProd = orderProducts.find(p => p.productCode === nextCode);
                    if (matchedProd) {
                      handleSelectProduct(matchedProd.id);
                    }
                  } else {
                    handleProductDimensionProductChange(nextCode);
                  }
                }}
                className={cn(
                  "w-full h-9 px-3 border border-slate-200 rounded text-[13px] outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat transition-colors font-medium",
                  isDisabled
                    ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "bg-white text-slate-800 focus:border-blue-400 cursor-pointer"
                )}
              >
                {isSalesOrderDimensionWithSo ? (
                  orderProducts.length > 0 ? (
                    orderProducts.map(p => (
                      <option key={p.productCode} value={p.productCode}>
                        {p.productName} ({p.productCode})
                      </option>
                    ))
                  ) : (
                    <option value="">所选销售订单无交集产品</option>
                  )
                ) : (
                  productCatalog.map(p => (
                    <option key={p.productCode} value={p.productCode}>
                      {p.productName} ({p.productCode})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        );
      }

      case 'bomVersionSelect':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>BOM版本</Label>
            <div className="flex-1">
              <select 
                value={selectedBomVersion}
                onChange={(e) => handleProductDimensionBomChange(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat cursor-pointer transition-colors text-slate-800 font-medium font-mono"
              >
                {currentProductMeta.bomVersions.map(ver => (
                  <option key={ver} value={ver}>
                    {ver} {ver === currentProductMeta.bomVersions[0] ? '(默认推荐版本)' : '(历史/定制版本)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'department':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>所属部门</Label>
            <div className="flex-1">
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat cursor-pointer transition-colors text-slate-800 font-medium"
              >
                <option value="">-- 请选择所属部门 --</option>
                <option value="钣金部">钣金部</option>
                <option value="机加部">机加部</option>
                <option value="组装部">组装部</option>
              </select>
            </div>
          </div>
        );
      case 'orderCode':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>工单编码</Label>
            <div className="flex-1 flex items-center gap-3">
              <input type="text" value={orderCode} readOnly className="w-full h-9 px-3 bg-white border border-slate-200 shadow-2xs rounded text-[13px] text-slate-700 font-mono font-medium outline-none" />
              <div 
                onClick={() => {
                  const now = new Date();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const randomSeq = String(Math.floor(Math.random() * 9000) + 1000);
                  const newCode = `MO${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${randomSeq}`;
                  setOrderCode(newCode);
                  safeStorage.setItem('mes_orderCode', newCode);
                }}
                className="flex items-center gap-2 shrink-0 cursor-pointer select-none group"
                title="点击重新生成工单编码"
              >
                 <div className="w-9 h-5 bg-[#1677ff] rounded-full relative group-hover:bg-blue-600 transition-colors"><div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div></div>
                 <span className="text-[13px] text-[#1677ff] whitespace-nowrap group-hover:underline">自动生成</span>
              </div>
            </div>
          </div>
        );
      case 'sourceType':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>来源类型</Label>
            <div className="flex-1 flex items-center gap-5 pt-2 text-[13px] whitespace-nowrap">
               {(['手工创建', '客户订单', '库存备货']).map(type => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSourceTypeChange(type)}>
                     <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${sourceType === type ? 'border-[#1677ff]' : 'border-slate-300'}`}>
                       {sourceType === type && <div className="w-2 h-2 rounded-full bg-[#1677ff]"></div>}
                     </div>
                     <span className={sourceType === type ? 'text-[#1677ff] font-medium' : 'text-slate-600'}>{type}</span>
                  </label>
               ))}
            </div>
          </div>
        );
      case 'salesOrder': {
        return (
          <div key={fieldName} className="flex items-start gap-4 relative z-30">
            <Label>销售订单</Label>
            <div className="flex-1 relative">
              <div 
                onClick={() => setIsSoModalOpen(true)}
                className="w-full min-h-[36px] px-3 py-1 bg-white border border-slate-200 hover:border-blue-400 rounded text-[13px] flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors"
              >
                {selectedSalesOrderNos.length === 0 ? (
                  <span className="text-slate-400 text-[13px]">
                    可选择销售订单
                  </span>
                ) : (
                  selectedSalesOrderNos.map(no => (
                    <span 
                      key={no} 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-xs"
                    >
                      <span className="font-mono font-bold">{no}</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSalesOrder(no);
                        }}
                        className="text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded p-0.5 transition-colors cursor-pointer ml-0.5"
                        title="移除销售订单"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
                
                <div className="ml-auto flex items-center gap-1 shrink-0 text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'planDeliveryDate':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>计划交货日期</Label>
            <div className="flex-1 flex items-center gap-2 h-9 px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 focus-within:border-blue-400 transition-colors cursor-pointer">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="date" 
                value={planDeliveryDate}
                onChange={(e) => setPlanDeliveryDate(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-700 cursor-pointer text-xs" 
              />
            </div>
          </div>
        );
      case 'orderType':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>工单类型</Label>
            <div className="flex-1">
              <select 
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-blue-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat cursor-pointer"
              >
                <option value="成品自制">成品自制</option>
                <option value="半成品生产">半成品生产</option>
                <option value="返工重修">返工重修</option>
              </select>
            </div>
          </div>
        );
      case 'priority':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>优先级</Label>
            <div className="flex-1">
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-blue-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat cursor-pointer"
              >
                <option value="紧急">紧急</option>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
          </div>
        );
      case 'salesOrderLine': {
        const isSoFilled = selectedSalesOrderNos.length > 0;
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>项次</Label>
            <div className="flex-1">
              <input 
                type="text" 
                disabled={isSoFilled}
                value={salesOrderLineInput} 
                onChange={(e) => setSalesOrderLineInput(e.target.value)}
                placeholder={isSoFilled ? "自动带出" : "请输入项次"}
                title={salesOrderLineInput}
                className={cn(
                  "w-full h-9 px-3 border border-slate-200 rounded text-[13px] font-mono font-medium outline-none truncate transition-colors",
                  isSoFilled
                    ? "bg-white text-slate-500 cursor-not-allowed shadow-2xs"
                    : "bg-white text-slate-700 focus:border-blue-400"
                )}
              />
            </div>
          </div>
        );
      }
      case 'dateRange':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>计划起止日期</Label>
            <div className="flex-1 flex items-center gap-1.5 h-9 px-2 bg-white border border-slate-200 rounded text-[13px] text-slate-700 focus-within:border-blue-400 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mx-1" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-28 flex-1 bg-transparent outline-none text-center text-slate-700 cursor-pointer text-xs" 
              />
              <span className="text-slate-400 shrink-0 text-xs">至</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-28 flex-1 bg-transparent outline-none text-center text-slate-700 cursor-pointer text-xs" 
              />
            </div>
          </div>
        );
      case 'drawing':
      case 'qrCode':
        return (
          <div key={fieldName} className="flex flex-col items-center">
            <span className="text-[13px] text-slate-600 mb-2 font-medium">工单二维码</span>
            <div 
              onClick={() => setShowOrderQrModal(true)}
              className="w-40 h-40 border border-slate-200/90 rounded-xl bg-white shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-2.5 flex flex-col items-center justify-between group relative"
              title="点击查看/打印工单流转二维码标签"
            >
              {/* QR Code Container */}
              <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-100 shadow-2xs flex items-center justify-center relative group-hover:scale-105 transition-transform">
                <QrCode className="w-full h-full text-slate-900" />
              </div>
              <div className="w-full flex flex-col items-center text-center">
                <span className="font-mono text-xs font-bold text-slate-800 tracking-tight">
                  {orderCode || 'MO-2026-0001'}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 group-hover:text-blue-600 transition-colors">
                  车间扫码流转
                </span>
              </div>
            </div>
          </div>
        );
      case 'remark':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <label className="w-24 text-left pt-2 text-[13px] text-slate-600 shrink-0">备注</label>
            <div className="flex-1">
              <textarea 
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="请输入工单生产备注说明" 
                className="w-full p-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-blue-400 min-h-[70px] resize-y transition-colors" 
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const activeNode = findNode(bomData, activeNodeId);

  // Update operations for a specific node
  const handleUpdateOperations = (nodeId: string, newOperations: Operation[]) => {
    const updateNodeOperations = (node: BomNode): BomNode => {
      if (node.id === nodeId) {
        return { ...node, operations: newOperations };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNodeOperations) };
      }
      return node;
    };
    setBomData(updateNodeOperations(bomData));
  };

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col font-sans text-slate-900">
      {/* Header Breadcrumb */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-sm shadow-xs z-20 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hover:text-slate-700 cursor-pointer" onClick={onBack}>生产管理</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1.5" onClick={onBack}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            工单管理
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold tracking-tight">新增生产工单</span>
        </div>

        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>返回工单列表</span>
        </button>
      </header>

      {/* Top Tab Bar for switching between steps */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = currentStep === stepNum;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(stepNum)}
                className={cn(
                  "py-3.5 border-b-2 text-[14px] flex items-center transition-colors whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-[#1677ff] text-[#1677ff] font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900 font-medium"
                )}
              >
                <span>{step}</span>
              </button>
            );
          })}
        </div>

        {currentStep === 4 && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => setSchedulingViewMode('material')}
              className={cn(
                "px-3 py-1 rounded-md transition-all cursor-pointer font-medium",
                schedulingViewMode === 'material'
                  ? "bg-white text-[#1677ff] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              按物料排产
            </button>
            <button
              onClick={() => setSchedulingViewMode('routing')}
              className={cn(
                "px-3 py-1 rounded-md transition-all cursor-pointer font-medium",
                schedulingViewMode === 'routing'
                  ? "bg-white text-[#1677ff] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              按工艺路线排产
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full relative">
        {/* Floating Notification Toast */}
        {notificationToast?.show && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300 pointer-events-auto">
            <div className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium backdrop-blur-md",
              notificationToast.type === 'success' && "bg-emerald-50/95 border-emerald-200 text-emerald-900",
              notificationToast.type === 'warning' && "bg-amber-50/95 border-amber-200 text-amber-900",
              notificationToast.type === 'info' && "bg-blue-50/95 border-blue-200 text-blue-900"
            )}>
              {notificationToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notificationToast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              {notificationToast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{notificationToast.message}</span>
              <button 
                onClick={() => setNotificationToast(null)}
                className="ml-1 p-0.5 rounded hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: 基础信息 */}
        {currentStep === 1 && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 bg-white">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 lg:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-[13px] font-bold text-slate-800">基础信息</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  录入工单编号、选定销售订单与排产维度、指定责任部门及交付排期
                </span>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {getFieldsConfig().map(renderField)}
                </div>
                <div className="w-full lg:w-[170px] flex flex-col shrink-0 pt-1">
                  {renderField('drawing')}
                </div>
              </div>
              
              {renderField('PRODUCT_INFO')}
              
              <div className="mt-2">
                {renderField('remark')}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BOM组成 */}
        {currentStep === 2 && (
          <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <BomCompositionTable 
                defaultBomVersion={currentlySelectedProduct?.bomVersion || 'V2.1'}
                productName={currentlySelectedProduct?.productName}
                productCode={currentlySelectedProduct?.productCode}
              />
            </div>
          </div>
        )}

        {/* TAB 3: 工艺路线与工序 */}
        {currentStep === 3 && (
          <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex">
              {/* Left Split: Tree */}
              <div className={cn("shrink-0 border-r border-slate-200 bg-white flex flex-col pt-4 overflow-hidden transition-all duration-300", isStep3SidebarOpen ? "w-[330px]" : "w-0 border-r-0")}>
                <div className="w-[330px] flex flex-col h-full">
                  <div className="px-4 pb-3 border-b border-slate-100 flex flex-col gap-2.5 mb-1 shrink-0">
                    <div className="flex items-center justify-between whitespace-nowrap">
                      <h3 className="text-[13px] font-bold text-slate-800 tracking-wide shrink-0">产品与物料树 (BOM)</h3>
                      <button 
                        id="btn-generate-sub-work-orders"
                        onClick={handleGenerateSubWorkOrders}
                        className="text-[11px] px-2.5 py-1.5 bg-[#e6f4ff] hover:bg-[#bae0ff] active:bg-[#91caff] text-[#1677ff] font-bold rounded-md transition-all shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1 cursor-pointer border border-[#91caff]/60 hover:border-[#1677ff]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#1677ff]" />
                        生成子工单{checkedNodes.size > 0 ? ` (${checkedNodes.size})` : ''}
                      </button>
                    </div>

                    {/* 提示语卡片：提示用户记得生成子工单 */}
                    <div className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900 shadow-2xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 leading-snug flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 text-[11px]">排产提醒</span>
                          {checkedNodes.size > 0 ? (
                            <span className="text-[10px] bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded font-semibold">
                              已选 {checkedNodes.size} 项物料
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-white border border-amber-200 px-1.5 py-0.5 rounded">未勾选</span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          如需对自制半成品/零件单独排产，请在下方勾选对应物料节点，<strong>记得点击右上角「生成子工单」</strong>。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-600 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-2xs cursor-pointer"
                        defaultValue="全部"
                      >
                        <option value="全部">全部物料类型</option>
                        <option value="钣金件">钣金件</option>
                        <option value="机加件">机加件</option>
                      </select>
                      <button 
                        onClick={handleQuickCheckSubassemblies}
                        className="text-[11px] text-slate-600 hover:text-blue-600 px-2 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                        title="快速勾选全部下级自制件"
                      >
                        全选下级
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto px-4 pb-4 min-h-0">
                    <BomTree 
                      node={bomData} 
                      activeNodeId={activeNodeId} 
                      onSelect={setActiveNodeId} 
                      checkedNodes={checkedNodes}
                      onCheckNode={(id, checked) => {
                        setCheckedNodes(prev => {
                          const next = new Set(prev);
                          const targetNode = findNode(bomData, id);
                          if (!targetNode) return next;

                          if (checked) {
                            next.add(id);
                            getAllDescendantIds(targetNode).forEach(d => next.add(d));
                            const parents = getParentPath(bomData, id);
                            if (parents) {
                              for (let i = parents.length - 1; i >= 0; i--) {
                                const p = parents[i];
                                if (p.children && p.children.every(c => next.has(c.id))) {
                                  next.add(p.id);
                                }
                              }
                            }
                          } else {
                            next.delete(id);
                            getAllDescendantIds(targetNode).forEach(d => next.delete(d));

                            const parents = getParentPath(bomData, id);
                            if (parents) {
                              parents.forEach(p => next.delete(p.id));
                            }
                          }
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Split: Editor */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0 relative">
                <button 
                  onClick={() => setIsStep3SidebarOpen(!isStep3SidebarOpen)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-4 h-12 bg-white border border-l-0 border-slate-200 rounded-r-md flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm"
                >
                  {isStep3SidebarOpen ? <ChevronLeft className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                </button>
                {activeNode ? (
                  <RoutingEditor 
                    key={activeNode.id}
                    node={activeNode}
                    onChange={(newOps) => handleUpdateOperations(activeNode.id, newOps)}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                    <Package className="w-10 h-10 opacity-20" />
                    <p>请在左侧选择产品或物料以编辑工序</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 排产计划 */}
        {currentStep === 4 && (
          <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              {schedulingViewMode === 'material' ? (
                <SchedulingPanel 
                  bomData={bomData} 
                  schedulePlanMap={schedulePlanMap} 
                  onUpdateSchedulePlan={handleUpdateSchedulePlan} 
                  setSchedulePlanMap={setSchedulePlanMap} 
                />
              ) : (
                <RoutingSchedulingPanel bomData={bomData} />
              )}
            </div>
          </div>
        )}

        {/* TAB 5: 生产任务 */}
        {currentStep === 5 && (
          <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <TaskPanel 
                bomData={bomData} 
                defaultPriority={priority} 
                schedulePlanMap={schedulePlanMap} 
                setSchedulePlanMap={setSchedulePlanMap}
                onUpdateSchedulePlan={handleUpdateSchedulePlan}
                onTaskClick={onTaskClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Global Bottom Actions Bar */}
      <footer className="w-full bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        {/* Left Warning/Status Banner */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {department 
              ? `已指定责任部门：${department}，工单物料配置已就绪` 
              : '提示：请在基础信息中选定责任部门（必填项），确保工单合规下发'}
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 ml-auto">
          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            关闭
          </button>

          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              上一步
            </button>
          )}

          {currentStep < steps.length && (
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              下一步
              <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
          )}
          
          <button 
            onClick={() => {
              setNotificationToast({
                show: true,
                type: 'success',
                message: '已成功暂存当前工单草稿数据！'
              });
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            保存草稿
          </button>

          <button 
            onClick={() => {
              if (!department) {
                setNotificationToast({
                  show: true,
                  type: 'warning',
                  message: '请先在「基础信息」中选择责任部门！'
                });
                setCurrentStep(1);
                return;
              }
              setNotificationToast({
                show: true,
                type: 'success',
                message: '工单已提交审批流，审批通过后将自动下发到车间机台！'
              });
            }}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            提交审批
          </button>
        </div>
      </footer>

      {/* 工单流转二维码打印/预览弹窗 */}
      {showOrderQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">工单流转二维码标识</h3>
              </div>
              <button 
                onClick={() => setShowOrderQrModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="w-64 p-4 rounded-xl border-2 border-slate-800 bg-white shadow-md flex flex-col items-center text-center">
                <div className="text-[11px] font-bold tracking-widest text-slate-800 border-b border-slate-300 w-full pb-1 mb-2">
                  MES 车间生产流转标签
                </div>

                <div className="w-36 h-36 bg-slate-900 p-2.5 rounded-lg flex items-center justify-center relative my-1">
                  <div className="w-full h-full bg-white p-1 rounded flex items-center justify-center">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                </div>

                <div className="w-full mt-2 text-left space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">工单编号:</span>
                    <span className="font-mono font-bold text-slate-800">{orderCode || 'MO-2026-0001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">产品名称:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">{currentlySelectedProduct?.productName || '多轴联动数控机床'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">责任部门:</span>
                    <span className="text-blue-600 font-medium">{department || '机加部'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">计划完工:</span>
                    <span className="font-mono text-slate-600">{planDeliveryDate || '2026-07-15'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setShowOrderQrModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  window.print?.();
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                打印工单标签
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 从销售订单导入弹窗 */}
      <SalesOrderSelectModal
        isOpen={isSoModalOpen}
        onClose={() => setIsSoModalOpen(false)}
        initialOrderNo={selectedSalesOrderNos.join('、')}
        selectedOrderNos={selectedSalesOrderNos}
        filterProductCode={sourceType === '客户订单' && orderDimension === '产品维度' ? selectedProductCode : undefined}
        filterProductName={sourceType === '客户订单' && orderDimension === '产品维度' ? currentProductMeta?.productName : undefined}
        onConfirm={handleConfirmSalesOrderModal}
      />
    </div>
  );
}

