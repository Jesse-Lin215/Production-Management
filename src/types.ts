export type NodeType = 'PRODUCT' | 'MATERIAL' | 'SUBASSEMBLY';
export type ExecutionType = 'SELF' | 'OUTSOURCE';
export type ReportingType = 'TIME' | 'PIECE';

export interface Operation {
  id: string;
  stepIdx: number;
  opCode: string;
  opName: string;
  workCenterCode?: string; // e.g. WS-01
  workCenter: string; // The selected work center name
  equipmentCode?: string;
  equipmentName?: string; // e.g. 设备1
  isEnabled: boolean; // 启用/停用
  executionType: ExecutionType; // 自制/委外
  reportingType?: ReportingType; // 计时/计件
  supplierName?: string; // 委外/外协协作供应商
  remark?: string; // 备注
}

export interface BomNode {
  id: string;
  type: NodeType;
  code: string;
  name: string;
  children?: BomNode[];
  operations: Operation[];
}

export type TaskPriority = '紧急' | '高' | '中' | '低';
export type TaskStatus = '未下发' | '已下发' | '待生产' | '生产中' | '进行中' | '已完成';
export type ProductionTaskStatus = '待下发' | '待生产' | '生产中' | '暂停' | '取消' | '作废' | '已完成';

export interface SchedulePlanItem {
  id: string;
  nodeId: string;
  opId: string;
  materialCode?: string;
  materialName?: string;
  opName?: string;
  stepIdx?: number;
  scheduledQuantity: number;
  workCenterCode?: string;
  workCenterName?: string;
  equipmentCode?: string; // 设备编号
  equipmentName?: string; // 设备名称
  position?: string;
  employee?: string;
  plannedStartTime?: string;
  estimatedEndTime?: string;
  reportingType?: ReportingType;
  remark?: string;
  isScheduled?: boolean;
  isDispatched?: boolean; // 是否已下发生产任务 (true: 已下发, false: 未下发)
  isSplit?: boolean;
  parentPlanId?: string;
  subTag?: string;
}

export interface GeneratedTask {
  id: string;
  nodeId: string;
  materialCode: string;
  materialName: string;
  category: string;
  taskCode: string;
  
  opId: string;
  opName: string;
  priority: TaskPriority;
  reportingType: 'TIME' | 'PIECE';
  executionType: 'SELF' | 'OUTSOURCE';
  workCenterCode: string;
  workCenterName: string;
  equipmentCode?: string; // 设备编号
  equipmentName?: string; // 设备名称
  
  position: string;
  employee: string;
  requiredQuantity: number; // 排产数量 (从第四页面继承)
  completedQuantity: number;
  progress: number;
  actualStartTime: string;
  actualEndTime: string;
  plannedStartTime: string;
  estimatedEndTime: string;
  remark: string;
  
  isDispatched: boolean; // false: 未下发任务, true: 已下发任务
  isCancelled?: boolean; // 是否已取消
  isSplit?: boolean; // 是否由父任务拆分而来
  parentTaskId?: string; // 父任务ID
  subTag?: string; // 拆分标识 (例如: A工作站 / 批次1)

  // 外协拓展字段
  taskType?: 'SELF' | 'OUTSOURCE';
  outsourceSupplier?: string;
  outsourceDeliveryDate?: string;
  outsourceUnitPrice?: number;
  outsourceReason?: string;
  outsourceSplittedQty?: number;
  sourceTaskId?: string;
}

export interface ProductionTask {
  id: string;
  seq?: number;
  taskCode: string;
  taskName?: string;
  priority?: TaskPriority;
  salesOrder?: string;
  opName?: string;
  operationName?: string;
  materialName?: string;
  moNo?: string;
  workStationCode?: string;
  workStationName?: string;
  employee?: string;
  position?: string;
  progress?: number;
  plannedStartTime?: string;
  plannedEndTime?: string;
  estimatedEndTime?: string;
  status: ProductionTaskStatus;
  requiredQuantity?: number;
  completedQuantity?: number;
  remark?: string;
  reportingType?: 'TIME' | 'PIECE' | '进度报工' | '计件报工';
  reportType?: string;

  // 外协拓展字段
  taskType?: 'SELF' | 'OUTSOURCE';
  outsourceSupplier?: string;
  outsourceDeliveryDate?: string;
  outsourceUnitPrice?: number;
  outsourceReason?: string;
  outsourceSplittedQty?: number;
  sourceTaskId?: string;
}

export interface BomCompositionItem {
  id: string;
  sortIdx: number;
  itemSeq: number;
  materialCode: string;
  materialName: string;
  bomVersion: string;
  imageUrl: string;
  category: string;
  businessAttr: string;
  specification: string;
  brand: string;
  inventory: number;
  unit: string;
  standardUsage: number;
  totalDemand: number;
  scrapRate: number;
  remark: string;
}

export interface SalesOrderItemBreakdown {
  orderNo: string;
  customer: string;
  lineNo?: number;
  orderQuantity: number;
  productionQuantity: number;
  planDeliveryDate?: string;
  remark?: string;
}

export interface SalesOrderProduct {
  id: string;
  lineNo: number; // 销售订单行号
  productCode: string; // 产品编码
  productName: string; // 产品名称
  category: string; // 产品分类
  specification: string; // 规格型号
  routingName: string; // 工艺路线
  bomVersion: string; // BOM版本
  unit: string; // 计量单位
  orderQuantity: number; // 销售订单订购数量（多订单时为汇总数量）
  productionQuantity: number; // 本次计划工单生产数量（允许用户修改）
  customer?: string;
  planDeliveryDate?: string;
  startDate?: string;
  endDate?: string;
  remark?: string;
  orderBreakdown?: SalesOrderItemBreakdown[]; // 多选销售订单时对应各单的明细及数量
}

export interface SalesOrder {
  orderNo: string;
  customer: string;
  orderDate: string;
  planDeliveryDate: string;
  startDate: string;
  endDate: string;
  status: string;
  products: SalesOrderProduct[];
}
