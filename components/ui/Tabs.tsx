'use client';
import React, { useState, ReactNode } from 'react';
import styles from './Tabs.module.css';

interface TabProps {
  id: string;
  label: string;
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

interface TabsProps {
  children: ReactNode;
}

export function Tabs({ children }: TabsProps) {
  const tabs = React.Children.toArray(children) as React.ReactElement<TabProps>[];
  const [activeTab, setActiveTab] = useState(tabs[0]?.props.id);

  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabList}>
        {tabs.map((tab) => (
          <button
            key={tab.props.id}
            className={`${styles.tabBtn} ${activeTab === tab.props.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.props.id)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tabs.find((tab) => tab.props.id === activeTab)?.props.children}
      </div>
    </div>
  );
}
