import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { BomNode, Operation, ExecutionType, ReportingType } from '../types';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ArrowDown, 
  HelpCircle, 
  X, 
  Workflow, 
  Check,
  CloudLightning
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RoutingEditorProps {
  readOnly?: boolean;
  key?: string;
  node: BomNode;
  onChange: (operations: Operation[]) => void;
}

interface DependencyBlock {
  id: string;
  name: string;
  type: '普通' | '并行组';
  operations: string[]; // List of operation codes or IDs
  isCollapsed?: boolean;
}

export default function RoutingEditor({ node, onChange, readOnly }: RoutingEditorProps) {
  // Sync state when node changes
  const [ops, setOps] = useState<Operation[]>(node.operations);
  const [activeTab, setActiveTab] = useState<'composition' | 'dependency'>('dependency');
  
  // Custom dependency blocks synced dynamically
  const [blocks, setBlocks] = useState<DependencyBlock[]>([]);

  // Relationship between each sequential block (defaults to 'f to s')
  const [relations, setRelations] = useState<Record<string, 's to s' | 's to f' | 'f to f' | 'f to s'>>({});

  // Collapsed state for row 2 of block 2 to match "收起部分工序"
  const [isSecondRowCollapsed, setIsSecondRowCollapsed] = useState<boolean>(false);

  // Pool of all available operations for the sidebar
  const [availableOps, setAvailableOps] = useState<any[]>([]);

  // Autosave confirmation badge flash state
  const [isSavingFlash, setIsSavingFlash] = useState(false);

  useEffect(() => {
    setOps(node.operations);
    
    // Dynamically derive available operations from node's own operations
    const derivedOps = node.operations.map(op => ({
      code: op.opCode,
      name: op.opName
    }));
    setAvailableOps(derivedOps);

    // Distribute into elegant blocks dynamically based on node.operations
    const opCodes = node.operations.map(op => op.opCode);
    if (opCodes.length === 0) {
      setBlocks([]);
    } else if (opCodes.length === 6) {
      // Specifically for the 6 operations of 自动送板机: 
      // 1st: 编程下图 (OP-PGM)
      // Middle 4: CNC, 车床, 机加铣床, 亚克力、线割加工
      // Last: 攻牙 (OP-TAP)
      setBlocks([
        {
          id: 'block-1',
          name: '第 1 层工序块',
          type: '普通',
          operations: [opCodes[0]]
        },
        {
          id: 'block-2',
          name: `第 2 层工序块 (并行组) · 4 道工序`,
          type: '并行组',
          operations: [opCodes[1], opCodes[2], opCodes[3], opCodes[4]]
        },
        {
          id: 'block-3',
          name: '第 3 层工序块',
          type: '普通',
          operations: [opCodes[5]]
        }
      ]);
    } else if (opCodes.length === 1) {
      setBlocks([
        { id: 'block-1', name: '第 1 层工序块', type: '普通', operations: [opCodes[0]] }
      ]);
    } else if (opCodes.length === 2) {
      setBlocks([
        { id: 'block-1', name: '第 1 层工序块', type: '普通', operations: [opCodes[0]] },
        { id: 'block-2', name: '第 2 层工序块', type: '普通', operations: [opCodes[1]] }
      ]);
    } else {
      const first = opCodes[0];
      const last = opCodes[opCodes.length - 1];
      const middle = opCodes.slice(1, opCodes.length - 1);
      setBlocks([
        {
          id: 'block-1',
          name: '第 1 层工序块',
          type: '普通',
          operations: [first]
        },
        {
          id: 'block-2',
          name: `第 2 层工序块 (并行组) · ${middle.length} 道工序`,
          type: '并行组',
          operations: middle
        },
        {
          id: 'block-3',
          name: '第 3 层工序块',
          type: '普通',
          operations: [last]
        }
      ]);
    }
  }, [node.id, node.operations]);

  const commitChanges = (newOps: Operation[]) => {
    const numberedOps = newOps.map((op, idx) => ({ ...op, stepIdx: (idx + 1) }));
    setOps(numberedOps);
    onChange(numberedOps);
    triggerAutoSaveFlash();
  };

  const triggerAutoSaveFlash = () => {
    setIsSavingFlash(true);
    setTimeout(() => {
      setIsSavingFlash(false);
    }, 1200);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...ops];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    commitChanges(items);
  };

  const handleToggleEnabled = (opId: string) => {
    const newOps = ops.map(op => op.id === opId ? { ...op, isEnabled: !op.isEnabled } : op);
    commitChanges(newOps);
  };

  const handleChangeExecution = (opId: string, executionType: ExecutionType) => {
    const newOps = ops.map(op => op.id === opId ? { ...op, executionType } : op);
    commitChanges(newOps);
  };

  const handleChangeReporting = (opId: string, reportingType: ReportingType) => {
    const newOps = ops.map(op => op.id === opId ? { ...op, reportingType } : op);
    commitChanges(newOps);
  };

  const handleDelete = (opId: string) => {
    const newOps = ops.filter(op => op.id !== opId);
    commitChanges(newOps);
  };

  const handleAddOperation = () => {
    const newOp: Operation = {
      id: `op-new-${Date.now()}`,
      stepIdx: (ops.length + 1),
      opCode: 'OP-NEW',
      opName: '新工序',
      workCenter: '-',
      isEnabled: true,
      executionType: 'SELF',
      reportingType: 'PIECE'
    };
    commitChanges([...ops, newOp]);
  };

  // Add Operation Block
  const handleAddBlock = () => {
    const unassignedOpsCount = availableOps.filter(op => !blocks.some(b => b.operations.includes(op.code))).length;
    const emptyBlocksCount = blocks.filter(b => b.operations.length === 0).length;
    const allAssigned = availableOps.length > 0 && availableOps.every(op => blocks.some(b => b.operations.includes(op.code)));
    const reachedMaxBlocks = blocks.length >= availableOps.length;
    
    if (unassignedOpsCount <= emptyBlocksCount || allAssigned || reachedMaxBlocks) return;

    const newIndex = blocks.length + 1;
    const newBlock: DependencyBlock = {
      id: `block-${Date.now()}`,
      name: `第 ${newIndex} 层工序块`,
      type: '普通',
      operations: []
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    triggerAutoSaveFlash();
  };

  // Delete Operation Block
  const handleDeleteBlock = (blockId: string) => {
    const updated = blocks.filter(b => b.id !== blockId);
    setBlocks(updated);
    triggerAutoSaveFlash();
  };

  // Assign operation to block
  const handleAssignOpToBlock = (blockId: string, opCode: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        // First, clean up this opCode from all other blocks
        let opsInBlock = b.operations.filter(op => op !== opCode);
        
        // If it's the target block, add the opCode
        if (b.id === blockId) {
          if (!opsInBlock.includes(opCode)) {
            opsInBlock = [...opsInBlock, opCode];
          }
        }
        return { ...b, operations: opsInBlock };
      });
      triggerAutoSaveFlash();
      return updated;
    });
  };

  // Drag and drop sorting/moving logic
  const handleMoveOpBetweenBlocks = (opCode: string, fromBlockId: string, toBlockId: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        // First, clean up from all blocks
        let opsInBlock = b.operations.filter(op => op !== opCode);
        
        // If it's the target block, add it
        if (b.id === toBlockId) {
          if (!opsInBlock.includes(opCode)) {
            opsInBlock = [...opsInBlock, opCode];
          }
        }
        return { ...b, operations: opsInBlock };
      });
      triggerAutoSaveFlash();
      return updated;
    });
  };

  // Remove operation from block
  const handleRemoveOpFromBlock = (blockId: string, opCode: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id === blockId) {
          return { ...b, operations: b.operations.filter(op => op !== opCode) };
        }
        return b;
      });
      triggerAutoSaveFlash();
      return updated;
    });
  };

  // Toggle Block Type
  const handleToggleBlockType = (blockId: string, type: '普通' | '并行组') => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id === blockId) {
          return { 
            ...b, 
            type,
            name: type === '并行组' 
              ? `第 ${blocks.indexOf(b) + 1} 层工序块 (并行组) · ${b.operations.length} 道工序`
              : `第 ${blocks.indexOf(b) + 1} 层工序块`
          };
        }
        return b;
      });
      triggerAutoSaveFlash();
      return updated;
    });
  };

  // Drag-and-drop state trackers for UI highlighted drop zones
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      
      {/* Premium Header: Strictly displays the material info, with zero prefixes */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <h1 className="text-sm md:text-base font-bold text-slate-900 font-mono tracking-tight select-all">
            {node.code} <span className="text-slate-300 font-light mx-1">|</span> {node.name}
          </h1>
          {/* Subtle instant autosave tag */}
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full transition-all duration-350 select-none",
            isSavingFlash 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100 scale-100 opacity-100" 
              : "bg-slate-50 text-slate-400 border border-slate-100/50 opacity-75"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", isSavingFlash && "animate-ping")} />
            <span>{isSavingFlash ? "实时已保存" : "修改自动保存"}</span>
          </div>
        </div>

        {/* Tab & Action Area */}
        <div className="flex items-center gap-4">
          {/* Tab Selector */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100/80">
            <button
              onClick={() => setActiveTab('composition')}
              className={cn(
                "px-3.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                activeTab === 'composition' 
                  ? "bg-white text-[#1677ff] shadow-2xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              组成工序
            </button>
            <button
              onClick={() => setActiveTab('dependency')}
              className={cn(
                "px-3.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                activeTab === 'dependency' 
                  ? "bg-white text-[#1677ff] shadow-2xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              工序依赖结构
            </button>
          </div>

          {/* New block trigger - relocated to header for maximum spatial saving */}
          {activeTab === 'dependency' && (() => {
            const unassignedOpsCount = availableOps.filter(op => !blocks.some(b => b.operations.includes(op.code))).length;
            const emptyBlocksCount = blocks.filter(b => b.operations.length === 0).length;
            const allAssigned = availableOps.length > 0 && availableOps.every(op => blocks.some(b => b.operations.includes(op.code)));
            const reachedMaxBlocks = blocks.length >= availableOps.length;
            const isDisabled = allAssigned || reachedMaxBlocks || (unassignedOpsCount <= emptyBlocksCount);

            return (
              <button
                onClick={handleAddBlock}
                disabled={isDisabled}
                title={isDisabled ? (unassignedOpsCount <= emptyBlocksCount ? "待设置工序数不大于现有的空工序块数，暂不允许新增" : "工序已全部加入工序块，或工序块总数已达上限") : "新增工序块"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0",
                  isDisabled
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none opacity-70"
                    : "bg-[#1677ff] text-white hover:bg-blue-600 cursor-pointer shadow-sm"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                新增工序块
              </button>
            );
          })()}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        
        {/* TAB 1: 组成工序 */}
        {activeTab === 'composition' && (
          <div className="flex-1 overflow-auto p-4 md:p-5">
            <div className="w-full max-w-full">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-medium text-slate-400">
                  可直接拖拽左侧排序号重新规划工艺工序顺序
                </span>
                <button
                  onClick={handleAddOperation}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#1677ff] text-white text-[11px] font-bold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  新增工序
                </button>
              </div>

              <div className={cn("bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto select-none", readOnly && "pointer-events-none opacity-80 cursor-not-allowed")}>
                <div className="min-w-[900px]">
                  {/* Table Header */}
                  <div className="px-5 py-2.5 border-b border-slate-150 bg-slate-50/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider grid grid-cols-[80px_1.2fr_1.8fr_1.5fr_110px_110px_1.5fr_60px] gap-3 items-center shrink-0 text-center">
                    <div>序号</div>
                    <div>工序编码</div>
                    <div>工序名称</div>
                    <div>工作中心</div>
                    <div>报工类型</div>
                    <div>加工类型</div>
                    <div>备注</div>
                    <div>启用</div>
                  </div>

                  {ops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                       <Info className="w-8 h-8 mb-1.5 opacity-30" />
                       <p className="text-xs">暂无工序内容，请点击右上角新增。</p>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="operations-list">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="flex flex-col divide-y divide-slate-100"
                          >
                            {ops.map((op, index) => (
                              // @ts-ignore
                              <Draggable key={op.id} draggableId={op.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "group grid grid-cols-[80px_1.2fr_1.8fr_1.5fr_110px_110px_1.5fr_60px] gap-3 items-center px-5 py-2 transition-colors cursor-move bg-white",
                                      snapshot.isDragging ? "shadow-md border-y border-blue-200 bg-blue-50/10 z-50" : "hover:bg-slate-50/30 border-y border-transparent",
                                      !op.isEnabled && "opacity-50 grayscale bg-slate-50/20"
                                    )}
                                  >
                                    {/* Drag Handle */}
                                    <div className="flex items-center justify-center gap-1.5">
                                       {!readOnly && (
                                       <div 
                                         {...provided.dragHandleProps}
                                         className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing"
                                       >
                                         <GripVertical className="w-4 h-4" />
                                       </div>
                                       )}
                                       <span className="text-xs font-mono font-semibold text-slate-500 w-5 text-center">{op.stepIdx}</span>
                                    </div>

                                    {/* Code */}
                                    <div>
                                       <input 
                                         value={op.opCode} 
                                         onChange={(e) => {
                                           const val = e.target.value;
                                           const newOps = ops.map(o => o.id === op.id ? { ...o, opCode: val } : o);
                                           setOps(newOps);
                                           onChange(newOps);
                                         }}
                                         className="text-center text-xs font-mono font-bold text-[#1677ff] bg-transparent w-full outline-none border-b border-transparent focus:border-blue-400 transition-colors py-0.5"
                                       />
                                    </div>

                                    {/* Name */}
                                    <div>
                                      <input 
                                         value={op.opName} 
                                         onChange={(e) => {
                                           const val = e.target.value;
                                           const newOps = ops.map(o => o.id === op.id ? { ...o, opName: val } : o);
                                           setOps(newOps);
                                           onChange(newOps);
                                         }}
                                         className="text-center text-xs text-slate-700 bg-transparent w-full outline-none border-b border-transparent focus:border-blue-400 transition-colors py-0.5 font-semibold"
                                       />
                                    </div>

                                    {/* Work Center */}
                                    <div className="text-center text-xs text-slate-500 truncate">
                                      {op.workCenter || '未指定'}
                                    </div>

                                    {/* Reporting Type */}
                                    <div className="flex justify-center">
                                      <select
                                        value={op.reportingType || 'PIECE'}
                                        onChange={(e) => handleChangeReporting(op.id, e.target.value as ReportingType)}
                                        className="text-[11px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-medium cursor-pointer outline-none"
                                      >
                                        <option value="PIECE">计件报工</option>
                                        <option value="TIME">计时报工</option>
                                      </select>
                                    </div>

                                    {/* Execution Type */}
                                    <div className="flex justify-center">
                                      <select
                                        value={op.executionType}
                                        onChange={(e) => handleChangeExecution(op.id, e.target.value as ExecutionType)}
                                        className={cn(
                                          "text-[10px] px-1.5 py-0.5 rounded border font-bold cursor-pointer outline-none transition-colors",
                                          op.executionType === 'SELF' 
                                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                                            : "bg-amber-50 border-amber-200 text-amber-700"
                                        )}
                                      >
                                        <option value="SELF">自制</option>
                                        <option value="OUTSOURCE">委外</option>
                                      </select>
                                    </div>

                                    {/* Remark */}
                                    <div>
                                      <input 
                                         value={op.remark || ''} 
                                         placeholder="-"
                                         onChange={(e) => {
                                           const val = e.target.value;
                                           const newOps = ops.map(o => o.id === op.id ? { ...o, remark: val } : o);
                                           setOps(newOps);
                                           onChange(newOps);
                                         }}
                                         className="text-center text-xs text-slate-400 bg-transparent w-full outline-none border-b border-transparent focus:border-blue-400 transition-colors py-0.5"
                                       />
                                    </div>

                                    {/* Enabled Toggle & Actions */}
                                    <div className="flex items-center justify-between">
                                      <button 
                                        onClick={() => handleToggleEnabled(op.id)}
                                        className={cn(
                                          "w-7 h-3.5 rounded-full relative transition-colors shrink-0",
                                          op.isEnabled ? "bg-emerald-500" : "bg-slate-200"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-transform",
                                          op.isEnabled ? "right-0.5" : "left-0.5"
                                        )} />
                                      </button>

                                      {!readOnly && (
                                      <button 
                                        onClick={() => handleDelete(op.id)}
                                        className="text-slate-300 hover:text-red-500 p-0.5 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                        title="删除"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 工序依赖结构 (Native highly precise fluid layouts with 100% drag and drop) */}
        {activeTab === 'dependency' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20">
            {/* 顶层提示语横幅：详细解释工序依赖结构页面的功能与使用指南 */}
            <div className="mx-3 mt-3 px-3.5 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 shrink-0 shadow-2xs">
              <Info className="w-4 h-4 text-[#1677ff] shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-1 leading-snug">
                <div>
                  <span className="font-bold text-blue-950">【工序依赖结构说明】</span>
                  <span className="text-blue-800 text-[11.5px] ml-1">
                    本页面用于配置加工此物料时的<strong>前后道工序流转层级与约束规则</strong>。同层级支持<strong>多道工序并行加工</strong>，不同层级间通过<strong>完成-开始(FS)/开始-开始(SS)</strong>等时序约束控制，直接驱动后续排产计划与甘特图时序逻辑。
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-blue-700 font-medium">
                  <span className="px-2 py-0.5 bg-white/90 border border-blue-200 rounded text-[10.5px]">
                    左侧拖拽到右侧层级
                  </span>
                  <span className="px-2 py-0.5 bg-white/90 border border-blue-200 rounded text-[10.5px]">
                    支持同层并行 / 跨层串行
                  </span>
                </div>
              </div>
            </div>

            {/* Split view: Left available pools, Right drop zones */}
            <div className="flex-1 flex min-h-0 p-3 gap-4 w-full">
              
              {/* LEFT SIDEBAR: Available pools (Support dragging directly) */}
              <div className="w-[200px] border border-slate-200 rounded-xl bg-white shadow-3xs p-3 flex flex-col shrink-0 min-h-0 select-none">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">可选工序池</span>
                  <span className="text-[9px] text-slate-400">长按直接拖拽</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3 leading-tight">
                  将工序卡片<strong>直接拖拽到右侧对应的层级工序块中</strong>即可添加。
                </p>

                {/* Left Pool container */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
                  {availableOps.map((op) => {
                    // Check if assigned anywhere
                    const assignedBlocks = blocks.filter(b => b.operations.includes(op.code));

                    return (
                      <div
                        key={op.code}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", op.code);
                          e.dataTransfer.setData("dragSource", "pool");
                        }}
                        className={cn(
                          "group border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-between shadow-3xs hover:border-blue-400 hover:shadow-2xs transition-all cursor-grab active:cursor-grabbing hover:bg-slate-50/50",
                          assignedBlocks.length > 0 && "bg-slate-50/40 border-slate-150 text-slate-500"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-mono font-bold text-blue-600 tracking-wide">
                            {op.code}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {op.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {assignedBlocks.length > 0 ? (
                            <span className="text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-bold scale-90">
                              已用
                            </span>
                          ) : (
                            <span className="text-[8px] bg-blue-50 text-blue-500 px-1 py-0.5 rounded font-bold scale-90 group-hover:bg-blue-100 transition-all">
                              待放
                            </span>
                          )}
                          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT FLOW PANEL: Hierarchy drop zones */}
              <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-3xs p-4 flex flex-col min-h-0 select-none">
                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">工序依赖结构</span>
                    <span className="text-[9px] bg-blue-50 text-[#1677ff] font-bold px-1.5 py-0.5 rounded-full">
                      支持跨层级双向拖拽
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span>同一工序块内为并行执行，各工序块之间按时序连接关系依次流转</span>
                  </div>
                </div>

                {/* Scrollable Flow Sequence */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-0">
                  {blocks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                      <Workflow className="w-9 h-9 mb-1.5 opacity-20" />
                      <p className="text-xs">暂无层级，点击右上方「新增工序块」开始搭建工艺流</p>
                    </div>
                  ) : (
                    blocks.map((block, idx) => {
                      const isFirst = idx === 0;
                      const blockNumber = idx + 1;
                      const isHovered = dragOverBlockId === block.id;

                      return (
                        <div 
                          key={block.id} 
                          className="flex flex-col items-stretch"
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverBlockId !== block.id) {
                              setDragOverBlockId(block.id);
                            }
                          }}
                          onDragLeave={() => {
                            setDragOverBlockId(null);
                          }}
                          onDrop={(e) => {
                            setDragOverBlockId(null);
                            const code = e.dataTransfer.getData("text/plain");
                            const source = e.dataTransfer.getData("dragSource");
                            
                            if (source === "pool") {
                              handleAssignOpToBlock(block.id, code);
                            } else if (source && source !== block.id) {
                              handleMoveOpBetweenBlocks(code, source, block.id);
                            }
                          }}
                        >
                          {/* Beautiful Arrow Connections between layers with dynamic relationship selector */}
                          {!isFirst && (
                            <div className="py-3 flex flex-col items-center justify-center relative select-none">
                              {/* Central continuous dashed line */}
                              <div className="h-8 border-l-2 border-dashed border-slate-300 absolute"></div>
                              
                              {/* Overlay pill containing radio group */}
                              <div className="z-10 flex items-center gap-1 bg-white p-0.5 rounded-full border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors text-[10px]">
                                {['s to s', 's to f', 'f to f', 'f to s'].map(opt => {
                                  const rel = relations[block.id] || 'f to s';
                                  const isSelected = rel === opt;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        setRelations(prev => ({ ...prev, [block.id]: opt as any }));
                                        triggerAutoSaveFlash();
                                      }}
                                      className={cn(
                                        "px-2 py-0.5 rounded-full font-mono font-extrabold uppercase transition-all duration-150 cursor-pointer text-[8.5px] tracking-wide",
                                        isSelected 
                                          ? "bg-[#1677ff] text-white shadow-3xs" 
                                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Block Zone Panel */}
                          <div className={cn(
                            "border rounded-xl transition-all duration-200 bg-[#fbfcfd]/60",
                            isHovered 
                              ? "border-blue-500 bg-blue-50/20 shadow-xs scale-[1.005] ring-2 ring-blue-100" 
                              : "border-slate-200 shadow-3xs hover:border-slate-300"
                          )}>
                            
                            {/* Block Header Toolbar */}
                            <div className="px-3.5 py-2 bg-[#f4f6f8] border-b border-slate-150 rounded-t-xl flex items-center justify-between gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-extrabold flex items-center justify-center select-none shadow-3xs">
                                  {blockNumber}
                                </span>
                                <span className="font-bold text-slate-800 text-[11px]">
                                  第 {blockNumber} 层工序组
                                </span>
                                {block.operations.length > 1 ? (
                                  <span className="text-[9px] bg-blue-50 text-[#1677ff] border border-blue-200/60 font-bold px-1.5 py-0.25 rounded-full">
                                    并行组 · {block.operations.length}道工序
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 font-bold px-1.5 py-0.25 rounded-full">
                                    串行
                                  </span>
                                )}
                              </div>

                              {/* Tool buttons */}
                              <div className="flex items-center gap-2">
                                {/* Trash */}
                                <button
                                  onClick={() => handleDeleteBlock(block.id)}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-slate-200 shadow-4xs transition-all cursor-pointer"
                                  title="移除此层"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Drop card area */}
                            <div className="p-3 bg-white rounded-b-xl min-h-[52px] flex flex-col justify-center">
                              {block.operations.length === 0 ? (
                                <div className="py-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/30">
                                  <span className="font-medium text-slate-500">将左侧工序卡片拖拽到此处添加</span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 py-1">
                                  {block.operations.map((opCode, cardIdx) => {
                                    const opDetail = availableOps.find(o => o.code === opCode);
                                    return (
                                      <div key={opCode} className="flex items-center gap-2 shrink-0">
                                        {cardIdx > 0 && block.operations.length > 1 && (
                                          <span className="text-[8.5px] text-[#1677ff] font-extrabold bg-[#e6f4ff] border border-blue-200 px-1 py-0.5 rounded">
                                            并行
                                          </span>
                                        )}
                                        <div 
                                          draggable={true}
                                          onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = "move";
                                            e.dataTransfer.setData("text/plain", opCode);
                                            e.dataTransfer.setData("dragSource", block.id);
                                          }}
                                          className="border border-slate-200 rounded-lg p-2.5 w-[140px] bg-white shadow-4xs hover:border-blue-400 flex items-center justify-between group/card transition-all cursor-grab active:cursor-grabbing"
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-mono font-bold text-blue-600">{opCode}</span>
                                            <span className="text-[11px] font-bold text-slate-800 truncate max-w-[90px]">
                                              {opDetail?.name || '未知工序'}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleRemoveOpFromBlock(block.id, opCode)}
                                            className="text-slate-300 hover:text-red-500 rounded p-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer"
                                            title="从工序块移除"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
