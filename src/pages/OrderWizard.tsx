import React, { useState, useEffect } from 'react';
import { initialBomTree, mockSalesOrders, defaultStockProducts } from '../data';
import type { BomNode, Operation, SchedulePlanItem, SalesOrderProduct } from '../types';
import BomTree from '../components/BomTree';
import RoutingEditor from '../components/RoutingEditor';
import BomCompositionTable from '../components/BomCompositionTable';
import SchedulingPanel from '../components/SchedulingPanel';
import RoutingSchedulingPanel from '../components/RoutingSchedulingPanel';
import TaskPanel from '../components/TaskPanel';
import ProductInfoSection from '../components/ProductInfoSection';
import { Layers, Settings, FileText, ChevronRight, ChevronLeft, Package, Truck, Calendar, Activity, Minus, Plus, ChevronDown, ChevronUp, AlertCircle, Sparkles, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';

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

// Helper to compute common products across selected sales orders
export function computeCommonProducts(orderNos: string[]): SalesOrderProduct[] {
  if (orderNos.length === 0) return [];
  
  const selectedOrders = mockSalesOrders.filter(so => orderNos.includes(so.orderNo));
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

  // Find productCodes that exist in ALL selected sales orders
  const firstOrder = selectedOrders[0];
  const commonProducts: SalesOrderProduct[] = [];

  for (const baseProd of firstOrder.products) {
    const existsInAll = selectedOrders.every(so => 
      so.products.some(p => p.productCode === baseProd.productCode)
    );

    if (existsInAll) {
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
  }
];

// Helper to build order products for product dimension
export function computeProductDimensionProducts(
  productCode: string, 
  bomVersion: string, 
  selectedOrderNos: string[]
): SalesOrderProduct[] {
  const prodMeta = productCatalog.find(p => p.productCode === productCode) || productCatalog[0];

  // Filter sales orders containing this product and matching bomVersion
  const matchingOrders = mockSalesOrders.filter(so => 
    selectedOrderNos.includes(so.orderNo) &&
    so.products.some(p => p.productCode === productCode && (p.bomVersion === bomVersion || !p.bomVersion))
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

  const totalOrderQty = breakdown.reduce((sum, item) => sum + item.orderQuantity, 0) || 100;
  const totalProdQty = breakdown.reduce((sum, item) => sum + item.productionQuantity, 0) || 100;

  return [{
    id: `prod-dim-${productCode}`,
    lineNo: 1,
    productCode: prodMeta.productCode,
    productName: prodMeta.productName,
    category: prodMeta.category,
    specification: prodMeta.specification,
    routingName: prodMeta.routingName,
    bomVersion: bomVersion,
    unit: prodMeta.unit,
    orderQuantity: totalOrderQty,
    productionQuantity: totalProdQty,
    customer: matchingOrders.map(so => so.customer).join('、') || '按销售订单分配',
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
      const saved = localStorage.getItem('mes_bomData');
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
      const saved = localStorage.getItem('mes_schedulePlanMap');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Department state (Auto-detected from product routing, empty if multiple departments)
  const [department, setDepartment] = useState<string>(() => {
    const saved = localStorage.getItem('mes_department');
    if (saved) return saved;
    const initialCommon = computeCommonProducts(['SO-20260601-001']);
    const { autoSelectedDept } = detectProductDepartment(initialCommon[0]);
    return autoSelectedDept;
  });

  const [productInfoExpanded, setProductInfoExpanded] = useState<boolean>(true);

  // Sales order & Products state for Step 1
  const [selectedSalesOrderNos, setSelectedSalesOrderNos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mes_selectedSalesOrderNos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['SO-20260601-001'];
  });

  const [isSoDropdownOpen, setIsSoDropdownOpen] = useState<boolean>(false);
  const [soSearchText, setSoSearchText] = useState<string>('');

  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('mes_customerName') || '华为技术有限公司';
  });

  const [planDeliveryDate, setPlanDeliveryDate] = useState<string>(() => {
    return localStorage.getItem('mes_planDeliveryDate') || '2026-06-30';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('mes_startDate') || '2026-06-10';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('mes_endDate') || '2026-06-28';
  });

  const [orderType, setOrderType] = useState<string>(() => {
    return localStorage.getItem('mes_orderType') || '成品自制';
  });

  const [remarkText, setRemarkText] = useState<string>(() => {
    return localStorage.getItem('mes_remarkText') || '';
  });

  // Current product list loaded into step 1
  const [orderProducts, setOrderProducts] = useState<SalesOrderProduct[]>(() => {
    try {
      const saved = localStorage.getItem('mes_orderProducts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return computeCommonProducts(['SO-20260601-001']);
  });

  // Mandatory selected single product ID
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const saved = localStorage.getItem('mes_selectedProductId');
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
    return localStorage.getItem('mes_activeNodeId') || initialBomTree.id;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem('mes_currentStep');
    return saved ? Number(saved) : 1;
  });

  const [sourceType, setSourceType] = useState<string>(() => {
    return localStorage.getItem('mes_sourceType') || '手工创建';
  });

  const [priority, setPriority] = useState<string>(() => {
    return localStorage.getItem('mes_priority') || '中';
  });

  const [checkedNodes, setCheckedNodes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mes_checkedNodes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [isStep3SidebarOpen, setIsStep3SidebarOpen] = useState(false);
  const [schedulingViewMode, setSchedulingViewMode] = useState<'material' | 'routing'>(() => {
    return (localStorage.getItem('mes_schedulingViewMode') as 'material' | 'routing') || 'material';
  });

  // Dimension state for Customer Orders: '销售订单维度' vs '产品维度'
  const [orderDimension, setOrderDimension] = useState<'销售订单维度' | '产品维度'>(() => {
    return (localStorage.getItem('mes_orderDimension') as '销售订单维度' | '产品维度') || '销售订单维度';
  });

  const [selectedProductCode, setSelectedProductCode] = useState<string>(() => {
    return localStorage.getItem('mes_selectedProductCode') || 'PROD001';
  });

  const [selectedBomVersion, setSelectedBomVersion] = useState<string>(() => {
    return localStorage.getItem('mes_selectedBomVersion') || 'V2.1';
  });

  // Notification Toast for sub-work-order actions and reminders
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
        const selectedOrders = mockSalesOrders.filter(so => nextNos.includes(so.orderNo));
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
        setBomData(prev => ({
          ...prev,
          name: common[0].productName,
          code: common[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      }

      const selectedOrders = mockSalesOrders.filter(so => nextNos.includes(so.orderNo));
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
      const defaultOrders = ['SO-20260601-001'];
      setSelectedSalesOrderNos(defaultOrders);
      const common = computeCommonProducts(defaultOrders);
      setOrderProducts(common);
      if (common.length > 0) {
        setSelectedProductId(common[0].id);
        setBomData(prev => ({
          ...prev,
          name: common[0].productName,
          code: common[0].productCode
        }));
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      }
      const selectedOrders = mockSalesOrders.filter(so => defaultOrders.includes(so.orderNo));
      if (selectedOrders.length > 0) {
        setCustomerName(Array.from(new Set(selectedOrders.map(so => so.customer))).join('、'));
        const deliveryDates = selectedOrders.map(so => so.planDeliveryDate).filter(Boolean).sort();
        if (deliveryDates.length > 0) setPlanDeliveryDate(deliveryDates[0]);
      }
    } else {
      // Product Dimension: find matching orders for selected product and BOM version
      const matchingOrders = mockSalesOrders.filter(so => 
        so.products.some(p => p.productCode === selectedProductCode && (p.bomVersion === selectedBomVersion || !p.bomVersion))
      );
      const matchingNos = matchingOrders.map(so => so.orderNo);
      setSelectedSalesOrderNos(matchingNos);
      const prodList = computeProductDimensionProducts(selectedProductCode, selectedBomVersion, matchingNos);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
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

    const matchingOrders = mockSalesOrders.filter(so => 
      so.products.some(p => p.productCode === newCode && (p.bomVersion === defaultBom || !p.bomVersion))
    );
    const matchingNos = matchingOrders.map(so => so.orderNo);
    setSelectedSalesOrderNos(matchingNos);
    const prodList = computeProductDimensionProducts(newCode, defaultBom, matchingNos);
    setOrderProducts(prodList);
    if (prodList.length > 0) {
      setSelectedProductId(prodList[0].id);
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

    const matchingOrders = mockSalesOrders.filter(so => 
      so.products.some(p => p.productCode === selectedProductCode && (p.bomVersion === newBom || !p.bomVersion))
    );
    const matchingNos = matchingOrders.map(so => so.orderNo);
    setSelectedSalesOrderNos(matchingNos);
    const prodList = computeProductDimensionProducts(selectedProductCode, newBom, matchingNos);
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
      const { autoSelectedDept } = detectProductDepartment(defaultStockProducts[0]);
      setDepartment(autoSelectedDept);
    } else if (newType === '客户订单' && orderDimension === '产品维度') {
      const matchingOrders = mockSalesOrders.filter(so => 
        so.products.some(p => p.productCode === selectedProductCode && (p.bomVersion === selectedBomVersion || !p.bomVersion))
      );
      const matchingNos = matchingOrders.map(so => so.orderNo);
      setSelectedSalesOrderNos(matchingNos);
      const prodList = computeProductDimensionProducts(selectedProductCode, selectedBomVersion, matchingNos);
      setOrderProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
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
      const common = computeCommonProducts(selectedSalesOrderNos);
      setOrderProducts(common);
      if (common.length > 0) {
        setSelectedProductId(common[0].id);
        const { autoSelectedDept } = detectProductDepartment(common[0]);
        setDepartment(autoSelectedDept);
      }
      const selectedOrders = mockSalesOrders.filter(so => selectedSalesOrderNos.includes(so.orderNo));
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
    localStorage.setItem('mes_currentStep', String(currentStep));
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem('mes_sourceType', sourceType);
  }, [sourceType]);

  useEffect(() => {
    localStorage.setItem('mes_priority', priority);
  }, [priority]);

  useEffect(() => {
    localStorage.setItem('mes_activeNodeId', activeNodeId);
  }, [activeNodeId]);

  useEffect(() => {
    localStorage.setItem('mes_schedulingViewMode', schedulingViewMode);
  }, [schedulingViewMode]);

  useEffect(() => {
    localStorage.setItem('mes_checkedNodes', JSON.stringify(Array.from(checkedNodes)));
  }, [checkedNodes]);

  useEffect(() => {
    localStorage.setItem('mes_schedulePlanMap', JSON.stringify(schedulePlanMap));
  }, [schedulePlanMap]);

  useEffect(() => {
    localStorage.setItem('mes_bomData', JSON.stringify(bomData));
  }, [bomData]);

  useEffect(() => {
    localStorage.setItem('mes_selectedSalesOrderNos', JSON.stringify(selectedSalesOrderNos));
  }, [selectedSalesOrderNos]);

  useEffect(() => {
    localStorage.setItem('mes_customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('mes_planDeliveryDate', planDeliveryDate);
  }, [planDeliveryDate]);

  useEffect(() => {
    localStorage.setItem('mes_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('mes_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('mes_orderType', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('mes_remarkText', remarkText);
  }, [remarkText]);

  useEffect(() => {
    localStorage.setItem('mes_orderProducts', JSON.stringify(orderProducts));
  }, [orderProducts]);

  useEffect(() => {
    localStorage.setItem('mes_selectedProductId', selectedProductId);
  }, [selectedProductId]);

  useEffect(() => {
    localStorage.setItem('mes_department', department);
  }, [department]);

  useEffect(() => {
    localStorage.setItem('mes_orderDimension', orderDimension);
  }, [orderDimension]);

  useEffect(() => {
    localStorage.setItem('mes_selectedProductCode', selectedProductCode);
  }, [selectedProductCode]);

  useEffect(() => {
    localStorage.setItem('mes_selectedBomVersion', selectedBomVersion);
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
        return ['orderCode', 'sourceType', 'salesOrder', 'customer', 'planDeliveryDate', 'priority', 'department', 'orderType', 'salesOrderLine', 'dateRange'];
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
            'customer', 
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
          'customer', 
          'planDeliveryDate', 
          'priority', 
          'department', 
          'orderType', 
          'dateRange'
        ];
      case '库存备货':
        return ['orderCode', 'sourceType', 'priority', 'planDeliveryDate', 'department', 'orderType', 'dateRange'];
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
          <div key={fieldName} className="flex items-start gap-4 col-span-1 md:col-span-2 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-3 rounded-lg border border-blue-100/80">
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

      case 'productSelect':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>选择产品</Label>
            <div className="flex-1">
              <select 
                value={selectedProductCode}
                onChange={(e) => handleProductDimensionProductChange(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_10px_center] bg-no-repeat cursor-pointer transition-colors text-slate-800 font-medium"
              >
                {productCatalog.map(p => (
                  <option key={p.productCode} value={p.productCode}>
                    {p.productName} ({p.productCode}) - [{p.category}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

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
              <input type="text" value="MO202606090001" disabled className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-500 outline-none" />
              <div className="flex items-center gap-2 shrink-0 cursor-pointer">
                 <div className="w-9 h-5 bg-[#1677ff] rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div></div>
                 <span className="text-[13px] text-[#1677ff] whitespace-nowrap">自动生成</span>
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
        const isProductDim = sourceType === '客户订单' && orderDimension === '产品维度';
        const eligibleOrders = isProductDim 
          ? mockSalesOrders.filter(so => 
              so.products.some(p => p.productCode === selectedProductCode && (p.bomVersion === selectedBomVersion || !p.bomVersion))
            )
          : mockSalesOrders;

        const filteredOrders = eligibleOrders.filter(so => 
          so.orderNo.toLowerCase().includes(soSearchText.toLowerCase()) || 
          so.customer.toLowerCase().includes(soSearchText.toLowerCase())
        );

        return (
          <div key={fieldName} className="flex items-start gap-4 relative z-30">
            <Label>销售订单</Label>
            <div className="flex-1 relative">
              {/* Trigger Input Area */}
              <div 
                onClick={() => setIsSoDropdownOpen(!isSoDropdownOpen)}
                className={cn(
                  "w-full min-h-[36px] p-1 bg-white border rounded-lg text-xs flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors shadow-2xs",
                  isSoDropdownOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                )}
              >
                {selectedSalesOrderNos.length === 0 ? (
                  <span className="text-slate-400 px-2 py-1">
                    {isProductDim ? `点击选择匹配「${currentProductMeta.productName} (${selectedBomVersion})」的销售订单...` : "点击选择销售订单 (可多选)..."}
                  </span>
                ) : (
                  selectedSalesOrderNos.map(no => {
                    const soObj = mockSalesOrders.find(s => s.orderNo === no);
                    return (
                      <span 
                        key={no} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]"
                      >
                        <span className="font-mono font-bold">{no}</span>
                        {soObj && <span className="text-blue-500/80 text-[10px]">({soObj.customer})</span>}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSalesOrder(no);
                          }}
                          className="text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded p-0.5 transition-colors cursor-pointer ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
                
                <div className="ml-auto flex items-center gap-1 shrink-0 px-1 text-slate-400">
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-150", isSoDropdownOpen && "rotate-180")} />
                </div>
              </div>

              {/* Dropdown Menu */}
              {isSoDropdownOpen && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isProductDim && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-xs text-indigo-900 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        已过滤仅展示包含 <strong>{currentProductMeta.productName}</strong> 且 BOM为 <strong>{selectedBomVersion}</strong> 的订单
                      </span>
                      <span className="text-indigo-600 font-bold bg-white px-2 py-0.5 rounded text-[11px] shadow-2xs">
                        共 {eligibleOrders.length} 个匹配
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                    <input 
                      type="text"
                      placeholder="搜索订单号或客户名称..."
                      value={soSearchText}
                      onChange={(e) => setSoSearchText(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                    />
                    {selectedSalesOrderNos.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedSalesOrderNos([]);
                          setOrderProducts([]);
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-500 whitespace-nowrap px-2 font-medium cursor-pointer"
                      >
                        清空
                      </button>
                    )}
                  </div>

                  {/* Orders Checkbox List */}
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                    {filteredOrders.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        暂无符合条件的销售订单
                      </div>
                    ) : (
                      filteredOrders.map(so => {
                        const isChecked = selectedSalesOrderNos.includes(so.orderNo);
                        const matchingProdItem = isProductDim 
                          ? so.products.find(p => p.productCode === selectedProductCode) 
                          : null;

                        return (
                          <div
                            key={so.orderNo}
                            onClick={() => handleToggleSalesOrder(so.orderNo)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none border",
                              isChecked ? "bg-blue-50/70 border-blue-200 text-blue-900 font-medium" : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} 
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <div>
                                <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>{so.orderNo}</span>
                                  <span className="font-sans text-[11px] font-normal text-slate-500">({so.customer})</span>
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {isProductDim && matchingProdItem ? (
                                    <span className="text-blue-600 font-medium">
                                      订购 {matchingProdItem.productName} ({matchingProdItem.orderQuantity} {matchingProdItem.unit}) | BOM: {matchingProdItem.bomVersion || 'V2.1'}
                                    </span>
                                  ) : (
                                    <span>包含 {so.products.length} 项产品: {so.products.map(p => p.productName).join('、')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isChecked && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Bar */}
                  <div className="pt-2 border-t border-slate-100 px-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {isProductDim 
                        ? '提示: 勾选订单将把各订单的此产品需求量累加合并排产' 
                        : '提示: 勾选多个订单将自动筛选重组其共有的产品'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setIsSoDropdownOpen(false)}
                      className="text-[#1677ff] font-bold hover:underline px-2 cursor-pointer"
                    >
                      确认关闭
                    </button>
                  </div>
                </div>
              )}

              {/* Live status notification below input */}
              {selectedSalesOrderNos.length === 0 && (
                <div className="mt-1 text-[11px] text-amber-600">
                  ⚠️ 请至少勾选 1 个销售订单。
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'customer':
        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>客户</Label>
            <div className="flex-1">
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="请输入客户" 
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-blue-400 transition-colors" 
              />
            </div>
          </div>
        );
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
        let displayVal = '选择产品后自动关联';
        if (sourceType === '库存备货') {
          displayVal = '无 (库存备货)';
        } else if (currentlySelectedProduct) {
          if (currentlySelectedProduct.orderBreakdown && currentlySelectedProduct.orderBreakdown.length > 0) {
            displayVal = currentlySelectedProduct.orderBreakdown
              .map(bd => `${bd.orderNo}-${bd.lineNo || currentlySelectedProduct.lineNo || 1}`)
              .join(', ');
          } else if (selectedSalesOrderNos.length > 0) {
            displayVal = selectedSalesOrderNos
              .map(no => `${no}-${currentlySelectedProduct.lineNo || 1}`)
              .join(', ');
          } else {
            displayVal = `无订单关联-${currentlySelectedProduct.lineNo || 1}`;
          }
        }

        return (
          <div key={fieldName} className="flex items-start gap-4">
            <Label>销售订单项次</Label>
            <div className="flex-1">
              <input 
                type="text" 
                disabled 
                value={displayVal} 
                title={displayVal}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded text-[13px] text-slate-700 font-mono font-medium outline-none truncate" 
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
        return (
          <div key={fieldName} className="flex flex-col items-center">
            <span className="text-[13px] text-slate-600 mb-2">产品图纸</span>
            <div className="w-40 h-40 border-[1.5px] border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-[#1677ff] hover:bg-blue-50/50 transition-colors cursor-pointer bg-slate-50/50 group">
              <span className="text-2xl font-light leading-none mb-1 group-hover:scale-110 transition-transform">+</span>
              <span className="text-xs">请上传产品图纸</span>
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
    <div className="h-full w-full overflow-hidden bg-[#f0f2f5] flex flex-col font-sans text-slate-900">
      {/* Header Breadcrumb */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between text-sm shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#1677ff] rounded-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">生产管理</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">工单管理</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#1677ff] font-bold tracking-tight">编辑生产工单</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden w-full flex flex-col bg-[#f0f2f5] relative">
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

        <div className="flex-1 min-h-0 overflow-hidden max-w-[1280px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
          
          {/* Stepper Wizard */}
          <div className="px-8 py-5 bg-white rounded-xl shadow-sm flex items-center shrink-0">
            <div className="flex items-center w-full max-w-4xl mx-auto">
              {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStep === stepNum;
                const isPast = currentStep > stepNum;
                return (
                  <React.Fragment key={step}>
                    <div
                      className={cn("flex flex-col md:flex-row items-center gap-2 md:gap-3 cursor-pointer transition-all", isActive || isPast ? "opacity-100" : "opacity-60")}
                      onClick={() => setCurrentStep(stepNum)}
                    >
                      <div className={cn(
                        "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                        isActive ? "bg-[#1677ff] text-white shadow-md ring-4 ring-blue-50" : (isPast ? "bg-[#1677ff] text-white" : "bg-slate-100 text-slate-400 border border-slate-200")
                      )}>
                        {stepNum}
                      </div>
                      <span className={cn(
                        "text-xs md:text-sm font-bold transition-colors whitespace-nowrap",
                        isActive ? "text-[#1677ff]" : (isPast ? "text-slate-800" : "text-slate-500")
                      )}>
                        {step}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="flex-1 px-4 md:px-8">
                         <div className={cn(
                           "h-[2px] w-full rounded-full transition-colors",
                           isPast ? "bg-[#1677ff]" : "bg-slate-100"
                         )}></div>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Step Content View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {currentStep === 1 && (
              <div className="p-8 flex flex-col gap-6 flex-1 overflow-auto bg-[#f0f2f5] min-h-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-4 bg-[#1677ff] rounded-sm"></div>
                       <h2 className="text-base font-bold text-slate-800">基础信息</h2>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 overflow-auto">
                   <div className="flex flex-col lg:flex-row gap-8">
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                       {getFieldsConfig().map(renderField)}
                     </div>
                     <div className="w-full lg:w-[160px] flex flex-col shrink-0 pt-1">
                       {renderField('drawing')}
                     </div>
                   </div>
                   
                   {renderField('PRODUCT_INFO')}
                   
                   <div className="mt-4">
                     {renderField('remark')}
                   </div>
                 </div>
              </div>
            )}

            {currentStep === 2 && (
               <div className="flex-1 flex overflow-hidden w-full h-full min-h-0">
                  <BomCompositionTable 
                    defaultBomVersion={currentlySelectedProduct?.bomVersion || 'V2.1'}
                    productName={currentlySelectedProduct?.productName}
                    productCode={currentlySelectedProduct?.productCode}
                  />
               </div>
            )}

            {currentStep === 3 && (
              <div className="flex w-full h-full min-h-0 relative">
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
                         <div className="p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-lg flex items-start gap-2 text-xs text-amber-900 shadow-2xs">
                           <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                           <div className="flex flex-col gap-0.5 leading-snug flex-1">
                             <div className="flex items-center justify-between">
                               <span className="font-bold text-amber-950 text-[11px]">排产提醒</span>
                               {checkedNodes.size > 0 ? (
                                 <span className="text-[10px] bg-amber-200/80 text-amber-950 px-1.5 py-0.5 rounded font-semibold">
                                   已选 {checkedNodes.size} 项物料
                                 </span>
                               ) : (
                                 <span className="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">未勾选</span>
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
                             className="text-[11px] text-slate-600 hover:text-blue-600 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded transition-colors whitespace-nowrap cursor-pointer"
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
            )}

            {currentStep === 4 && (
              <div className="flex flex-col h-full overflow-hidden w-full">
                  <div className="flex-1 min-h-0 relative flex overflow-hidden">
                     {schedulingViewMode === 'material' ? (
                        <SchedulingPanel bomData={bomData} schedulePlanMap={schedulePlanMap} onUpdateSchedulePlan={handleUpdateSchedulePlan} setSchedulePlanMap={setSchedulePlanMap} />
                     ) : (
                        <RoutingSchedulingPanel bomData={bomData} />
                     )}
                  </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="h-full w-full overflow-hidden flex flex-col">
                 <TaskPanel 
                   bomData={bomData} 
                   defaultPriority={priority} 
                   schedulePlanMap={schedulePlanMap} 
                   setSchedulePlanMap={setSchedulePlanMap}
                   onUpdateSchedulePlan={handleUpdateSchedulePlan}
                   onTaskClick={onTaskClick}
                 />
              </div>
            )}
          </div>
        </div>

        {/* Global Actions Bar at the bottom */}
        <div className="w-full bg-white border-t border-slate-200 px-6 py-2.5 flex justify-end items-center gap-3 shrink-0 z-20 shadow-[0_-4px_6px_-2px_rgb(0,0,0,0.02)]">
           <button onClick={onBack} className="px-5 py-1.5 text-[13px] text-slate-600 hover:text-slate-800 transition-colors">
             取消
           </button>
           {currentStep > 1 && (
             <button 
               onClick={() => setCurrentStep(prev => prev - 1)}
               className="px-5 py-1.5 text-[13px] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded shadow-sm transition-colors"
             >
               上一步
             </button>
           )}
           {currentStep < steps.length && (
             <button 
               onClick={() => {
                 if (currentStep === 1 && !department) {
                   setNotificationToast({
                     show: true,
                     type: 'warning',
                     message: '请选择「所属部门」（单选必填）！'
                   });
                   return;
                 }
                 setCurrentStep(prev => prev + 1);
               }}
               className="px-5 py-1.5 text-[13px] text-[#1677ff] bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded shadow-sm transition-colors cursor-pointer"
             >
               下一步
             </button>
           )}
           <button className="px-5 py-1.5 text-[13px] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded shadow-sm transition-colors">
             保存草稿
           </button>
           {currentStep === 5 ? (
             <button className="px-6 py-1.5 text-[13px] font-medium text-white bg-[#1677ff] hover:bg-blue-600 rounded shadow-sm transition-colors">
               下发任务
             </button>
           ) : currentStep < 4 ? (
             <button className="px-6 py-1.5 text-[13px] font-medium text-white bg-[#1677ff] hover:bg-blue-600 rounded shadow-sm transition-colors">
               提交审批
             </button>
           ) : null}
        </div>
      </main>
    </div>
  );
}

