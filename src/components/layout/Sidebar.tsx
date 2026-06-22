'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, GraduationCap, UsersRound, Building2, ClipboardList,
  BarChart3, Wallet, Calendar, Megaphone, Shield, User, PieChart,
  CheckSquare, CreditCard, Clock, FileText, MessageCircle, Bus,
  Receipt, LogOut, ChevronLeft, ChevronRight, ChevronDown, Menu, X,
  BookCheck, RotateCcw, Ticket, History, BookOpen, CalendarDays
} from 'lucide-react';

const sz = 18;

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navConfig: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard size={sz} /> },
    { label: 'Students', href: '/dashboard/admin/students', icon: <GraduationCap size={sz} /> },
    { label: 'Faculty', href: '/dashboard/admin/faculty', icon: <UsersRound size={sz} /> },
    { label: 'Academics', icon: <Building2 size={sz} />, children: [
      { label: 'Sections', href: '/dashboard/admin/sections' },
      { label: 'Assignments', href: '/dashboard/admin/assignments' },
      { label: 'Timetable', href: '/dashboard/admin/timetable' },
    ]},
    { label: 'Results', href: '/dashboard/admin/results', icon: <BarChart3 size={sz} /> },
    { label: 'Fees', href: '/dashboard/admin/fees', icon: <Wallet size={sz} /> },
    { label: 'Notices', href: '/dashboard/admin/notices', icon: <Megaphone size={sz} /> },
    { label: 'Audit Log', href: '/dashboard/admin/audit', icon: <Shield size={sz} /> },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: <BarChart3 size={sz} /> },
  ],
  STUDENT: [
    { label: 'Dashboard', href: '/dashboard/student', icon: <LayoutDashboard size={sz} /> },
    { label: 'Exam Registration', href: '/dashboard/student/exam-registration', icon: <BookCheck size={sz} /> },
    { label: 'Student Profile', href: '/dashboard/student/profile', icon: <User size={sz} /> },
    { label: 'RV Registration', href: '/dashboard/student/rv-registration', icon: <RotateCcw size={sz} /> },
    { label: 'Sem Result', href: '/dashboard/student/results', icon: <BarChart3 size={sz} /> },
    { label: 'Transactions', href: '/dashboard/student/transactions', icon: <History size={sz} /> },
    { label: 'Hall Ticket', href: '/dashboard/student/hall-ticket', icon: <Ticket size={sz} /> },
    { label: 'Attendance', href: '/dashboard/student/attendance', icon: <PieChart size={sz} /> },
    { label: 'Fees', href: '/dashboard/student/fees', icon: <CreditCard size={sz} /> },
    { label: 'Timetable', href: '/dashboard/student/timetable', icon: <Clock size={sz} /> },
    { label: 'Faculty', href: '/dashboard/student/faculty', icon: <UsersRound size={sz} /> },
    { label: 'My Documents', href: '/dashboard/student/my-documents', icon: <FileText size={sz} /> },
    { label: 'Repository', href: '/dashboard/student/repository', icon: <BookOpen size={sz} /> },
    { label: 'Calendar', href: '/dashboard/student/calendar', icon: <CalendarDays size={sz} /> },
    { label: 'Ask Doubts', href: '/dashboard/student/chatbot', icon: <MessageCircle size={sz} /> },
  ],
  FACULTY: [
    { label: 'Dashboard', href: '/dashboard/faculty', icon: <LayoutDashboard size={sz} /> },
    { label: 'Profile', href: '/dashboard/faculty/profile', icon: <User size={sz} /> },
    { label: 'Attendance', href: '/dashboard/faculty/attendance', icon: <CheckSquare size={sz} /> },
    { label: 'Students', href: '/dashboard/faculty/students', icon: <GraduationCap size={sz} /> },
    { label: 'Documents', href: '/dashboard/faculty/documents', icon: <FileText size={sz} /> },
    { label: 'Leave', href: '/dashboard/faculty/leave', icon: <CalendarDays size={sz} /> },
  ],
  ACCOUNTANT: [
    { label: 'Dashboard', href: '/dashboard/accountant', icon: <LayoutDashboard size={sz} /> },
    { label: 'Fee Records', href: '/dashboard/accountant/fees', icon: <Wallet size={sz} /> },
    { label: 'Transactions', href: '/dashboard/accountant/transactions', icon: <Receipt size={sz} /> },
  ],
  BUS_PROVIDER: [
    { label: 'Dashboard', href: '/dashboard/bus-provider', icon: <LayoutDashboard size={sz} /> },
    { label: 'Bus Fees', href: '/dashboard/bus-provider/fees', icon: <Bus size={sz} /> },
  ],
};

export default function Sidebar({ role, username }: { role: string; username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const items = navConfig[role] || [];

  // Fetch notification count for students
  useEffect(() => {
    if (role === 'STUDENT') {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(d => setUnreadCount(d.unreadCount || 0))
        .catch(() => {});
    }
  }, [role]);

  // Re-check every 30 seconds
  useEffect(() => {
    if (role !== 'STUDENT') return;
    const interval = setInterval(() => {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(d => setUnreadCount(d.unreadCount || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white border border-border shadow-sm p-2 rounded-xl" aria-label="Menu">
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} />}

      <aside className={`${sidebarWidth} bg-sidebar border-r border-border min-h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand + collapse */}
        <div className="px-4 py-5 flex items-center justify-between border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue flex items-center justify-center shadow-md shadow-blue/20">
                <span className="text-white font-extrabold text-sm">JB</span>
              </div>
              <div>
                <p className="font-bold text-ink text-sm leading-tight">JBIET</p>
                <p className="text-muted text-[10px]">Exam Portal</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-xl bg-blue flex items-center justify-center shadow-md shadow-blue/20 mx-auto">
              <span className="text-white font-extrabold text-sm">JB</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex w-7 h-7 rounded-lg border border-border items-center justify-center hover:bg-blue-light transition-colors" aria-label="Collapse sidebar">
            {collapsed ? <ChevronRight size={14} className="text-secondary" /> : <ChevronLeft size={14} className="text-secondary" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="space-y-0.5">
            {items.map((item) => {
              if (item.children) {
                const isExpanded = expandedGroups.includes(item.label);
                const childActive = item.children.some(c => pathname === c.href);
                return (
                  <div key={item.label}>
                    <button onClick={() => toggleGroup(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${childActive ? 'text-blue' : 'text-secondary hover:text-ink hover:bg-blue-light'}`}>
                      <span className={childActive ? 'text-blue' : 'text-muted'}>{item.icon}</span>
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                    </button>
                    {isExpanded && !collapsed && (
                      <div className="ml-8 mt-0.5 space-y-0.5">
                        {item.children.map(child => (
                          <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)}
                            className={`block px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${pathname === child.href ? 'text-blue bg-blue-light' : 'text-secondary hover:text-ink'}`}>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = pathname === item.href;
              const showBadge = role === 'STUDENT' && item.label === 'Documents' && unreadCount > 0;
              return (
                <Link key={item.href} href={item.href!} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    isActive ? 'bg-blue text-white shadow-md shadow-blue/20' : 'text-secondary hover:text-ink hover:bg-blue-light'
                  }`}>
                  <span className={isActive ? 'text-white' : 'text-muted'}>{item.icon}</span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && showBadge && (
                    <span className="bg-orange text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-light flex items-center justify-center text-blue font-bold text-xs">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{username}</p>
                <p className="text-[10px] text-muted">{role.replace('_', ' ')}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-light flex items-center justify-center text-blue font-bold text-xs mx-auto mb-2">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <button onClick={handleLogout}
            className={`flex items-center justify-center gap-2 ${collapsed ? 'w-9 h-9 mx-auto' : 'w-full py-2'} rounded-xl text-xs font-medium text-secondary hover:text-danger hover:bg-danger-light transition-all`}>
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
