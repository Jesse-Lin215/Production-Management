export type OutsourcingStatus = '草稿' | '待审核' | '审批驳回' | '进行中' | '待入库' | '已完成' | '已作废';
export type OutsourcingPriority = '低' | '中' | '高' | '紧急';
export type OutsourcingType = '工序外协' | '整单外协';
export type OutsourcingMethod = '包工包料' | '包工不包料';

export type ApplicationStatus = '草稿' | '待审核' | '进行中' | '审批驳回' | '已完成' | '已取消';

export interface ApplicationMaterialRow {
  id: string;
  selected?: boolean;
  source: string;
  lineNo?: string;
  productCode?: string;
  productName?: string;
  productCategory?: string;
  productSpec?: string;
  bomVersion?: string;
  materialCode: string;
  materialName: string;
  materialCategory?: string;
  specification: string;
  unit: string;
  priority?: string;
  currentStock: number;
  requestQty: number;
  remark: string;
}

export interface OutsourcingApplicationItem {
  id: string;
  applicationNo: string;
  applyDate: string;
  totalQty: number;
  convertedQty: number;
  contactPerson: string;
  requiredDate: string;
  remark: string;
  companyName: string;
  status: ApplicationStatus;
  applicant: string;
  priority?: string;
  outsourcingType: OutsourcingType;
  outsourcingMethod: OutsourcingMethod;
  processRoute?: string;
  processes?: string[];
  materials: ApplicationMaterialRow[];
}

export interface OutsourcingMaterialItem {
  id: string;
  seq: number;
  selected?: boolean;
  source?: string;
  lineNo?: string;
  salesOrder?: string;
  salesOrderLine?: string;
  productCode?: string;
  productName?: string;
  productCategory?: string;
  productSpec?: string;
  category: string;
  materialCategory?: string;
  materialCode: string;
  materialName: string;
  bomVersion?: string;
  specification: string;
  unit: string;
  currentStock?: number;
  standardUsage?: number | string;
  standardCost?: number | string;
  plannedQty: number;
  taxIncludedUnitPrice?: number | string;
  taxRate?: string;
  remark: string;
}

export interface OutsourcingProgressRecord {
  id: string;
  submitTime: string;
  reportMethod: string;
  currentReport: string;
  beforeSubmit: string;
  afterSubmit: string;
  submitter: string;
  remark: string;
}

export interface OutsourcingReceiptRecord {
  id: string;
  receiptNo: string;
  receiptDate: string;
  warehouse: string;
  validQty: number;
  status: string;
  operator: string;
}

export interface OutsourcingOrderItem {
  id: string;
  orderNo: string;
  outsourcingAppNo?: string;
  moNo: string;
  productCode: string;
  productName: string;
  bomVersion: string;
  specification: string;
  processRoute?: string;
  processes?: string[];
  processName: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string;
  contactPhone: string;
  outsourcingType: OutsourcingType;
  outsourcingMethod: OutsourcingMethod;
  priority?: OutsourcingPriority;
  productionProgress: number;
  receiptProgress: number;
  validReceiptQty: number;
  plannedQty: number;
  unit: string;
  requiredDate?: string;
  plannedStartDate: string;
  plannedDeliveryDate: string;
  salesOrder: string;
  salesOrderLine?: string;
  companyName?: string;
  taxIncludedAmount: number;
  pricingMethod: string;
  taxType: string;
  taxRate?: number;
  feeDescription: string;
  creator: string;
  createTime: string;
  status: OutsourcingStatus;
  remark: string;
  materials: OutsourcingMaterialItem[];
  securityLink: {
    url: string;
    active: boolean;
    reportMethod: string;
    createTime: string;
    lastVisit: string;
  };
  progressRecords: OutsourcingProgressRecord[];
  receiptRecords: OutsourcingReceiptRecord[];
}

export const SUPPLIER_OPTIONS = [
  { code: 'SU-00006', name: '东莞市安可精密机械有限公司', contact: '陈玉顺', phone: '18681131030', taxRate: 13, taxType: '增值税专用发票 13%' },
  { code: 'SU-00008', name: '昆山华辰精密钣金制造厂', contact: '张建平', phone: '13812658800', taxRate: 13, taxType: '增值税专用发票 13%' },
  { code: 'SU-00012', name: '苏州工业园区精工表面处理厂', contact: '王建国', phone: '13915568890', taxRate: 13, taxType: '增值税专用发票 13%' },
  { code: 'SU-00015', name: '深圳宏达数控外协加工中心', contact: '李志强', phone: '13528894412', taxRate: 3, taxType: '增值税普通发票 3%' },
];

export const PRODUCT_OPTIONS = [
  { code: '02-00DX-02161', name: '欧标插头线', category: '标准件', spec: 'HY-LD250', unit: 'PCS', bomVersions: ['V1.0', 'V1.1'] },
  { code: '02-00KG-02165', name: '普通急停按钮', category: '标准件', spec: 'B0409-M606-D11', unit: 'PCS', bomVersions: ['V1.0'] },
  { code: 'CG-02167', name: '换边机', category: '成套设备', spec: 'B0393-M007-D11', unit: '台', bomVersions: ['V1.0', 'V2.0'] },
  { code: '05-00240', name: '0.5米双轨接驳台 2台', category: '钣金件', spec: 'B0392-M007-D11', unit: '台', bomVersions: ['V1.0', 'V1.2'] },
  { code: '02-00108', name: '伺服电机', category: '标准件', spec: 'B0376-M007-D11', unit: '台', bomVersions: ['V1.0'] },
  { code: '08-00315', name: '换边机 (PRO)', category: '成套设备', spec: 'B0344-M007-D11', unit: '台', bomVersions: ['V1.0', 'V2.0'] },
  { code: '09-00412', name: '设备配件44', category: '机加件', spec: 'B0342-M007-D11', unit: '件', bomVersions: ['V1.0'] },
  { code: 'CG-00002', name: '2米移栽机', category: '成套设备', spec: 'B0341-M007-D11', unit: '台', bomVersions: ['V1.0', 'V1.1'] },
  { code: 'A-00004', name: '自动送板机 (Loader)', category: '自动化装备', spec: 'B0340-M007-D11', unit: '台', bomVersions: ['V1.0', 'V1.1'] },
  { code: 'GW-5G-08', name: '5G工业智能网关', category: '通信设备', spec: 'B0339-M007-D11', unit: '台', bomVersions: ['V1.5', 'V1.0'] },
];

export const OUTSOURCING_PROCESS_OPTIONS = [
  '表面阳极氧化',
  '激光切割外协',
  '钣金折弯外协',
  '精密线割',
  '热处理淬火',
  '表面喷涂',
  'CNC粗加工',
  '五轴精雕',
  '整机机架焊接外协',
];

export const PROCESS_ROUTE_OPTIONS = [
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

export const PRODUCTION_ORDER_OPTIONS = [
  {
    moNo: 'MO202610280001',
    productCode: '08-00315',
    productName: '换边机 (PRO)',
    bomVersion: 'V1.0',
    specification: 'B0344-M007-D11',
    salesOrder: 'HY-26C-081',
    plannedQty: 10,
    processes: ['表面阳极氧化', '激光切割外协', '钣金折弯外协'],
  },
  {
    moNo: 'MO202610260002',
    productCode: 'CG-00002',
    productName: '2米移栽机',
    bomVersion: 'V1.0',
    specification: 'B0341-M007-D11',
    salesOrder: 'HY-26C-079',
    plannedQty: 6,
    processes: ['整机机架焊接外协', '表面喷涂'],
  },
  {
    moNo: 'MO202610250003',
    productCode: 'A-00004',
    productName: '自动送板机 (Loader)',
    bomVersion: 'V1.1',
    specification: 'B0340-M007-D11',
    salesOrder: 'HY-26C-076',
    plannedQty: 8,
    processes: ['CNC粗加工', '五轴精雕', '表面阳极氧化'],
  },
  {
    moNo: 'MO202610220004',
    productCode: '09-00412',
    productName: '设备配件44',
    bomVersion: 'V1.0',
    specification: 'B0342-M007-D11',
    salesOrder: 'HY-26C-072',
    plannedQty: 20,
    processes: ['精密线割', '热处理淬火'],
  },
];

// 重新制造的外协申请单初始数据
const INITIAL_OUTSOURCING_APPLICATIONS: OutsourcingApplicationItem[] = [
  {
    id: 'app-2026-01',
    applicationNo: 'HYCG-202610280001',
    applyDate: '2026-10-28',
    totalQty: 18,
    convertedQty: 6,
    contactPerson: '张工',
    requiredDate: '2026-11-08',
    remark: '换边机PRO精密机加及表面阳极氧化外协，需保证同轴度公差',
    companyName: '智简工厂测试租户',
    status: '进行中',
    applicant: '张工',
    priority: '紧急',
    outsourcingMethod: '包工包料',
    outsourcingType: '工序外协',
    processRoute: '换边机核心部件外协工艺路线',
    processes: ['CNC粗加工', '表面阳极氧化', '表面喷涂'],
    materials: [
      {
        id: 'app-m-101',
        source: 'HY-26C-081',
        lineNo: '3',
        productCode: '08-00315',
        productName: '换边机',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        bomVersion: 'V2.0',
        materialCode: '08-00315-01',
        materialName: '换边机主传动铝合金机架',
        materialCategory: '机加件',
        specification: 'B0409-M606-D11',
        unit: '件',
        priority: '紧急',
        currentStock: 4,
        requestQty: 8,
        remark: '阳极本色处理'
      },
      {
        id: 'app-m-102',
        source: 'HY-26C-080',
        lineNo: '1',
        productCode: '05-00240',
        productName: '0.5米双轨接驳台 2台',
        productCategory: '成套设备',
        productSpec: 'B0392-M007-D11',
        bomVersion: 'V1.2',
        materialCode: '05-00240-01',
        materialName: '0.5米双轨接驳台 2台导轨支撑座',
        materialCategory: '机加件',
        specification: 'B0393-M007-D11',
        unit: '件',
        priority: '紧急',
        currentStock: 2,
        requestQty: 4,
        remark: '基准面研磨'
      },
      {
        id: 'app-m-103',
        source: 'HY-26C-080',
        lineNo: '2',
        productCode: '08-00315',
        productName: '双轨同步滑台组件',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        bomVersion: 'V2.0',
        materialCode: '08-00315-02',
        materialName: '双轨同步滑台底板',
        materialCategory: '机加件',
        specification: 'B0393-M007-D11',
        unit: '件',
        priority: '紧急',
        currentStock: 2,
        requestQty: 6,
        remark: '五轴精铣'
      }
    ]
  },
  {
    id: 'app-2026-02',
    applicationNo: 'HYCG-202610280002',
    applyDate: '2026-10-28',
    totalQty: 10,
    convertedQty: 2,
    contactPerson: '李主管',
    requiredDate: '2026-11-12',
    remark: '0.5米双轨接驳台及送板机整机委外定制，含全套钣金及电控装配',
    companyName: '华东精密智造分厂',
    status: '进行中',
    applicant: '李主管',
    priority: '高',
    outsourcingMethod: '包工包料',
    outsourcingType: '整单外协',
    materials: [
      {
        id: 'app-m-201',
        source: 'HY-26C-080',
        lineNo: '1',
        productCode: '05-00240',
        productName: '0.5米双轨接驳台 2台',
        productCategory: '成套设备',
        productSpec: 'B0392-M007-D11',
        bomVersion: 'V1.2',
        materialCode: '05-00240',
        materialName: '0.5米双轨接驳台整机组件',
        materialCategory: '结构件',
        specification: 'B0392-M007-D11',
        unit: '台',
        priority: '高',
        currentStock: 1,
        requestQty: 6,
        remark: '按V1.2版BOM整单交付'
      },
      {
        id: 'app-m-202',
        source: 'HY-26C-079',
        lineNo: '1',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        bomVersion: 'V1.1',
        materialCode: 'A-00004',
        materialName: '自动送板机 (Loader) 整机',
        materialCategory: '自动化装备',
        specification: 'B0376-M007-D11',
        unit: '台',
        priority: '高',
        currentStock: 0,
        requestQty: 4,
        remark: '整机组装调试'
      }
    ]
  },
  {
    id: 'app-2026-03',
    applicationNo: 'HYCG-202610270003',
    applyDate: '2026-10-27',
    totalQty: 15,
    convertedQty: 0,
    contactPerson: '张工',
    requiredDate: '2026-11-10',
    remark: '自动送板机钣金外罩激光切割与折弯喷涂',
    companyName: '智简工厂测试租户',
    status: '待审核',
    applicant: '张工',
    priority: '高',
    outsourcingMethod: '包工不包料',
    outsourcingType: '工序外协',
    processRoute: '钣金成型与喷涂外协工艺路线',
    processes: ['激光切割外协', '钣金折弯外协', '表面喷涂'],
    materials: [
      {
        id: 'app-m-301',
        source: 'HY-26C-079',
        lineNo: '1',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        bomVersion: 'V1.1',
        materialCode: 'A-00004-01',
        materialName: '自动送板机上护罩总成',
        materialCategory: '钣金件',
        specification: 'B0344-M007-D11',
        unit: '件',
        priority: '高',
        currentStock: 5,
        requestQty: 10,
        remark: 'RAL7035橘纹灰喷塑'
      },
      {
        id: 'app-m-302',
        source: 'HY-26C-079',
        lineNo: '3',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        bomVersion: 'V1.1',
        materialCode: 'A-00004-02',
        materialName: '电控箱侧门折弯件',
        materialCategory: '钣金件',
        specification: 'B0342-M007-D11',
        unit: '件',
        priority: '高',
        currentStock: 3,
        requestQty: 5,
        remark: '含接地柱焊接'
      }
    ]
  },
  {
    id: 'app-2026-04',
    applicationNo: 'HYCG-202610260004',
    applyDate: '2026-10-26',
    totalQty: 5,
    convertedQty: 0,
    contactPerson: '李主管',
    requiredDate: '2026-11-05',
    remark: '2米移栽机底座焊接与退火喷涂工序委外（需补充探伤要求后重提）',
    companyName: '深圳总装制造中心',
    status: '审批驳回',
    applicant: '李主管',
    priority: '高',
    outsourcingMethod: '包工不包料',
    outsourcingType: '工序外协',
    processRoute: '钣金成型与喷涂外协工艺路线',
    processes: ['整机机架焊接外协', '表面喷涂'],
    materials: [
      {
        id: 'app-m-401',
        source: 'HY-26C-076',
        lineNo: '1',
        productCode: 'CG-00002',
        productName: '2米移栽机',
        productCategory: '成套设备',
        productSpec: 'B0341-M007-D11',
        bomVersion: 'V1.0',
        materialCode: 'CG-00002-01',
        materialName: '2米移栽机重型方管底座',
        materialCategory: '结构件',
        specification: 'B0340-M007-D11',
        unit: '台',
        priority: '高',
        currentStock: 0,
        requestQty: 5,
        remark: '满焊探伤并做防锈底漆'
      }
    ]
  },
  {
    id: 'app-2026-05',
    applicationNo: 'HYCG-202610250005',
    applyDate: '2026-10-25',
    totalQty: 20,
    convertedQty: 0,
    contactPerson: '测试',
    requiredDate: '2026-11-15',
    remark: '精密模具镶件慢走丝线割及真空热处理淬火',
    companyName: '智简工厂测试租户',
    status: '草稿',
    applicant: '测试',
    priority: '中',
    outsourcingMethod: '包工包料',
    outsourcingType: '工序外协',
    processRoute: '标准机加及表面处理工艺路线',
    processes: ['CNC粗加工', '精密线割', '热处理淬火'],
    materials: [
      {
        id: 'app-m-501',
        source: 'HY-26C-072',
        lineNo: '2',
        productCode: '09-00412',
        productName: '设备配件44',
        productCategory: '标准件',
        productSpec: 'B0339-M007-D11',
        bomVersion: 'V1.0',
        materialCode: '09-00412-01',
        materialName: '定位导柱高硬耐磨衬套',
        materialCategory: '机加件',
        specification: 'B0331-M606-D11',
        unit: '件',
        priority: '中',
        currentStock: 10,
        requestQty: 20,
        remark: '热处理硬度HRC58-60'
      }
    ]
  },
  {
    id: 'app-2026-06',
    applicationNo: 'HYCG-202610230006',
    applyDate: '2026-10-23',
    totalQty: 10,
    convertedQty: 0,
    contactPerson: '张工',
    requiredDate: '2026-11-18',
    remark: '5G工业智能网关整机OEM贴片及三防漆涂覆外协',
    companyName: '华东精密智造分厂',
    status: '草稿',
    applicant: '张工',
    priority: '中',
    outsourcingMethod: '包工包料',
    outsourcingType: '整单外协',
    materials: [
      {
        id: 'app-m-601',
        source: 'HY-26C-068',
        lineNo: '1',
        productCode: 'GW-5G-08',
        productName: '5G工业智能网关',
        productCategory: '通信设备',
        productSpec: 'B0331-M007-D11',
        bomVersion: 'V1.5',
        materialCode: 'GW-5G-08',
        materialName: '5G工业智能网关整机',
        materialCategory: '成套设备',
        specification: 'B0331-M007-D11',
        unit: '台',
        priority: '中',
        currentStock: 3,
        requestQty: 10,
        remark: '附带老化测试报告'
      }
    ]
  },
  {
    id: 'app-2026-07',
    applicationNo: 'HYCG-202610180007',
    applyDate: '2026-10-18',
    totalQty: 4,
    convertedQty: 4,
    contactPerson: '李主管',
    requiredDate: '2026-10-26',
    remark: '换边机标准机架批次整单委外已全部验收入库',
    companyName: '智简工厂测试租户',
    status: '已完成',
    applicant: '李主管',
    priority: '高',
    outsourcingMethod: '包工包料',
    outsourcingType: '整单外协',
    materials: [
      {
        id: 'app-m-701',
        source: 'HY-26C-055',
        lineNo: '1',
        productCode: 'CG-02167',
        productName: '换边机',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        bomVersion: 'V1.0',
        materialCode: 'CG-02167',
        materialName: '换边机标准版整机',
        materialCategory: '成套设备',
        specification: 'HY-LD250',
        unit: '台',
        priority: '高',
        currentStock: 4,
        requestQty: 4,
        remark: '全检合格入库'
      }
    ]
  },
  {
    id: 'app-2026-08',
    applicationNo: 'HYCG-202610150008',
    applyDate: '2026-10-15',
    totalQty: 30,
    convertedQty: 0,
    contactPerson: '测试',
    requiredDate: '2026-10-25',
    remark: '因客户订单变更取消该批次线束外协请购',
    companyName: '深圳总装制造中心',
    status: '已取消',
    applicant: '测试',
    priority: '低',
    outsourcingMethod: '包工不包料',
    outsourcingType: '工序外协',
    processRoute: '标准机加及表面处理工艺路线',
    processes: ['表面阳极氧化'],
    materials: [
      {
        id: 'app-m-801',
        source: 'HY-26C-049',
        lineNo: '4',
        productCode: '02-00DX-02161',
        productName: '欧标插头线',
        productCategory: '标准件',
        productSpec: 'B0409-M606-D11',
        bomVersion: 'V1.0',
        materialCode: '02-00DX-02161-01',
        materialName: '欧标插头线铝合金端子壳',
        materialCategory: '标准件',
        specification: 'B0409-M606-D11',
        unit: 'PCS',
        priority: '低',
        currentStock: 50,
        requestQty: 30,
        remark: '客户变更已取消'
      }
    ]
  }
];

// 重新制造的外协工单初始数据
const INITIAL_OUTSOURCING_ORDERS: OutsourcingOrderItem[] = [
  {
    id: 'wx-2026-01',
    orderNo: 'WXGD-202610280001',
    outsourcingAppNo: 'HYCG-202610280001',
    moNo: 'MO202610280001',
    productCode: '08-00315',
    productName: '换边机 (PRO)',
    bomVersion: 'V2.0',
    specification: 'B0409-M606-D11',
    processRoute: '换边机核心部件外协工艺路线',
    processes: ['CNC粗加工', '表面阳极氧化', '表面喷涂'],
    processName: 'CNC粗加工、表面阳极氧化、表面喷涂',
    supplierCode: 'SU-00006',
    supplierName: '东莞市安可精密机械有限公司',
    contactPerson: '陈玉顺',
    contactPhone: '18681131030',
    outsourcingType: '工序外协',
    outsourcingMethod: '包工包料',
    priority: '紧急',
    productionProgress: 65,
    receiptProgress: 25,
    validReceiptQty: 3,
    plannedQty: 12,
    unit: '件',
    requiredDate: '2026-11-08',
    plannedStartDate: '2026-10-28',
    plannedDeliveryDate: '2026-11-06',
    salesOrder: 'HY-26C-081',
    salesOrderLine: '1、2',
    companyName: '智简工厂测试租户',
    taxIncludedAmount: 4560,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '包含五轴CNC基准加工、本色阳极氧化及局部防护喷涂费用',
    creator: '张工',
    createTime: '2026-10-28 09:15:20',
    status: '进行中',
    remark: '首批3件已完成交检，剩余9件正在阳极氧化产线处理',
    materials: [
      {
        id: 'wx-m-101',
        seq: 1,
        source: 'HY-26C-081',
        lineNo: '3',
        salesOrder: 'HY-26C-081',
        salesOrderLine: '3',
        productCode: '08-00315',
        productName: '换边机',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        category: '机加件',
        materialCategory: '机加件',
        materialCode: '08-00315-01',
        materialName: '换边机主传动铝合金机架',
        bomVersion: 'V2.0',
        specification: 'B0409-M606-D11',
        unit: '件',
        currentStock: 4,
        standardUsage: 1,
        standardCost: '320.00',
        plannedQty: 6,
        taxIncludedUnitPrice: '400.00',
        taxRate: '13.00%',
        remark: '阳极本色处理'
      },
      {
        id: 'wx-m-102',
        seq: 2,
        source: 'HY-26C-080',
        lineNo: '1',
        salesOrder: 'HY-26C-080',
        salesOrderLine: '1',
        productCode: '05-00240',
        productName: '0.5米双轨接驳台 2台',
        productCategory: '成套设备',
        productSpec: 'B0392-M007-D11',
        category: '机加件',
        materialCategory: '机加件',
        materialCode: '05-00240-01',
        materialName: '0.5米双轨接驳台 2台导轨支撑座',
        bomVersion: 'V1.2',
        specification: 'B0393-M007-D11',
        unit: '件',
        currentStock: 2,
        standardUsage: 1,
        standardCost: '280.00',
        plannedQty: 3,
        taxIncludedUnitPrice: '340.00',
        taxRate: '13.00%',
        remark: '基准面精密研磨'
      },
      {
        id: 'wx-m-103',
        seq: 3,
        source: 'HY-26C-080',
        lineNo: '2',
        salesOrder: 'HY-26C-080',
        salesOrderLine: '2',
        productCode: '08-00315',
        productName: '换边机 (PRO)',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        category: '机加件',
        materialCategory: '机加件',
        materialCode: '08-00315-02',
        materialName: '双轨同步滑台底板',
        bomVersion: 'V2.0',
        specification: 'B0393-M007-D11',
        unit: '件',
        currentStock: 2,
        standardUsage: 1,
        standardCost: '280.00',
        plannedQty: 3,
        taxIncludedUnitPrice: '340.00',
        taxRate: '13.00%',
        remark: '五轴精铣'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=8a92c1d04f8e4a31b9c210e87a11',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-28 09:20:00',
      lastVisit: '2026-10-28 14:10:15'
    },
    progressRecords: [
      {
        id: 'pr-201',
        submitTime: '2026-10-28 11:30:00',
        reportMethod: '进度更新',
        currentReport: '新增 35%',
        beforeSubmit: '0%',
        afterSubmit: '35%',
        submitter: '陈玉顺',
        remark: 'CNC粗加工及精铣全部完成'
      },
      {
        id: 'pr-202',
        submitTime: '2026-10-28 14:10:15',
        reportMethod: '进度更新',
        currentReport: '新增 30%',
        beforeSubmit: '35%',
        afterSubmit: '65%',
        submitter: '陈玉顺',
        remark: '首批阳极氧化出槽检验合格'
      }
    ],
    receiptRecords: [
      {
        id: 'rec-201',
        receiptNo: 'WXRK-20261028001',
        receiptDate: '2026-10-28',
        warehouse: '半成品机加仓',
        validQty: 3,
        status: '已入库',
        operator: '周仓管'
      }
    ]
  },
  {
    id: 'wx-2026-02',
    orderNo: 'WXGD-202610280002',
    outsourcingAppNo: 'HYCG-202610280002',
    moNo: '-',
    productCode: '05-00240',
    productName: '0.5米双轨接驳台 2台',
    bomVersion: 'V1.2',
    specification: 'B0392-M007-D11',
    processName: '--',
    supplierCode: 'SU-00008',
    supplierName: '昆山华辰精密钣金制造厂',
    contactPerson: '张建平',
    contactPhone: '13812658800',
    outsourcingType: '整单外协',
    outsourcingMethod: '包工包料',
    priority: '高',
    productionProgress: 0,
    receiptProgress: 0,
    validReceiptQty: 0,
    plannedQty: 6,
    unit: '台',
    requiredDate: '2026-11-12',
    plannedStartDate: '2026-10-28',
    plannedDeliveryDate: '2026-11-10',
    salesOrder: 'HY-26C-080',
    salesOrderLine: '1',
    companyName: '华东精密智造分厂',
    taxIncludedAmount: 19200,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '整机包工包料含导轨、步进电机及钣金机架总装调试',
    creator: '李主管',
    createTime: '2026-10-28 10:05:12',
    status: '进行中',
    remark: '要求出厂前提供连续24小时空载跑机测试视频',
    materials: [
      {
        id: 'wx-m-201',
        seq: 1,
        source: 'HY-26C-080',
        lineNo: '1',
        salesOrder: 'HY-26C-080',
        salesOrderLine: '1',
        productCode: '05-00240',
        productName: '0.5米双轨接驳台 2台',
        productCategory: '成套设备',
        productSpec: 'B0392-M007-D11',
        category: '结构件',
        materialCategory: '结构件',
        materialCode: '05-00240',
        materialName: '0.5米双轨接驳台整机组件',
        bomVersion: 'V1.2',
        specification: 'B0392-M007-D11',
        unit: '台',
        currentStock: 1,
        standardUsage: 1,
        standardCost: '2850.00',
        plannedQty: 4,
        taxIncludedUnitPrice: '3200.00',
        taxRate: '13.00%',
        remark: '按V1.2版BOM整单交付'
      },
      {
        id: 'wx-m-202',
        seq: 2,
        source: 'HY-26C-079',
        lineNo: '1',
        salesOrder: 'HY-26C-079',
        salesOrderLine: '1',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        category: '成套设备',
        materialCategory: '成套设备',
        materialCode: 'A-00004',
        materialName: '自动送板机 (Loader) 整机',
        bomVersion: 'V1.1',
        specification: 'B0376-M007-D11',
        unit: '台',
        currentStock: 0,
        standardUsage: 1,
        standardCost: '2850.00',
        plannedQty: 2,
        taxIncludedUnitPrice: '3200.00',
        taxRate: '13.00%',
        remark: '整单交付'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=7b31e8f92c104d55a6e190b23c02',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-28 10:10:00',
      lastVisit: '--'
    },
    progressRecords: [],
    receiptRecords: []
  },
  {
    id: 'wx-2026-03',
    orderNo: 'WXGD-202610270003',
    outsourcingAppNo: 'HYCG-202610260004',
    moNo: 'MO202610260002',
    productCode: 'CG-00002',
    productName: '2米移栽机',
    bomVersion: 'V1.0',
    specification: 'B0341-M007-D11',
    processRoute: '钣金成型与喷涂外协工艺路线',
    processes: ['整机机架焊接外协', '表面喷涂'],
    processName: '整机机架焊接外协、表面喷涂',
    supplierCode: 'SU-00012',
    supplierName: '苏州工业园区精工表面处理厂',
    contactPerson: '王建国',
    contactPhone: '13915568890',
    outsourcingType: '工序外协',
    outsourcingMethod: '包工不包料',
    priority: '高',
    productionProgress: 0,
    receiptProgress: 0,
    validReceiptQty: 0,
    plannedQty: 5,
    unit: '台',
    requiredDate: '2026-11-05',
    plannedStartDate: '2026-10-29',
    plannedDeliveryDate: '2026-11-05',
    salesOrder: 'HY-26C-076',
    salesOrderLine: '1',
    companyName: '深圳总装制造中心',
    taxIncludedAmount: 4250,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '重型方管底座满焊、去应力退火及双层环氧富锌底漆喷涂',
    creator: '李主管',
    createTime: '2026-10-27 16:40:00',
    status: '待审核',
    remark: '客供方管原料已备齐，审批通过后立即发料',
    materials: [
      {
        id: 'wx-m-301',
        seq: 1,
        source: 'HY-26C-076',
        lineNo: '1',
        salesOrder: 'HY-26C-076',
        salesOrderLine: '1',
        productCode: 'CG-00002',
        productName: '2米移栽机',
        productCategory: '成套设备',
        productSpec: 'B0341-M007-D11',
        category: '结构件',
        materialCategory: '结构件',
        materialCode: 'CG-00002-01',
        materialName: '2米移栽机重型方管底座',
        bomVersion: 'V1.0',
        specification: 'B0340-M007-D11',
        unit: '台',
        currentStock: 0,
        standardUsage: 1,
        standardCost: '720.00',
        plannedQty: 5,
        taxIncludedUnitPrice: '850.00',
        taxRate: '13.00%',
        remark: '满焊探伤并做防锈底漆'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=5c44d2a19b884e12c3f001d88a03',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-27 16:42:00',
      lastVisit: '--'
    },
    progressRecords: [],
    receiptRecords: []
  },
  {
    id: 'wx-2026-04',
    orderNo: 'WXGD-202610260004',
    outsourcingAppNo: 'HYCG-202610270003',
    moNo: 'MO202610250003',
    productCode: 'A-00004',
    productName: '自动送板机 (Loader)',
    bomVersion: 'V1.1',
    specification: 'B0344-M007-D11',
    processRoute: '钣金成型与喷涂外协工艺路线',
    processes: ['激光切割外协', '钣金折弯外协', '表面喷涂'],
    processName: '激光切割外协、钣金折弯外协、表面喷涂',
    supplierCode: 'SU-00008',
    supplierName: '昆山华辰精密钣金制造厂',
    contactPerson: '张建平',
    contactPhone: '13812658800',
    outsourcingType: '工序外协',
    outsourcingMethod: '包工不包料',
    priority: '高',
    productionProgress: 0,
    receiptProgress: 0,
    validReceiptQty: 0,
    plannedQty: 15,
    unit: '件',
    requiredDate: '2026-11-10',
    plannedStartDate: '2026-10-29',
    plannedDeliveryDate: '2026-11-09',
    salesOrder: 'HY-26C-079',
    salesOrderLine: '1、3',
    companyName: '智简工厂测试租户',
    taxIncludedAmount: 3150,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '激光下料、数控折弯及静电粉末喷涂加工费',
    creator: '张工',
    createTime: '2026-10-26 14:22:18',
    status: '草稿',
    remark: '待工艺部确认最新折弯展开图后提交审批',
    materials: [
      {
        id: 'wx-m-401',
        seq: 1,
        source: 'HY-26C-079',
        lineNo: '1',
        salesOrder: 'HY-26C-079',
        salesOrderLine: '1',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        category: '钣金件',
        materialCategory: '钣金件',
        materialCode: 'A-00004-01',
        materialName: '自动送板机上护罩总成',
        bomVersion: 'V1.1',
        specification: 'B0344-M007-D11',
        unit: '件',
        currentStock: 5,
        standardUsage: 1,
        standardCost: '180.00',
        plannedQty: 10,
        taxIncludedUnitPrice: '220.00',
        taxRate: '13.00%',
        remark: 'RAL7035橘纹灰喷塑'
      },
      {
        id: 'wx-m-402',
        seq: 2,
        source: 'HY-26C-079',
        lineNo: '3',
        salesOrder: 'HY-26C-079',
        salesOrderLine: '3',
        productCode: 'A-00004',
        productName: '自动送板机 (Loader)',
        productCategory: '自动化装备',
        productSpec: 'B0376-M007-D11',
        category: '钣金件',
        materialCategory: '钣金件',
        materialCode: 'A-00004-02',
        materialName: '电控箱侧门折弯件',
        bomVersion: 'V1.1',
        specification: 'B0342-M007-D11',
        unit: '件',
        currentStock: 3,
        standardUsage: 1,
        standardCost: '150.00',
        plannedQty: 5,
        taxIncludedUnitPrice: '190.00',
        taxRate: '13.00%',
        remark: '含接地柱焊接'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=3f19a8c44d214b09e1a320f77b04',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-26 14:22:18',
      lastVisit: '--'
    },
    progressRecords: [],
    receiptRecords: []
  },
  {
    id: 'wx-2026-05',
    orderNo: 'WXGD-202610250005',
    outsourcingAppNo: 'HYCG-202610250005',
    moNo: 'MO202610220004',
    productCode: '09-00412',
    productName: '设备配件44',
    bomVersion: 'V1.0',
    specification: 'B0331-M606-D11',
    processRoute: '标准机加及表面处理工艺路线',
    processes: ['CNC粗加工', '精密线割', '热处理淬火'],
    processName: 'CNC粗加工、精密线割、热处理淬火',
    supplierCode: 'SU-00015',
    supplierName: '深圳宏达数控外协加工中心',
    contactPerson: '李志强',
    contactPhone: '13528894412',
    outsourcingType: '工序外协',
    outsourcingMethod: '包工包料',
    priority: '中',
    productionProgress: 0,
    receiptProgress: 0,
    validReceiptQty: 0,
    plannedQty: 20,
    unit: '件',
    requiredDate: '2026-11-15',
    plannedStartDate: '2026-10-30',
    plannedDeliveryDate: '2026-11-12',
    salesOrder: 'HY-26C-072',
    salesOrderLine: '2',
    companyName: '智简工厂测试租户',
    taxIncludedAmount: 3600,
    pricingMethod: '按计划数量计费',
    taxType: '增值税普通发票 3%',
    taxRate: 3,
    feeDescription: 'SKD11模具钢包料粗铣、真空淬火及慢走丝线切割精加工',
    creator: '测试',
    createTime: '2026-10-25 11:18:45',
    status: '审批驳回',
    remark: '外协加工单价超出历史核价标准，请重新议价后提交审批',
    materials: [
      {
        id: 'wx-m-501',
        seq: 1,
        source: 'HY-26C-072',
        lineNo: '2',
        salesOrder: 'HY-26C-072',
        salesOrderLine: '2',
        productCode: '09-00412',
        productName: '设备配件44',
        productCategory: '标准件',
        productSpec: 'B0339-M007-D11',
        category: '机加件',
        materialCategory: '机加件',
        materialCode: '09-00412-01',
        materialName: '定位导柱高硬耐磨衬套',
        bomVersion: 'V1.0',
        specification: 'B0331-M606-D11',
        unit: '件',
        currentStock: 10,
        standardUsage: 1,
        standardCost: '150.00',
        plannedQty: 20,
        taxIncludedUnitPrice: '180.00',
        taxRate: '3.00%',
        remark: '热处理硬度HRC58-60'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=9d02b7e11c334f88a2d450c66e05',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-25 11:18:45',
      lastVisit: '--'
    },
    progressRecords: [],
    receiptRecords: []
  },
  {
    id: 'wx-2026-06',
    orderNo: 'WXGD-202610220006',
    outsourcingAppNo: 'HYCG-202610230006',
    moNo: '-',
    productCode: 'GW-5G-08',
    productName: '5G工业智能网关',
    bomVersion: 'V1.5',
    specification: 'B0331-M007-D11',
    processName: '--',
    supplierCode: 'SU-00006',
    supplierName: '东莞市安可精密机械有限公司',
    contactPerson: '陈玉顺',
    contactPhone: '18681131030',
    outsourcingType: '整单外协',
    outsourcingMethod: '包工包料',
    priority: '高',
    productionProgress: 100,
    receiptProgress: 60,
    validReceiptQty: 6,
    plannedQty: 10,
    unit: '台',
    requiredDate: '2026-11-18',
    plannedStartDate: '2026-10-22',
    plannedDeliveryDate: '2026-10-30',
    salesOrder: 'HY-26C-068',
    salesOrderLine: '1',
    companyName: '华东精密智造分厂',
    taxIncludedAmount: 14500,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '5G工业网关PCBA贴片、铝合金外壳组装及高低温老化测试',
    creator: '张工',
    createTime: '2026-10-22 09:00:00',
    status: '待入库',
    remark: '首批6台已入库，剩余4台待IQC抽检后入库',
    materials: [
      {
        id: 'wx-m-601',
        seq: 1,
        source: 'HY-26C-068',
        lineNo: '1',
        salesOrder: 'HY-26C-068',
        salesOrderLine: '1',
        productCode: 'GW-5G-08',
        productName: '5G工业智能网关',
        productCategory: '通信设备',
        productSpec: 'B0331-M007-D11',
        category: '成套设备',
        materialCategory: '成套设备',
        materialCode: 'GW-5G-08',
        materialName: '5G工业智能网关整机',
        bomVersion: 'V1.5',
        specification: 'B0331-M007-D11',
        unit: '台',
        currentStock: 3,
        standardUsage: 1,
        standardCost: '1200.00',
        plannedQty: 10,
        taxIncludedUnitPrice: '1450.00',
        taxRate: '13.00%',
        remark: '整单交付含天线组件'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=2e88c4a10f994d21b7c310a99d06',
      active: true,
      reportMethod: '进度更新',
      createTime: '2026-10-22 09:05:00',
      lastVisit: '2026-10-27 17:45:00'
    },
    progressRecords: [
      {
        id: 'pr-601',
        submitTime: '2026-10-25 16:00:00',
        reportMethod: '进度更新',
        currentReport: '新增 60%',
        beforeSubmit: '0%',
        afterSubmit: '60%',
        submitter: '陈玉顺',
        remark: 'SMT贴片及DIP插件焊接完成'
      },
      {
        id: 'pr-602',
        submitTime: '2026-10-27 17:45:00',
        reportMethod: '进度更新',
        currentReport: '新增 40%',
        beforeSubmit: '60%',
        afterSubmit: '100%',
        submitter: '陈玉顺',
        remark: '10台整机组装及72小时老化测试全部完工'
      }
    ],
    receiptRecords: [
      {
        id: 'rec-601',
        receiptNo: 'WXRK-20261027008',
        receiptDate: '2026-10-27',
        warehouse: '电子成品仓',
        validQty: 6,
        status: '已入库',
        operator: '周仓管'
      }
    ]
  },
  {
    id: 'wx-2026-07',
    orderNo: 'WXGD-202610180007',
    outsourcingAppNo: 'HYCG-202610180007',
    moNo: '-',
    productCode: 'CG-02167',
    productName: '换边机',
    bomVersion: 'V1.0',
    specification: 'HY-LD250',
    processName: '--',
    supplierCode: 'SU-00006',
    supplierName: '东莞市安可精密机械有限公司',
    contactPerson: '陈玉顺',
    contactPhone: '18681131030',
    outsourcingType: '整单外协',
    outsourcingMethod: '包工包料',
    priority: '高',
    productionProgress: 100,
    receiptProgress: 100,
    validReceiptQty: 4,
    plannedQty: 4,
    unit: '台',
    requiredDate: '2026-10-26',
    plannedStartDate: '2026-10-18',
    plannedDeliveryDate: '2026-10-26',
    salesOrder: 'HY-26C-055',
    salesOrderLine: '1',
    companyName: '智简工厂测试租户',
    taxIncludedAmount: 27200,
    pricingMethod: '按计划数量计费',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '换边机标准版整机4台包工包料制造',
    creator: '李主管',
    createTime: '2026-10-18 10:12:00',
    status: '已完成',
    remark: '4台全部验收合格并完成财务对账',
    materials: [
      {
        id: 'wx-m-701',
        seq: 1,
        source: 'HY-26C-055',
        lineNo: '1',
        salesOrder: 'HY-26C-055',
        salesOrderLine: '1',
        productCode: 'CG-02167',
        productName: '换边机',
        productCategory: '成套设备',
        productSpec: 'HY-LD250',
        category: '成套设备',
        materialCategory: '成套设备',
        materialCode: 'CG-02167',
        materialName: '换边机标准版整机',
        bomVersion: 'V1.0',
        specification: 'HY-LD250',
        unit: '台',
        currentStock: 4,
        standardUsage: 1,
        standardCost: '6100.00',
        plannedQty: 4,
        taxIncludedUnitPrice: '6800.00',
        taxRate: '13.00%',
        remark: '全检合格入库'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=6a11f0c88e224b77d9a100c55f07',
      active: false,
      reportMethod: '进度更新',
      createTime: '2026-10-18 10:15:00',
      lastVisit: '2026-10-25 18:00:00'
    },
    progressRecords: [
      {
        id: 'pr-701',
        submitTime: '2026-10-25 18:00:00',
        reportMethod: '进度更新',
        currentReport: '新增 100%',
        beforeSubmit: '0%',
        afterSubmit: '100%',
        submitter: '陈玉顺',
        remark: '4台整机调试完毕发货'
      }
    ],
    receiptRecords: [
      {
        id: 'rec-701',
        receiptNo: 'WXRK-20261026003',
        receiptDate: '2026-10-26',
        warehouse: '成品智能立体仓',
        validQty: 4,
        status: '已入库',
        operator: '周仓管'
      }
    ]
  },
  {
    id: 'wx-2026-08',
    orderNo: 'WXGD-202610150008',
    outsourcingAppNo: 'HYCG-202610150008',
    moNo: '-',
    productCode: '02-00DX-02161',
    productName: '欧标插头线',
    bomVersion: 'V1.0',
    specification: 'B0409-M606-D11',
    processRoute: '标准机加及表面处理工艺路线',
    processes: ['表面阳极氧化'],
    processName: '表面阳极氧化',
    supplierCode: 'SU-00012',
    supplierName: '苏州工业园区精工表面处理厂',
    contactPerson: '王建国',
    contactPhone: '13915568890',
    outsourcingType: '工序外协',
    outsourcingMethod: '包工不包料',
    priority: '低',
    productionProgress: 0,
    receiptProgress: 0,
    validReceiptQty: 0,
    plannedQty: 30,
    unit: 'PCS',
    requiredDate: '2026-10-25',
    plannedStartDate: '2026-10-15',
    plannedDeliveryDate: '2026-10-25',
    salesOrder: 'HY-26C-049',
    salesOrderLine: '4',
    companyName: '深圳总装制造中心',
    taxIncludedAmount: 450,
    pricingMethod: '整单费用',
    taxType: '增值税专用发票 13%',
    taxRate: 13,
    feeDescription: '端子壳表面阳极氧化批次起步价',
    creator: '测试',
    createTime: '2026-10-15 15:30:00',
    status: '已作废',
    remark: '关联外协申请单已取消，同步作废本外协工单',
    materials: [
      {
        id: 'wx-m-801',
        seq: 1,
        source: 'HY-26C-049',
        lineNo: '4',
        salesOrder: 'HY-26C-049',
        salesOrderLine: '4',
        productCode: '02-00DX-02161',
        productName: '欧标插头线',
        productCategory: '标准件',
        productSpec: 'B0409-M606-D11',
        category: '标准件',
        materialCategory: '标准件',
        materialCode: '02-00DX-02161-01',
        materialName: '欧标插头线铝合金端子壳',
        bomVersion: 'V1.0',
        specification: 'B0409-M606-D11',
        unit: 'PCS',
        currentStock: 50,
        standardUsage: 1,
        standardCost: '12.00',
        plannedQty: 30,
        taxIncludedUnitPrice: '15.00',
        taxRate: '13.00%',
        remark: '已作废'
      }
    ],
    securityLink: {
      url: 'https://supercodezj.com/zjgc/#/outsourcing-report?token=1c90e2b44a114c00d8e200f11a08',
      active: false,
      reportMethod: '进度更新',
      createTime: '2026-10-15 15:30:00',
      lastVisit: '--'
    },
    progressRecords: [],
    receiptRecords: []
  }
];

let outsourcingApplicationsStore: OutsourcingApplicationItem[] = [...INITIAL_OUTSOURCING_APPLICATIONS];
let outsourcingOrdersStore: OutsourcingOrderItem[] = [...INITIAL_OUTSOURCING_ORDERS];

export function getOutsourcingApplications(): OutsourcingApplicationItem[] {
  return outsourcingApplicationsStore;
}

export function updateOutsourcingApplications(newList: OutsourcingApplicationItem[]): void {
  outsourcingApplicationsStore = [...newList];
}

export function getOutsourcingApplicationByNo(applicationNo: string): OutsourcingApplicationItem | undefined {
  return outsourcingApplicationsStore.find(a => a.applicationNo === applicationNo);
}

export function saveOutsourcingApplication(app: OutsourcingApplicationItem): void {
  const idx = outsourcingApplicationsStore.findIndex(a => a.id === app.id || a.applicationNo === app.applicationNo);
  if (idx >= 0) {
    outsourcingApplicationsStore[idx] = app;
  } else {
    outsourcingApplicationsStore = [app, ...outsourcingApplicationsStore];
  }
}

export function getOutsourcingOrders(): OutsourcingOrderItem[] {
  return outsourcingOrdersStore;
}

export function updateOutsourcingOrders(newList: OutsourcingOrderItem[]): void {
  outsourcingOrdersStore = [...newList];
}

export function getOutsourcingOrderByNo(orderNo: string): OutsourcingOrderItem | undefined {
  return outsourcingOrdersStore.find(o => o.orderNo === orderNo);
}

export function saveOutsourcingOrder(order: OutsourcingOrderItem): void {
  let normalizedStatus: OutsourcingStatus = order.status;
  if (normalizedStatus === '进行中' && Number(order.productionProgress) >= 100) {
    normalizedStatus = '待入库';
  }
  if ((normalizedStatus === '待入库' || normalizedStatus === '进行中') && Number(order.receiptProgress) >= 100) {
    normalizedStatus = '已完成';
  }
  const normalizedOrder: OutsourcingOrderItem = {
    ...order,
    status: normalizedStatus
  };

  const idx = outsourcingOrdersStore.findIndex(o => o.orderNo === normalizedOrder.orderNo);
  if (idx >= 0) {
    outsourcingOrdersStore[idx] = normalizedOrder;
  } else {
    outsourcingOrdersStore = [normalizedOrder, ...outsourcingOrdersStore];
  }

  // 当关联了外协申请单时，自动汇总已转外协数量；若全部转外协工单则自动变为已完成
  if (order.outsourcingAppNo) {
    const appIdx = outsourcingApplicationsStore.findIndex(a => a.applicationNo === order.outsourcingAppNo);
    if (appIdx >= 0) {
      const targetApp = outsourcingApplicationsStore[appIdx];
      const relatedOrders = outsourcingOrdersStore.filter(
        o => o.outsourcingAppNo === order.outsourcingAppNo && o.status !== '已作废'
      );
      const sumOrderedQty = relatedOrders.reduce((sum, o) => sum + (Number(o.plannedQty) || 0), 0);
      const nextConvertedQty = Math.min(targetApp.totalQty, Math.max(targetApp.convertedQty, sumOrderedQty));
      const nextStatus: ApplicationStatus =
        targetApp.status === '进行中' && nextConvertedQty >= targetApp.totalQty
          ? '已完成'
          : targetApp.status;
      outsourcingApplicationsStore[appIdx] = {
        ...targetApp,
        convertedQty: nextConvertedQty,
        status: nextStatus
      };
    }
  }
}

/**
 * 格式化外协申请单的销售订单展示文本（支持多个销售订单及多个项次，如：HY-26C-081 第3项、HY-26C-080 第1,2项）
 */
export function formatApplicationSalesOrders(app: OutsourcingApplicationItem): string {
  if (!app.materials || app.materials.length === 0) return '-';
  const grouped = new Map<string, string[]>();
  app.materials.forEach(m => {
    const so = (m.source || '').trim();
    if (!so || so === '-') return;
    const line = (m.lineNo || '1').trim();
    if (!grouped.has(so)) {
      grouped.set(so, []);
    }
    const lines = grouped.get(so)!;
    if (line && !lines.includes(line)) {
      lines.push(line);
    }
  });
  if (grouped.size === 0) return '-';
  return Array.from(grouped.entries())
    .map(([so, lines]) => (lines.length > 0 ? `${so} 第${lines.join(',')}项` : so))
    .join('、');
}

/**
 * 格式化外协申请单的物料信息展示文本（支持多个物料/产品展示，用顿号连接）
 */
export function formatApplicationMaterialsInfo(app: OutsourcingApplicationItem): string {
  if (!app.materials || app.materials.length === 0) return '-';
  const names: string[] = [];
  app.materials.forEach(m => {
    const name =
      app.outsourcingType === '整单外协'
        ? (m.productName || m.materialName || '').trim()
        : (m.materialName || m.productName || '').trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  });
  return names.length > 0 ? names.join('、') : '-';
}

/**
 * 格式化外协工单的销售订单展示文本（支持多个销售订单及多个项次，如：HY-26C-081 第3项、HY-26C-080 第1,2项）
 */
export function formatOrderSalesOrders(order: OutsourcingOrderItem): string {
  if (order.materials && order.materials.length > 0) {
    const grouped = new Map<string, string[]>();
    order.materials.forEach(m => {
      const so = (m.salesOrder || m.source || '').trim();
      if (!so || so === '-') return;
      const line = (m.salesOrderLine || m.lineNo || '1').trim();
      if (!grouped.has(so)) {
        grouped.set(so, []);
      }
      const lines = grouped.get(so)!;
      if (line && !lines.includes(line)) {
        lines.push(line);
      }
    });
    if (grouped.size > 0) {
      return Array.from(grouped.entries())
        .map(([so, lines]) => (lines.length > 0 ? `${so} 第${lines.join(',')}项` : so))
        .join('、');
    }
  }
  const so = (order.salesOrder || '').trim();
  if (!so || so === '-') return '-';
  const lineStr = (order.salesOrderLine || '1').replace(/、/g, ',').trim();
  return lineStr ? `${so} 第${lineStr}项` : so;
}

/**
 * 格式化外协工单的物料信息展示文本（支持多个物料/产品展示，用顿号连接）
 */
export function formatOrderMaterialsInfo(order: OutsourcingOrderItem): string {
  if (order.materials && order.materials.length > 0) {
    const names: string[] = [];
    order.materials.forEach(m => {
      const name =
        order.outsourcingType === '整单外协'
          ? (m.productName || m.materialName || '').trim()
          : (m.materialName || m.productName || '').trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
    });
    if (names.length > 0) return names.join('、');
  }
  return order.productName || '-';
}

