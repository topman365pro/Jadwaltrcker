import { useEffect, useRef } from 'react';
import { BookOpen, CalendarDays, Sun, Users, X } from 'lucide-react';
import { TeacherList } from './TeacherTracker';
import type { School } from './school';

type SidebarProps = { school: School; hasData: boolean; dataPage: boolean; teacherPage: boolean; teacherCode?: string };

function SidebarContent({ school, hasData, dataPage, teacherPage, teacherCode }: SidebarProps) {
 return <>
  <div className="sidebar-caption">YOUR DAILY RHYTHM</div>
  <nav className="side-nav" aria-label="Main navigation">
   <a className={!dataPage && !teacherPage ? 'nav-active' : 'nav-item'} href="/"><CalendarDays size={19}/> Dashboard</a>
   <a className={dataPage ? 'nav-active' : 'nav-item'} href="/data"><BookOpen size={19}/> Data management</a>
   <a className={teacherPage ? 'nav-active' : 'nav-item'} href="/teachers"><Users size={19}/> Teacher tracker</a>
  </nav>
  {hasData && <TeacherList school={school} selectedCode={teacherPage ? teacherCode : undefined} compact/>}
  <div className="sidebar-bottom"><div className="mini-calendar"><Sun size={23}/><p>A little structure.<br/><strong>A clearer day.</strong></p></div><p className="sidebar-note">Monday – Friday<br/>One day at a time.</p></div>
 </>;
}

function Brand() {
 return <a className="brand" href="/" aria-label="Dayline home"><span className="brand-icon"><CalendarDays size={23}/></span>dayline<span className="brand-dot">.</span></a>;
}

export function Sidebar(props: SidebarProps) {
 const drawer = useRef<HTMLDialogElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 useEffect(() => {
  const desktop = window.matchMedia('(min-width: 801px)');
  const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
  desktop.addEventListener('change', closeOnDesktop);
  return () => desktop.removeEventListener('change', closeOnDesktop);
 }, []);
 return <>
  <aside className="sidebar"><Brand/><SidebarContent {...props}/></aside>
  <div className="mobile-brand"><button ref={trigger} className="brand-icon sidebar-toggle" aria-label="Open side pane" aria-haspopup="dialog" aria-controls="mobile-side-pane" onClick={() => drawer.current?.showModal()}><CalendarDays size={23}/></button><a className="brand" href="/" aria-label="Dayline home">dayline<span className="brand-dot">.</span></a></div>
  <dialog ref={drawer} id="mobile-side-pane" className="mobile-sidebar" aria-label="Side pane" onClose={() => trigger.current?.focus()} onClick={event => {
   if (event.target !== event.currentTarget) return;
   const bounds = event.currentTarget.getBoundingClientRect();
   if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
  }}>
   <div className="sidebar-content"><div className="drawer-heading"><Brand/><button className="sidebar-close" aria-label="Close side pane" onClick={() => drawer.current?.close()}><X size={22}/></button></div><SidebarContent {...props}/></div>
  </dialog>
 </>;
}
