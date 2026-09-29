import React, { useState } from 'react';
import type { BomNode } from '../types';
import { initialBomCompositionList } from '../data';
import { Package, CalendarDays, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface RoutingSchedulingPanelProps {
  bomData: BomNode;
}

export default function RoutingSchedulingPanel({ bomData }: RoutingSchedulingPanelProps) {
  const [filterType, setFilterType] = useState<'全部' | '钣金件' | '机加件'>('全部');

  // Flatten BOM tree
  const flattenBom = (node: BomNode): BomNode[] => {
    return [node, ...(node.children || []).flatMap(flattenBom)];
  };
  const allNodes = flattenBom(bomData);

  const filteredNodes = allNodes.filter(node => {
     if (filterType === '全部') return true;
     const comp = initialBomCompositionList.find(c => c.materialCode === node.code);
     const cat = comp?.category || '';
     if (filterType === '钣金件' && cat.includes('钣金')) return true;
     if (filterType === '机加件' && cat.includes('机加')) return true;
     return false;
  });

  // Group nodes by their defined routine
  const routingGroups = new Map<string, BomNode[]>();
  filteredNodes.forEach(node => {
     const ops = (node.operations || []).filter(op => op.isEnabled);
     if (ops.length === 0) return;
     const routingStr = ops.map(op => op.opName).join(' ➔ ');
     if (!routingGroups.has(routingStr)) {
       routingGroups.set(routingStr, []);
     }
     routingGroups.get(routingStr)!.push(node);
  });

  return (
    <div className="flex-1 w-full h-full min-h-0 bg-slate-50 overflow-y-auto pt-4 pb-12 px-6">
       <div className="max-w-[1500px] mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <div className="px-2 text-slate-400">
                   <Filter className="w-4 h-4" />
                </div>
                {(['全部', '钣金件', '机加件'] as const).map(type => (
                   <button
                     key={type}
                     onClick={() => setFilterType(type)}
                     className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                        filterType === type 
                          ? "bg-blue-50 text-blue-700 font-bold" 
                          : "text-slate-600 hover:text-slate-900 bg-transparent"
                     )}
                   >
                     {type}
                   </button>
                ))}
             </div>
          </div>

          <div className="space-y-8">
             {Array.from(routingGroups.entries()).map(([routingName, nodes]) => (
                 <RoutingGroupBlock key={routingName} routingName={routingName} nodes={nodes} />
             ))}
             {routingGroups.size === 0 && (
               <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-lg border border-slate-200">
                  <Package className="w-12 h-12 mb-4 opacity-20" />
                  <p>暂无符合排产条件的物料</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
}

function RoutingGroupBlock({ routingName, nodes }: { routingName: string, nodes: BomNode[], key?: string | number }) {
   const [activeOpIndex, setActiveOpIndex] = useState(0);

   const firstNodeOps = (nodes[0]?.operations || []).filter(op => op.isEnabled);

   return (
      <div className="bg-white border text-left border-slate-200 rounded-lg shadow-sm overflow-hidden">
         <div className="bg-slate-100/50 px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
               <div className="font-bold text-slate-800 text-[15px] flex items-center flex-wrap gap-x-2 gap-y-2">
                  <span className="text-slate-500 font-normal">工艺路线：</span>
                  <div className="flex items-center gap-1 flex-wrap">
                     {firstNodeOps.map((op, idx) => (
                        <div key={idx} className="flex items-center font-normal">
                           <button
                              onClick={() => setActiveOpIndex(idx)}
                              className={cn(
                                 "px-2.5 py-1 rounded-md text-[13px] transition-colors flex items-center gap-1.5 border",
                                 activeOpIndex === idx 
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm font-semibold" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                              )}
                           >
                              <span className={cn(
                                 "w-4 h-4 rounded-[3px] text-[10px] flex items-center justify-center font-mono opacity-90",
                                 activeOpIndex === idx ? "bg-[#1677ff] text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                 {op.stepIdx}
                              </span>
                              {op.opName}
                           </button>
                           {idx < firstNodeOps.length - 1 && (
                              <span className="text-slate-300 mx-1.5">➔</span>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
               <p className="text-xs text-slate-500 ml-0.5">该路线下包含 {nodes.length} 种物料</p>
            </div>
            <button 
              className="px-4 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-semibold rounded hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm whitespace-nowrap self-start xl:self-auto shrink-0"
              title="将相同工艺路线下的物料打包，合并成一张生产排产单下发，以减少工作站换线时间和提升成批加工效率"
            >
               合并下达排产单
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1500px]">
               <thead className="bg-slate-50/50 relative z-10 sticky top-0 shadow-sm border-b border-slate-200">
                  <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                     <th className="px-6 py-3.5 text-center">物料信息</th>
                     <th className="px-6 py-3.5 text-center">物料分类</th>
                     <th className="px-6 py-3.5 text-center">排产单号</th>
                     <th className="px-6 py-3.5 text-center">报工方式</th>
                     <th className="px-6 py-3.5 text-center">工作站编码</th>
                     <th className="px-6 py-3.5 text-center">工作站名称</th>
                     <th className="px-6 py-3.5 text-center">岗位</th>
                     <th className="px-6 py-3.5 text-center">员工</th>
                     <th className="px-6 py-3.5 text-center">计划排产数量</th>
                     <th className="px-6 py-3.5 text-center">已计划数量</th>
                     <th className="px-6 py-3.5 text-center">已生产数量</th>
                     <th className="px-6 py-3.5 text-center">计划开始生产时间</th>
                     <th className="px-6 py-3.5 text-center pr-8">预计完成时间</th>
                     <th className="px-6 py-3.5 text-center">备注</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {nodes.map((n, nodeIdx) => {
                     const comp = initialBomCompositionList.find(c => c.materialCode === n.code);
                     let category = '-';
                     if (comp) {
                        if (comp.category.includes('钣金')) category = '钣金件';
                        else if (comp.category.includes('机加')) category = '机加件';
                     }
                     const enabledOps = (n.operations || []).filter(op => op.isEnabled);
                     const op = enabledOps[activeOpIndex];
                     
                     if (!op) return null;
                     
                     const orderId = `PO-202606-${nodeIdx.toString().padStart(3, '0')}`;
                     
                     return (
                        <tr key={`${n.id}-${op.id}`} className="hover:bg-slate-50 transition-colors group text-[13px] text-slate-600">
                           <td className="px-6 py-4 align-top border-r border-slate-100 bg-white">
                              <div className="font-medium text-slate-800">{n.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{n.code}</div>
                           </td>
                           <td className="px-6 py-4 text-center align-top border-r border-slate-100 bg-white font-medium">
                              {category}
                           </td>

                           <td className="px-6 py-4 align-top border-x border-slate-100 bg-white">
                              <input type="text" defaultValue={orderId} className="w-[120px] text-[13px] border border-transparent hover:border-slate-300 rounded px-2 py-1.5 outline-none focus:bg-white focus:border-[#1677ff] bg-slate-50 transition-colors placeholder:text-slate-300 font-mono text-center mx-auto block" placeholder="排产单号" />
                           </td>

                           {/* Reporting Type */}
                           <td className="px-6 py-4 text-center">
                              <div className="flex justify-center text-[12px] font-medium text-slate-600">
                                 {op.reportingType === 'TIME' ? '计时' : '计件'}
                              </div>
                           </td>

                           <td className="px-6 py-3 text-center font-mono text-xs">
                              <input type="text" defaultValue={op.workCenterCode || ''} className="w-[100px] text-[13px] border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-transparent hover:bg-white transition-colors text-center mx-auto block placeholder:text-slate-300" placeholder="编码" />
                           </td>
                           <td className="px-6 py-3 text-center">
                              <input type="text" defaultValue={op.workCenter || ''} className="w-[120px] text-[13px] border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-transparent hover:bg-white transition-colors text-center mx-auto block placeholder:text-slate-300" placeholder="名称" />
                           </td>
                           <td className="px-6 py-3 text-center text-xs text-slate-500">操作工</td>
                           <td className="px-6 py-3 text-center">
                              <select className="text-[12px] border border-transparent hover:border-slate-300 rounded px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:border-[#1677ff] outline-none w-[100px] text-center">
                                 <option>请选择员工</option>
                                 <option>张师傅</option>
                                 <option>李师傅</option>
                                 <option>王师傅</option>
                              </select>
                           </td>
                           
                           {/* Quantities */}
                           <td className="px-6 py-4 align-top border-x border-slate-100 bg-white text-center">
                              <div className="flex items-center justify-center gap-1">
                                 <input type="number" defaultValue={comp?.totalDemand || 1} className="w-[60px] font-mono text-[13px] border border-blue-200 hover:border-blue-400 rounded px-1 py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-blue-50/50 transition-colors text-center font-bold text-blue-700 shadow-xs" title="本次计划排产数量" />
                                 <span className="text-xs text-slate-500 whitespace-nowrap">{comp?.unit || '件'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 align-top border-x border-slate-100 bg-white text-center">
                              <div className="w-[70px] mx-auto text-emerald-600 font-mono text-[13px] font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 shadow-2xs whitespace-nowrap" title="已计划数量">
                                 0 <span className="text-[10px] font-normal text-emerald-500">已计</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 align-top border-r border-slate-100 bg-white text-center">
                              <span className="font-mono text-slate-400">0</span>
                           </td>

                           <td className="px-6 py-3 text-center">
                              <input type="datetime-local" defaultValue="2026-06-10T08:00" className="w-[150px] text-[12px] border border-transparent hover:border-slate-300 rounded px-1 max-w-full py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-transparent hover:bg-white transition-colors mx-auto block" />
                           </td>
                           <td className="px-6 py-3 text-center pr-8">
                              <input type="datetime-local" defaultValue="2026-06-10T12:00" className="w-[150px] text-[12px] border border-transparent hover:border-slate-300 rounded px-1 max-w-full py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-transparent hover:bg-white transition-colors mx-auto block" />
                           </td>
                           <td className="px-6 py-3 text-center">
                              <input type="text" defaultValue={op.remark || ''} className="w-[100px] text-[13px] border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:bg-white focus:border-[#1677ff] bg-transparent hover:bg-white transition-colors text-center mx-auto block placeholder:text-slate-300" placeholder="备注" />
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
   )
}
