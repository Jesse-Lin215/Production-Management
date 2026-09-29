import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import OrderManagement from './pages/OrderManagement';
import OrderWizard from './pages/OrderWizard';
import OrderDetails from './pages/OrderDetails';
import TaskDetails from './pages/TaskDetails';
import ProductionTasks from './pages/ProductionTasks';

type PageState = 
  | { type: 'list' }
  | { type: 'tasks' }
  | { type: 'wizard' }
  | { type: 'details', orderNo: string }
  | { type: 'task-details', taskCode: string, taskData?: any, orderNo?: string, fromPage?: PageState };

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>({ type: 'list' });

  const handleOpenTaskDetails = (taskCode: string, taskData?: any, orderNo?: string) => {
    setCurrentPage(prev => ({
      type: 'task-details',
      taskCode,
      taskData,
      orderNo,
      fromPage: prev
    }));
  };

  const activeMenu: 'orders' | 'tasks' = currentPage.type === 'tasks' ? 'tasks' : 'orders';

  return (
    <MainLayout
      activeMenu={activeMenu}
      onSelectMenu={(menu) => {
        if (menu === 'orders') {
          setCurrentPage({ type: 'list' });
        } else {
          setCurrentPage({ type: 'tasks' });
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
