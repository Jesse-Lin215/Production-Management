import React, { useState } from 'react';
import type { BomNode } from '../types';
import { initialBomCompositionList } from '../data';
import { ChevronRight, ChevronDown, Package, Box, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

interface BomTreeProps {
  node: BomNode;
  activeNodeId: string;
  onSelect: (id: string) => void;
  checkedNodes: Set<string>;
  onCheckNode: (id: string, checked: boolean) => void;
  level?: number;
  hideCheckboxes?: boolean;
  categoryFilter?: string;
  key?: string | number;
}

export default function BomTree({ 
  node, 
  activeNodeId, 
  onSelect, 
  checkedNodes, 
  onCheckNode, 
  level = 0, 
  hideCheckboxes = false,
  categoryFilter = '全部'
}: BomTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const getNodeIcon = () => {
    switch (node.type) {
      case 'PRODUCT': return <Package className="w-4 h-4 text-blue-600" />;
      case 'SUBASSEMBLY': return <Box className="w-4 h-4 text-orange-500" />;
      case 'MATERIAL': return <Cpu className="w-4 h-4 text-emerald-600" />;
      default: return <Box className="w-4 h-4 text-slate-500" />;
    }
  };

  let category = '';
  if (node.type === 'PRODUCT' || node.name.includes('送板机') || node.name.includes('手机') || node.name.includes('网关')) {
    category = '成品';
  } else if (node.type === 'SUBASSEMBLY') {
    category = '半成品';
  } else {
    const comp = initialBomCompositionList.find(c => c.materialCode === node.code);
    if (comp && comp.category) {
      if (comp.category.includes('钣金')) category = '钣金件';
      else if (comp.category.includes('机加')) category = '机加件';
      else category = comp.category;
    } else {
      category = '钣金件';
    }
  }

  // Check if this node or any descendant matches the category filter
  const nodeMatchesCategory = (n: BomNode): boolean => {
    if (!categoryFilter || categoryFilter === '全部' || categoryFilter === '全部物料分类') return true;
    
    let nCat = '';
    if (n.type === 'PRODUCT' || n.name.includes('送板机') || n.name.includes('手机') || n.name.includes('网关')) {
      nCat = '成品';
    } else if (n.type === 'SUBASSEMBLY') {
      nCat = '半成品';
    } else {
      const c = initialBomCompositionList.find(item => item.materialCode === n.code);
      nCat = c?.category || '钣金件';
    }

    if (categoryFilter === '成品' && (nCat === '成品' || n.type === 'PRODUCT')) return true;
    if (categoryFilter === '半成品' && (nCat === '半成品' || n.type === 'SUBASSEMBLY')) return true;
    if (categoryFilter === '钣金件' && nCat.includes('钣金')) return true;
    if (categoryFilter === '机加件' && nCat.includes('机加')) return true;
    if (categoryFilter === '自制件' && (n.type === 'PRODUCT' || n.type === 'SUBASSEMBLY' || nCat.includes('自制') || nCat.includes('钣金'))) return true;
    if (categoryFilter === '采购件' && nCat.includes('采购')) return true;

    // Check descendants
    if (n.children && n.children.length > 0) {
      return n.children.some(child => nodeMatchesCategory(child));
    }
    return false;
  };

  const isVisible = nodeMatchesCategory(node);
  if (!isVisible) return null;

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded-md transition-all text-sm",
          activeNodeId === node.id ? "bg-blue-50/50 text-blue-700 font-semibold shadow-[inset_3px_0_0_0_#4f46e5]" : "text-slate-700 hover:bg-slate-50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          className={cn("p-0.5 rounded-sm hover:bg-slate-200 transition-colors", !hasChildren && "opacity-0 cursor-default")}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </button>
        
        {getNodeIcon()}
        
        {!hideCheckboxes && (
          <input
            type="checkbox"
            title="勾选此物料以生成独立子工单"
            className="ml-1.5 w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-[#1677ff] cursor-pointer accent-blue-600 shrink-0"
            checked={checkedNodes.has(node.id)}
            onChange={(e) => onCheckNode(node.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="flex flex-col ml-1 min-w-0 flex-1">
           <div className="flex items-center gap-2 min-w-0">
             <span className="truncate" title={`${node.code} ${node.name}`}>
               {node.name}
             </span>
             {category && (
               <span className="text-[10px] px-1.5 py-[1px] rounded bg-white text-slate-500 border border-slate-200 shrink-0 font-medium hidden sm:inline-flex">
                 {category}
               </span>
             )}
           </div>
           <span className="text-[10px] text-slate-400 leading-none mt-0.5 truncate">{node.code}</span>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <BomTree 
              key={child.id} 
              node={child} 
              activeNodeId={activeNodeId} 
              onSelect={onSelect} 
              checkedNodes={checkedNodes}
              onCheckNode={onCheckNode}
              level={level + 1} 
              hideCheckboxes={hideCheckboxes}
              categoryFilter={categoryFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
