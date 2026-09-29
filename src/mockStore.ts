import { BomNode, Operation, SchedulePlanItem, GeneratedTask, ProductionTask, ProductionTaskStatus, TaskPriority } from './types';

export interface OrderItem {
  id: number;
  no: string;
  type: string;
  priority: '紧急' | '高' | '中' | '低' | null;
  product: string;
  productCode: string;
  qty: number;
  overallProgress: number;
  status: '草稿' | '待排产' | '进行中' | '已排产' | '审批中' | '已完成';
  customer: string;
  so: string;
  lineItem?: string;
  spec?: string;
  drawingNo?: string;
  workshop?: string;
  plannedStart: string;
  plannedEnd: string;
  processes: string[];
  department?: string;
  // Tracks which processes have already been scheduled
  scheduledProcessMap: Record<string, boolean>;
}

export const initialOrders: OrderItem[] = [
  {
    id: 1,
    no: 'MO202608210015',
    type: '成品自制',
    priority: '高',
    product: '2米移栽机',
    productCode: 'CG-00002',
    qty: 5,
    overallProgress: 0,
    status: '待排产',
    customer: '华为技术有限公司',
    so: 'SO-20260601-001',
    lineItem: '01',
    spec: '2000×650×1800mm / 45#钢',
    drawingNo: 'DWG-CG-2026-02',
    workshop: '机加工一车间',
    plannedStart: '2026-08-25',
    plannedEnd: '2026-09-05',
    processes: ['编程下图', 'CNC', '车床', '机加铣床', '线割加工', '攻牙'],
    department: '机加部',
    scheduledProcessMap: {}
  },
  {
    id: 2,
    no: 'MO202608210012',
    type: '成品自制',
    priority: '中',
    product: '移载送板机',
    productCode: '12-00008',
    qty: 10,
    overallProgress: 0,
    status: '待排产',
    customer: '中兴通讯股份有限公司',
    so: 'SO-20260605-012',
    lineItem: '02',
    spec: '标准型 500mm / 铝合金6061',
    drawingNo: 'DWG-YZ-2026-08',
    workshop: '组装一车间',
    plannedStart: '2026-08-22',
    plannedEnd: '2026-08-30',
    processes: ['钳工组装', '电工组装', '钳工调试'],
    department: '组装部',
    scheduledProcessMap: {}
  },
  {
    id: 3,
    no: 'MO202608210008',
    type: '成品自制',
    priority: '中',
    product: '移载送板机',
    productCode: '12-00008',
    qty: 10,
    overallProgress: 0,
    status: '待排产',
    customer: '富士康科技集团',
    so: 'SO-20260608-033',
    lineItem: '01',
    spec: '标准型 500mm / 铝合金6061',
    drawingNo: 'DWG-YZ-2026-08',
    workshop: '组装二车间',
    plannedStart: '2026-08-24',
    plannedEnd: '2026-09-02',
    processes: ['钳工组装', '电工组装', '钳工调试'],
    department: '组装部',
    scheduledProcessMap: {}
  },
  {
    id: 4,
    no: 'MO202608210006',
    type: '成品自制',
    priority: '紧急',
    product: '移载送板机',
    productCode: '12-00008',
    qty: 10,
    overallProgress: 35,
    status: '进行中',
    customer: '大疆创新科技有限公司',
    so: 'SO-20260610-045',
    lineItem: '03',
    spec: '定制强化型 / 304不锈钢',
    drawingNo: 'DWG-YZ-2026-10',
    workshop: '机加工二车间',
    plannedStart: '2026-08-21',
    plannedEnd: '2026-08-28',
    processes: ['编程下图', 'CNC', '线割加工', '攻牙'],
    department: '机加部',
    // First 2 processes are scheduled, remaining 2 are not yet scheduled!
    scheduledProcessMap: {
      '编程下图': true,
      'CNC': true,
      '线割加工': false,
      '攻牙': false
    }
  },
  {
    id: 5,
    no: 'MO202608210001',
    type: '成品自制',
    priority: '低',
    product: '5G工业智能网关',
    productCode: 'GW-5G-08',
    qty: 20,
    overallProgress: 60,
    status: '已排产',
    customer: '内部库存中心',
    so: 'SO-20260610-003',
    lineItem: '01',
    spec: '工业防爆型 / IP67',
    drawingNo: 'DWG-GW-2026-01',
    workshop: '电子车间',
    plannedStart: '2026-08-18',
    plannedEnd: '2026-08-27',
    processes: ['SMT贴片', '回流焊', '功能测试', '包装入库'],
    department: '钣金部',
    scheduledProcessMap: {
      'SMT贴片': true,
      '回流焊': true,
      '功能测试': true,
      '包装入库': true
    }
  },
  {
    id: 6,
    no: 'MO202608200003',
    type: '成品自制',
    priority: '高',
    product: '智能人脸识别门锁 Pro',
    productCode: 'LCK-FACE-01',
    qty: 50,
    overallProgress: 0,
    status: '待排产',
    customer: '小米通信技术有限公司',
    so: 'SO-20260605-002',
    lineItem: '02',
    spec: 'Pro旗舰款 / 锌合金磨砂黑',
    drawingNo: 'DWG-LCK-2026-03',
    workshop: '精密机加车间',
    plannedStart: '2026-08-26',
    plannedEnd: '2026-09-08',
    processes: ['结构件机加', 'CNC', '线割加工', '总装调试'],
    department: '机加部',
    scheduledProcessMap: {}
  }
];

export interface WorkCenterOption {
  code: string;
  name: string;
  type: string;
  capacityPerDay: number;
}

export const standardWorkCenters: WorkCenterOption[] = [
  { code: 'WS-PROG-01', name: '编程CAM设计工作站', type: '编程', capacityPerDay: 50 },
  { code: 'WS-CNC-01', name: 'CNC精密加工中心1号机', type: 'CNC', capacityPerDay: 20 },
  { code: 'WS-CNC-02', name: 'CNC精密加工中心2号机', type: 'CNC', capacityPerDay: 20 },
  { code: 'WS-LATHE-01', name: '自动化数控车床中心', type: '车床', capacityPerDay: 30 },
  { code: 'WS-MILL-01', name: '机加立式铣床1号', type: '铣床', capacityPerDay: 25 },
  { code: 'WS-WIRE-01', name: '精密中走丝线割加工站', type: '线割', capacityPerDay: 15 },
  { code: 'WS-WIRE-02', name: '慢走丝线切割高精工作站', type: '线割', capacityPerDay: 10 },
  { code: 'WS-TAP-01', name: '自动化数控攻牙工位', type: '攻牙', capacityPerDay: 60 },
  { code: 'WS-ASM-FIT-01', name: '钳工精密组装工作站', type: '装配', capacityPerDay: 15 },
  { code: 'WS-ASM-ELE-01', name: '电工电气配线工作站', type: '装配', capacityPerDay: 15 },
  { code: 'WS-DBG-01', name: '整机精密调试工作站', type: '调试', capacityPerDay: 12 },
  { code: 'WS-SMT-01', name: '高速SMT贴片生产线', type: '电子', capacityPerDay: 100 },
  { code: 'WS-TEST-01', name: '出厂综合测试工位', type: '检测', capacityPerDay: 80 }
];

export const standardEmployees = [
  { name: '张师傅', position: '操作工', department: '机加工部' },
  { name: '李师傅', position: '数控技师', department: '数控加工部' },
  { name: '王技师', position: '高级钳工', department: '装配工程部' },
  { name: '赵工', position: '电气工程师', department: '电气工程部' },
  { name: '孙师傅', position: '调试技师', department: '调试部' },
  { name: '周技师', position: '线割技师', department: '特种加工部' },
  { name: '钱工', position: 'CAM工程师', department: '工程技术部' },
  { name: '吴师傅', position: '操作工', department: '机加工部' }
];

export const standardPositions = [
  '操作工',
  '数控技师',
  '高级钳工',
  '电气工程师',
  '调试技师',
  '线割技师',
  'CAM工程师',
  '质检员'
];

// Helper to recommend work center by process name
export function getRecommendedWorkCenter(processName: string): { code: string; name: string } {
  if (processName.includes('编程')) return { code: 'WS-PROG-01', name: '编程CAM设计工作站' };
  if (processName.includes('CNC')) return { code: 'WS-CNC-01', name: 'CNC精密加工中心1号机' };
  if (processName.includes('车床')) return { code: 'WS-LATHE-01', name: '自动化数控车床中心' };
  if (processName.includes('铣床')) return { code: 'WS-MILL-01', name: '机加立式铣床1号' };
  if (processName.includes('线割')) return { code: 'WS-WIRE-01', name: '精密中走丝线割加工站' };
  if (processName.includes('攻牙')) return { code: 'WS-TAP-01', name: '自动化数控攻牙工位' };
  if (processName.includes('钳工') || processName.includes('组装')) return { code: 'WS-ASM-FIT-01', name: '钳工精密组装工作站' };
  if (processName.includes('电工') || processName.includes('电气')) return { code: 'WS-ASM-ELE-01', name: '电工电气配线工作站' };
  if (processName.includes('调试')) return { code: 'WS-DBG-01', name: '整机精密调试工作站' };
  if (processName.includes('贴片') || processName.includes('SMT')) return { code: 'WS-SMT-01', name: '高速SMT贴片生产线' };
  return { code: 'WS-01', name: '标准机加工作站01' };
}

export function getRecommendedEmployee(processName: string): { name: string; position: string } {
  if (processName.includes('编程')) return { name: '钱工', position: 'CAM工程师' };
  if (processName.includes('CNC')) return { name: '李师傅', position: '数控技师' };
  if (processName.includes('车床') || processName.includes('铣床')) return { name: '张师傅', position: '操作工' };
  if (processName.includes('线割')) return { name: '周技师', position: '线割技师' };
  if (processName.includes('攻牙')) return { name: '吴师傅', position: '操作工' };
  if (processName.includes('钳工')) return { name: '王技师', position: '高级钳工' };
  if (processName.includes('电工')) return { name: '赵工', position: '电气工程师' };
  if (processName.includes('调试')) return { name: '孙师傅', position: '调试技师' };
  return { name: '张师傅', position: '操作工' };
}

// Global in-memory storage for persistent sync across screens
let ordersDataState: OrderItem[] = [...initialOrders];
let schedulePlanStore: Record<string, Record<string, SchedulePlanItem>> = {};

export const initialProductionTasks: ProductionTask[] = [
  {
    id: 'PT-20260826-001',
    seq: 1,
    taskCode: 'TK20260826001',
    taskName: '2米移栽机编程下图',
    priority: '高',
    salesOrder: 'SO-20260601-001 第1项',
    opName: '编程下图',
    moNo: 'MO202608210015',
    workStationCode: 'WS-PROG-01',
    workStationName: '编程CAM设计工作站',
    employee: '钱工',
    position: 'CAM工程师',
    progress: 0,
    plannedStartTime: '2026-08-26 09:00:00',
    estimatedEndTime: '2026-08-27 18:00:00',
    status: '待下发',
    requiredQuantity: 5,
    completedQuantity: 0,
    remark: '待调度员确认下发工单指令'
  },
  {
    id: 'PT-20260826-002',
    seq: 2,
    taskCode: 'TK20260826002',
    taskName: '2米移栽机CNC精密加工',
    priority: '高',
    salesOrder: 'SO-20260601-001 第1项',
    opName: 'CNC',
    moNo: 'MO202608210015',
    workStationCode: 'WS-CNC-01',
    workStationName: 'CNC精密加工中心1号机',
    employee: '李师傅',
    position: '数控技师',
    progress: 0,
    plannedStartTime: '2026-08-27 09:00:00',
    estimatedEndTime: '2026-08-29 18:00:00',
    status: '待下发',
    requiredQuantity: 5,
    completedQuantity: 0,
    remark: '预排产完成，等待前道工序下发'
  },
  {
    id: 'PT-20260826-003',
    seq: 3,
    taskCode: 'TK20260826003',
    taskName: '移载送板机钳工调试',
    priority: '紧急',
    salesOrder: 'SO-20260610-045 第2项',
    opName: '钳工调试',
    moNo: 'MO202608210006',
    workStationCode: 'WS-DBG-01',
    workStationName: '整机精密调试工作站',
    employee: '孙师傅',
    position: '调试技师',
    progress: 0,
    plannedStartTime: '2026-08-25 08:30:00',
    estimatedEndTime: '2026-08-26 17:30:00',
    status: '待下发',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: '关键试产工序'
  },
  {
    id: 'PT-20260826-004',
    seq: 4,
    taskCode: 'TK20260826004',
    taskName: '5G智能网关回流焊',
    priority: '中',
    salesOrder: 'SO-20260610-003 第1项',
    opName: '回流焊',
    moNo: 'MO202608210001',
    workStationCode: 'WS-SMT-01',
    workStationName: '高速SMT贴片生产线',
    employee: '周技师',
    position: '操作工',
    progress: 100,
    plannedStartTime: '2026-08-18 09:00:00',
    estimatedEndTime: '2026-08-20 18:00:00',
    status: '已完成',
    requiredQuantity: 20,
    completedQuantity: 20,
    remark: '质检合格全数通过'
  },
  {
    id: 'PT-20260826-005',
    seq: 5,
    taskCode: 'TK20260826005',
    taskName: '智能人脸识别门锁线割加工',
    priority: '低',
    salesOrder: 'SO-20260605-002 第1项',
    opName: '线割加工',
    moNo: 'MO202608200003',
    workStationCode: 'WS-WIRE-01',
    workStationName: '精密中走丝线割加工站',
    employee: '周技师',
    position: '线割技师',
    progress: 15,
    plannedStartTime: '2026-08-24 09:00:00',
    estimatedEndTime: '2026-08-26 18:00:00',
    status: '暂停',
    requiredQuantity: 50,
    completedQuantity: 8,
    remark: '因刀具磨损维护临时暂停'
  },
  {
    id: 'PT-20260826-006',
    seq: 6,
    taskCode: 'TK20260826006',
    taskName: '铝合金箱体打磨测试',
    priority: '低',
    salesOrder: 'SO-20260611-009 第3项',
    opName: '打磨',
    moNo: 'MO202608190002',
    workStationCode: 'WS0022',
    workStationName: '打磨工作站',
    employee: '柏胜章',
    position: '打磨',
    progress: 0,
    plannedStartTime: '2026-08-20 00:00:00',
    estimatedEndTime: '2026-08-21 23:59:59',
    status: '取消',
    taskType: 'SELF',
    requiredQuantity: 15,
    completedQuantity: 0,
    remark: '客户需求变更，取消此工序'
  },
  {
    id: 'PT-20260826-OS-01',
    seq: 7,
    taskCode: 'TK202608210015-OS1',
    taskName: '2米移栽机导向座精密铣削(委外外协)',
    priority: '高',
    salesOrder: 'SO-20260601-001 第1项',
    opName: '精密铣削',
    moNo: 'MO202608210015',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】精工精密五金实业有限公司',
    employee: '外协跟单员',
    position: '外协管理',
    progress: 40,
    plannedStartTime: '2026-08-25 09:00:00',
    estimatedEndTime: '2026-08-29 18:00:00',
    status: '生产中',
    taskType: 'OUTSOURCE',
    requiredQuantity: 20,
    completedQuantity: 8,
    outsourceSupplier: '精工精密五金实业有限公司',
    outsourceDeliveryDate: '2026-08-29',
    outsourceUnitPrice: 45.00,
    outsourceReason: '车间产能超负荷/工期紧急',
    remark: '外协加工中，供应商已交付首批样件'
  },
  {
    id: 'PT-20260826-OS-02',
    seq: 8,
    taskCode: 'TK202608200003-OS1',
    taskName: '智能人脸门锁精密五金阳极氧化(委外外协)',
    priority: '中',
    salesOrder: 'SO-20260605-002 第1项',
    opName: '阳极氧化',
    moNo: 'MO202608200003',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】宏发表面热处理有限公司',
    employee: '外协跟单员',
    position: '外协管理',
    progress: 0,
    plannedStartTime: '2026-08-26 09:00:00',
    estimatedEndTime: '2026-08-30 18:00:00',
    status: '待下发',
    taskType: 'OUTSOURCE',
    requiredQuantity: 50,
    completedQuantity: 0,
    outsourceSupplier: '宏发表面热处理有限公司',
    outsourceDeliveryDate: '2026-08-30',
    outsourceUnitPrice: 8.50,
    outsourceReason: '特殊表面工艺委外协同',
    remark: '需黑色哑光阳极氧化处理'
  },
  {
    id: 'PT-20260826-OS-03',
    seq: 9,
    taskCode: 'TK202608210012-OS1',
    taskName: '慢走丝特种精密割缝加工(委外外协)',
    priority: '紧急',
    salesOrder: 'SO-20260605-012 第2项',
    opName: '慢走丝线割',
    moNo: 'MO202608210012',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】昆山信捷精密模具有限公司',
    employee: '委外跟单员',
    position: '外协管理',
    progress: 60,
    plannedStartTime: '2026-08-25 08:30:00',
    estimatedEndTime: '2026-09-02 18:00:00',
    status: '生产中',
    taskType: 'OUTSOURCE',
    requiredQuantity: 10,
    completedQuantity: 6,
    outsourceSupplier: '昆山信捷精密模具有限公司',
    outsourceDeliveryDate: '2026-09-02',
    outsourceUnitPrice: 165.00,
    outsourceReason: '微米级公差超精密加工设备协同',
    remark: '模具级公差要求±0.005mm，厂商正进行精割第二刀'
  },
  {
    id: 'PT-20260826-OS-04',
    seq: 10,
    taskCode: 'TK202608200002-OS1',
    taskName: '铝合金机箱双色粉末静电喷涂(委外外协)',
    priority: '中',
    salesOrder: 'SO-20260608-033 第1项',
    opName: '表面喷涂',
    moNo: 'MO202608210008',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】东莞市创联特种喷涂实业厂',
    employee: '委外跟单员',
    position: '外协管理',
    progress: 100,
    plannedStartTime: '2026-08-22 09:00:00',
    estimatedEndTime: '2026-08-31 17:00:00',
    status: '已完成',
    taskType: 'OUTSOURCE',
    requiredQuantity: 30,
    completedQuantity: 30,
    outsourceSupplier: '东莞市创联特种喷涂实业厂',
    outsourceDeliveryDate: '2026-08-31',
    outsourceUnitPrice: 28.00,
    outsourceReason: '特种双色抗UV户外静电喷涂资质',
    remark: '全数到货检验合格，附供应商盐雾测试报告'
  },
  {
    id: 'PT-20260826-OS-05',
    seq: 11,
    taskCode: 'TK202608210006-OS1',
    taskName: '激光雕刻与电控面板特种丝印(委外外协)',
    priority: '中',
    salesOrder: 'SO-20260610-045 第2项',
    opName: '铭牌特种丝印',
    moNo: 'MO202608210006',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】深圳市博创精密标牌制造厂',
    employee: '委外跟单员',
    position: '外协管理',
    progress: 0,
    plannedStartTime: '2026-08-27 08:00:00',
    estimatedEndTime: '2026-09-05 18:00:00',
    status: '待生产',
    taskType: 'OUTSOURCE',
    requiredQuantity: 100,
    completedQuantity: 0,
    outsourceSupplier: '深圳市博创精密标牌制造厂',
    outsourceDeliveryDate: '2026-09-05',
    outsourceUnitPrice: 6.20,
    outsourceReason: '无尘恒温丝印及耐刮擦工艺委外',
    remark: '底版已送达协作厂，待签样后批量印刷'
  },
  {
    id: 'PT-20260826-OS-06',
    seq: 12,
    taskCode: 'TK202608210015-OS2',
    taskName: '45#钢导向滑轴QPQ复合盐浴盐浴热处理(委外外协)',
    priority: '高',
    salesOrder: 'SO-20260601-001 第2项',
    opName: 'QPQ盐浴热处理',
    moNo: 'MO202608210015',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: '【外协】江苏众达热处理科技有限公司',
    employee: '委外跟单员',
    position: '外协管理',
    progress: 30,
    plannedStartTime: '2026-08-26 09:00:00',
    estimatedEndTime: '2026-09-03 18:00:00',
    status: '生产中',
    taskType: 'OUTSOURCE',
    requiredQuantity: 40,
    completedQuantity: 12,
    outsourceSupplier: '江苏众达热处理科技有限公司',
    outsourceDeliveryDate: '2026-09-03',
    outsourceUnitPrice: 36.50,
    outsourceReason: '特种环保QPQ渗氮盐浴生产线',
    remark: '前批已完成渗氮，正进行氧化抛光处理'
  },
  {
    id: 'PT-20260826-021',
    seq: 13,
    taskCode: 'TK20260826021',
    taskName: '390款送板机底座激光精密下料',
    priority: '紧急',
    salesOrder: 'SO-20260610-045 第3项',
    opName: '激光切割',
    moNo: 'MO202608210006',
    workStationCode: 'WS-LSR-01',
    workStationName: '万瓦光纤激光切割中心',
    employee: '何维志,莫崇梁',
    position: '激光机操作员',
    progress: 0,
    plannedStartTime: '2026-08-27 08:00:00',
    estimatedEndTime: '2026-08-28 17:30:00',
    status: '待下发',
    taskType: 'SELF',
    requiredQuantity: 20,
    completedQuantity: 0,
    remark: '生产计划已审核，等待车间班长批量签收下发'
  },
  {
    id: 'PT-20260826-022',
    seq: 14,
    taskCode: 'TK20260826022',
    taskName: '导轨滑块安装孔高精度数控精镗',
    priority: '高',
    salesOrder: 'SO-20260601-001 第3项',
    opName: '数控精镗',
    moNo: 'MO202608210015',
    workStationCode: 'WS-CNC-02',
    workStationName: '五轴联动加工中心',
    employee: '陈大勇,宋师傅',
    position: '数控高级技工',
    progress: 0,
    plannedStartTime: '2026-08-27 13:00:00',
    estimatedEndTime: '2026-08-29 18:00:00',
    status: '待下发',
    taskType: 'SELF',
    requiredQuantity: 15,
    completedQuantity: 0,
    remark: '孔径公差H7要求，待下发派工'
  },
  {
    id: 'PT-20260826-023',
    seq: 15,
    taskCode: 'TK20260826023',
    taskName: '电控箱面板数控多轴自动攻牙',
    priority: '中',
    salesOrder: 'SO-20260608-033 第2项',
    opName: '数控攻牙',
    moNo: 'MO202608210008',
    workStationCode: 'WS-TAP-01',
    workStationName: '多轴柔性攻丝机工位',
    employee: '赵亮,王师傅',
    position: '操作工',
    progress: 0,
    plannedStartTime: '2026-08-28 08:30:00',
    estimatedEndTime: '2026-08-29 12:00:00',
    status: '待下发',
    taskType: 'SELF',
    requiredQuantity: 30,
    completedQuantity: 0,
    remark: '排产完成，备料已就绪，可随时下发'
  },
  {
    id: 'PT-20260826-007',
    seq: 16,
    taskCode: 'TK20260826007',
    taskName: '旧款控制器线路测试',
    priority: '低',
    salesOrder: 'SO-20260515-001 第1项',
    opName: '线路测试',
    moNo: 'MO202608150001',
    workStationCode: 'WS-TEST-01',
    workStationName: '出厂综合测试工位',
    employee: '赵工',
    position: '质检员',
    progress: 0,
    plannedStartTime: '2026-08-15 00:00:00',
    estimatedEndTime: '2026-08-16 23:59:59',
    status: '作废',
    requiredQuantity: 5,
    completedQuantity: 0,
    remark: '工艺改进，旧版工序作废'
  },
  {
    id: 'PT-20260826-008',
    seq: 8,
    taskCode: 'TK202608050011-1',
    taskName: '4.26米空中平移【6.0*2.5】焊接',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第14项',
    opName: '焊接',
    moNo: 'MO202608050011',
    workStationCode: 'WS0020',
    workStationName: '焊接工作站',
    employee: '范红利,雷衍礼,齐小红',
    position: '焊工',
    progress: 0,
    plannedStartTime: '2026-08-05 00:00:00',
    estimatedEndTime: '2026-08-05 23:59:59',
    status: '待生产',
    requiredQuantity: 1,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-009',
    seq: 9,
    taskCode: 'TK202608050011-2',
    taskName: '4.26米空中平移【6.0*2.5】折弯',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第14项',
    opName: '折弯',
    moNo: 'MO202608050011',
    workStationCode: 'WS0019',
    workStationName: '折弯工作站',
    employee: '李海红,李伟,靳',
    position: '折弯',
    progress: 0,
    plannedStartTime: '2026-08-05 00:00:00',
    estimatedEndTime: '2026-08-05 23:59:59',
    status: '待生产',
    requiredQuantity: 1,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-010',
    seq: 10,
    taskCode: 'TK202608050011-3',
    taskName: '4.26米空中平移【6.0*2.5】激光下料',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第14项',
    opName: '激光下料',
    moNo: 'MO202608050011',
    workStationCode: 'WS0017',
    workStationName: '激光下料工作站',
    employee: '何维志,莫崇梁',
    position: '激光机操作员',
    progress: 0,
    plannedStartTime: '2026-08-05 00:00:00',
    estimatedEndTime: '2026-08-05 23:59:59',
    status: '待生产',
    requiredQuantity: 1,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-011',
    seq: 11,
    taskCode: 'TK202608050011-4',
    taskName: '4.26米空中平移【6.0*2.5】排版',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第14项',
    opName: '排版',
    moNo: 'MO202608050011',
    workStationCode: 'WS0025',
    workStationName: '排版工作站',
    employee: '何维志,莫崇梁',
    position: '激光机操作员',
    progress: 0,
    plannedStartTime: '2026-08-05 00:00:00',
    estimatedEndTime: '2026-08-05 23:59:59',
    status: '待生产',
    requiredQuantity: 1,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-012',
    seq: 12,
    taskCode: 'TK202608050011-5',
    taskName: '4.26米空中平移【6.0*2.5】展图',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第14项',
    opName: '展图',
    moNo: 'MO202608050011',
    workStationCode: 'WS0021',
    workStationName: '展图工作站',
    employee: '陈佳劲,何伟',
    position: '钣金工程师',
    progress: 35.5,
    plannedStartTime: '2026-08-05 00:00:00',
    estimatedEndTime: '2026-08-05 23:59:59',
    status: '生产中',
    requiredQuantity: 1,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-013',
    seq: 13,
    taskCode: 'TK202608030005-1',
    taskName: '390款自动调宽料箱展图',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '展图',
    moNo: 'MO202608030005',
    workStationCode: 'WS0021',
    workStationName: '展图工作站',
    employee: '陈佳劲,何伟',
    position: '钣金工程师',
    progress: 50.0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '生产中',
    requiredQuantity: 10,
    completedQuantity: 5,
    remark: ''
  },
  {
    id: 'PT-20260826-014',
    seq: 14,
    taskCode: 'TK202608030005-2',
    taskName: '390款自动调宽料箱排版',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '排版',
    moNo: 'MO202608030005',
    workStationCode: 'WS0025',
    workStationName: '排版工作站',
    employee: '何维志,莫崇梁',
    position: '激光机操作员',
    progress: 20.0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '生产中',
    requiredQuantity: 10,
    completedQuantity: 2,
    remark: ''
  },
  {
    id: 'PT-20260826-015',
    seq: 15,
    taskCode: 'TK202608030005-3',
    taskName: '390款自动调宽料箱喷塑',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '喷塑',
    moNo: 'MO202608030005',
    workStationCode: 'WS0024',
    workStationName: '喷塑工作站',
    employee: '李关成',
    position: '喷粉工',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-016',
    seq: 16,
    taskCode: 'TK202608030005-4',
    taskName: '390款自动调宽料箱钳工',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '钳工',
    moNo: 'MO202608030005',
    workStationCode: 'WS0021',
    workStationName: '钳工工作站',
    employee: 'lin0507,lin0617,何小键',
    position: '钳工',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-017',
    seq: 17,
    taskCode: 'TK202608030005-5',
    taskName: '390款自动调宽料箱打磨',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '打磨',
    moNo: 'MO202608030005',
    workStationCode: 'WS0022',
    workStationName: '打磨工作站',
    employee: '柏胜章',
    position: '打磨',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-018',
    seq: 18,
    taskCode: 'TK202608030005-6',
    taskName: '390款自动调宽料箱焊接',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '焊接',
    moNo: 'MO202608030005',
    workStationCode: 'WS0020',
    workStationName: '焊接工作站',
    employee: '范红利,雷衍礼,齐小红',
    position: '焊工',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-019',
    seq: 19,
    taskCode: 'TK202608030005-7',
    taskName: '390款自动调宽料箱折弯',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '折弯',
    moNo: 'MO202608030005',
    workStationCode: 'WS0019',
    workStationName: '折弯工作站',
    employee: '李海红,李伟,靳',
    position: '折弯',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  },
  {
    id: 'PT-20260826-020',
    seq: 20,
    taskCode: 'TK202608030005-8',
    taskName: '390款自动调宽料箱激光下料',
    priority: '紧急',
    salesOrder: 'XZZQ-26C-027 第13项',
    opName: '激光下料',
    moNo: 'MO202608030005',
    workStationCode: 'WS0017',
    workStationName: '激光下料工作站',
    employee: '何维志,莫崇梁',
    position: '激光机操作员',
    progress: 0,
    plannedStartTime: '2026-08-03 00:00:00',
    estimatedEndTime: '2026-08-22 23:59:59',
    status: '待生产',
    requiredQuantity: 10,
    completedQuantity: 0,
    remark: ''
  }
];

let productionTasksStore: ProductionTask[] = [...initialProductionTasks];
let taskListeners: Array<() => void> = [];

export function getProductionTasks(): ProductionTask[] {
  return productionTasksStore;
}

export function subscribeProductionTasks(listener: () => void) {
  taskListeners.push(listener);
  return () => {
    taskListeners = taskListeners.filter(l => l !== listener);
  };
}

function notifyTaskListeners() {
  taskListeners.forEach(fn => fn());
}

export function addProductionTask(task: Omit<ProductionTask, 'id' | 'seq'> & { id?: string }): ProductionTask {
  const newTask: ProductionTask = {
    ...task,
    id: task.id || `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    seq: productionTasksStore.length + 1
  };
  // Unshift to top of list so newly added "待下发" tasks appear first
  productionTasksStore = [newTask, ...productionTasksStore];
  notifyTaskListeners();
  return newTask;
}

export function updateProductionTaskStatus(id: string, newStatus: ProductionTaskStatus) {
  productionTasksStore = productionTasksStore.map(t => 
    t.id === id ? { ...t, status: newStatus } : t
  );
  notifyTaskListeners();
}

export function updateProductionTaskPriority(id: string, priority: TaskPriority) {
  productionTasksStore = productionTasksStore.map(t => 
    t.id === id ? { ...t, priority } : t
  );
  notifyTaskListeners();
}

export function batchUpdateProductionTaskStatus(ids: string[], newStatus: ProductionTaskStatus) {
  const idSet = new Set(ids);
  productionTasksStore = productionTasksStore.map(t => 
    idSet.has(t.id) ? { ...t, status: newStatus } : t
  );
  notifyTaskListeners();
}

export function deleteProductionTask(id: string) {
  productionTasksStore = productionTasksStore.filter(t => t.id !== id);
  notifyTaskListeners();
}

export function reportProductionTaskProgress(id: string, progress: number, completedQuantity?: number) {
  productionTasksStore = productionTasksStore.map(t => {
    if (t.id !== id) return t;
    const finalProgress = Math.min(100, Math.max(0, progress));
    const isFinished = finalProgress >= 100;
    return {
      ...t,
      progress: finalProgress,
      completedQuantity: completedQuantity !== undefined ? completedQuantity : (isFinished ? t.requiredQuantity : t.completedQuantity),
      status: isFinished ? '已完成' : t.status
    };
  });
  notifyTaskListeners();
}

export function getOrders(): OrderItem[] {
  return ordersDataState;
}

export function updateOrders(newOrders: OrderItem[]) {
  ordersDataState = newOrders;
}

export function getOrderSchedulePlan(orderNo: string): Record<string, SchedulePlanItem> {
  return schedulePlanStore[orderNo] || {};
}

export function saveOrderSchedulePlan(orderNo: string, plans: Record<string, SchedulePlanItem>) {
  schedulePlanStore[orderNo] = {
    ...(schedulePlanStore[orderNo] || {}),
    ...plans
  };
}

export const recommendedOutsourceSuppliers = [
  { name: '精工精密五金实业有限公司', capability: 'CNC机加、精密车削、铣削' },
  { name: '顺达激光钣金制造厂', capability: '激光下料、数控折弯、焊接组装' },
  { name: '创捷电子科技代工厂', capability: 'SMT高速贴片、回流焊、整机组装' },
  { name: '宏发表面热处理有限公司', capability: '阳极氧化、发黑、喷粉喷漆' },
  { name: '中精线割特种加工部', capability: '快走丝、中走丝精密线割、放电打孔' }
];

export interface OutsourceTransferParams {
  taskId: string;
  outsourceQty: number;
  supplier: string;
  deliveryDate: string;
  unitPrice?: number;
  reason?: string;
  remark?: string;
}

export function transferProductionTaskToOutsource(params: OutsourceTransferParams): {
  success: boolean;
  message?: string;
  isFullDirectTransfer: boolean;
  updatedOriginalTask: ProductionTask;
  newOutsourceTask?: ProductionTask;
} {
  const target = productionTasksStore.find(t => t.id === params.taskId);
  if (!target) {
    return {
      success: false,
      message: '任务不存在',
      isFullDirectTransfer: false,
      updatedOriginalTask: null as any
    };
  }

  const requiredQty = target.requiredQuantity || 0;
  const completedQty = target.completedQuantity || 0;
  const maxOutsourceQty = Math.max(0, requiredQty - completedQty);

  if (params.outsourceQty <= 0 || params.outsourceQty > maxOutsourceQty) {
    return {
      success: false,
      message: `外协数量无效，超出可外协上限 ${maxOutsourceQty} 件`,
      isFullDirectTransfer: false,
      updatedOriginalTask: target
    };
  }

  // 场景 1：全额转外协 且 已生产数量为 0（尚未动工）
  if (completedQty === 0 && params.outsourceQty === requiredQty) {
    const updated: ProductionTask = {
      ...target,
      taskType: 'OUTSOURCE',
      workStationCode: 'WS-OUTSOURCE',
      workStationName: `【外协】${params.supplier}`,
      employee: '外协跟单员',
      position: '外协管理',
      outsourceSupplier: params.supplier,
      outsourceDeliveryDate: params.deliveryDate,
      outsourceUnitPrice: params.unitPrice,
      outsourceReason: params.reason,
      remark: params.remark ? `${target.remark || ''} [转外协: ${params.remark}]` : target.remark
    };
    productionTasksStore = productionTasksStore.map(t => t.id === target.id ? updated : t);
    notifyTaskListeners();
    return { success: true, isFullDirectTransfer: true, updatedOriginalTask: updated };
  }

  // 场景 2：部分转外协 或 已动工(completedQty > 0) -> 强制拆单保护历史
  const newOriginalRequired = requiredQty - params.outsourceQty;
  const originalUpdated: ProductionTask = {
    ...target,
    taskType: 'SELF',
    requiredQuantity: newOriginalRequired,
    outsourceSplittedQty: (target.outsourceSplittedQty || 0) + params.outsourceQty,
    progress: newOriginalRequired > 0 ? Math.min(100, Math.round((completedQty / newOriginalRequired) * 100)) : 100,
    status: (completedQty >= newOriginalRequired && newOriginalRequired > 0) ? '已完成' : target.status,
    remark: `${target.remark || ''} [已分流外协 ${params.outsourceQty} 件至 ${params.supplier}]`
  };

  const newOutsourceTask: ProductionTask = {
    ...target,
    id: `PT-OS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    seq: productionTasksStore.length + 1,
    taskCode: `${target.taskCode}-OS1`,
    taskName: `${target.taskName || target.opName || '工序'}(委外外协)`,
    taskType: 'OUTSOURCE',
    requiredQuantity: params.outsourceQty,
    completedQuantity: 0,
    progress: 0,
    status: '待下发',
    workStationCode: 'WS-OUTSOURCE',
    workStationName: `【外协】${params.supplier}`,
    employee: '外协跟单员',
    position: '外协管理',
    outsourceSupplier: params.supplier,
    outsourceDeliveryDate: params.deliveryDate,
    outsourceUnitPrice: params.unitPrice,
    outsourceReason: params.reason,
    sourceTaskId: target.id,
    remark: `源自自制任务 ${target.taskCode} 生产中途紧急委外拆分。${params.remark || ''}`
  };

  productionTasksStore = productionTasksStore.flatMap(t => {
    if (t.id === target.id) {
      return [originalUpdated, newOutsourceTask];
    }
    return [t];
  });

  notifyTaskListeners();
  return {
    success: true,
    isFullDirectTransfer: false,
    updatedOriginalTask: originalUpdated,
    newOutsourceTask
  };
}

