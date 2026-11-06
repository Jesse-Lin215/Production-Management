import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import OrderManagement from './pages/OrderManagement';
import OrderWizard from './pages/OrderWizard';
import OrderDetails from './pages/OrderDetails';
import TaskDetails from './pages/TaskDetails';
import ProductionTasks from './pages/ProductionTasks';
import OutsourcingOrders from './pages/OutsourcingOrders';
import OutsourcingWizard from './pages/OutsourcingWizard';
import OutsourcingDetails from './pages/OutsourcingDetails';
import OutsourcingApplications from './pages/OutsourcingApplications';

type PageState = 
  | { type: 'list' }
  | { type: 'tasks' }
  | { type: 'wizard' }
  | { type: 'details', orderNo: string }
  | { type: 'task-details', taskCode: string, taskData?: any, orderNo?: string, fromPage?: PageState }
  | { type: 'outsourcing-list' }
  | { type: 'outsourcing-wizard', editOrderNo?: string | null, initialAppNo?: string | null }
  | { type: 'outsourcing-details', orderNo: string }
  | { type: 'outsourcing-apply' };

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'outsourcing-list' });

  const handleOpenTaskDetails = (taskCode: string, taskData?: any, orderNo?: string) => {
    setCurrentPage(prev => ({
      type: 'task-details',
      taskCode,
      taskData,
      orderNo,
      fromPage: prev
    }));
  };

  const activeMenu: 'orders' | 'tasks' | 'outsourcing' | 'outsourcing-apply' = 
    currentPage.type === 'tasks' 
      ? 'tasks' 
      : currentPage.type === 'outsourcing-apply'
      ? 'outsourcing-apply'
      : (currentPage.type === 'outsourcing-list' || currentPage.type === 'outsourcing-wizard' || currentPage.type === 'outsourcing-details')
      ? 'outsourcing'
      : 'orders';

  return (
    <MainLayout
      activeMenu={activeMenu}
      onSelectMenu={(menu) => {
        if (menu === 'orders') {
          setCurrentPage({ type: 'list' });
        } else if (menu === 'tasks') {
          setCurrentPage({ type: 'tasks' });
        } else if (menu === 'outsourcing-apply') {
          setCurrentPage({ type: 'outsourcing-apply' });
        } else {
          setCurrentPage({ type: 'outsourcing-list' });
        }
      }}
    >
      {currentPage.type === 'list' ? (
        <OrderManagement 
          onNewOrder={() => setCurrentPage({ type: 'wizard' })} 
          onOrderClick={(no) => setCurrentPage({ type: 'details', orderNo: no })}
        />
      ) : currentPage.type === 'tasks' ? (
        <ProductionTasks 
          onTaskClick={(taskCode, task) => handleOpenTaskDetails(taskCode, task)}
        />
      ) : currentPage.type === 'wizard' ? (
        <OrderWizard 
          onBack={() => setCurrentPage({ type: 'list' })} 
          onTaskClick={(taskCode, task) => handleOpenTaskDetails(taskCode, task)}
        />
      ) : currentPage.type === 'details' ? (
        <OrderDetails 
          orderNo={currentPage.orderNo} 
          onBack={() => setCurrentPage({ type: 'list' })} 
          onTaskClick={(taskCode, task) => handleOpenTaskDetails(taskCode, task, currentPage.orderNo)}
        />
      ) : currentPage.type === 'outsourcing-list' ? (
        <OutsourcingOrders
          onNewOrder={() => setCurrentPage({ type: 'outsourcing-wizard', editOrderNo: null })}
          onEditOrder={(no) => setCurrentPage({ type: 'outsourcing-wizard', editOrderNo: no })}
          onOrderClick={(no) => setCurrentPage({ type: 'outsourcing-details', orderNo: no })}
          onNavigateOrders={() => setCurrentPage({ type: 'list' })}
        />
      ) : currentPage.type === 'outsourcing-wizard' ? (
        <OutsourcingWizard
          editOrderNo={currentPage.editOrderNo}
          initialAppNo={currentPage.initialAppNo}
          onBack={() => setCurrentPage({ type: 'outsourcing-list' })}
          onSaved={() => setCurrentPage({ type: 'outsourcing-list' })}
          onNavigateOrders={() => setCurrentPage({ type: 'list' })}
        />
      ) : currentPage.type === 'outsourcing-details' ? (
        <OutsourcingDetails
          orderNo={currentPage.orderNo}
          onBack={() => setCurrentPage({ type: 'outsourcing-list' })}
          onEditOrder={(no) => setCurrentPage({ type: 'outsourcing-wizard', editOrderNo: no })}
          onNavigateOrders={() => setCurrentPage({ type: 'list' })}
        />
      ) : currentPage.type === 'outsourcing-apply' ? (
        <OutsourcingApplications
          onNavigateOrders={() => setCurrentPage({ type: 'list' })}
          onNavigateOutsourcing={() => setCurrentPage({ type: 'outsourcing-list' })}
          onConvertToOrder={(appNo) => setCurrentPage({ type: 'outsourcing-wizard', editOrderNo: null, initialAppNo: appNo })}
        />
      ) : (
        <TaskDetails 
          taskCode={currentPage.taskCode}
          taskData={currentPage.taskData}
          orderNo={currentPage.orderNo}
          onBack={() => setCurrentPage(currentPage.fromPage || { type: 'list' })}
        />
      )}
    </MainLayout>
  );
}
