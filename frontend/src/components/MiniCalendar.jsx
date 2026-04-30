import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MiniCalendar({ selectedDate, onSelect, onClose, lang = 'es' }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose]);

  const days = lang === 'es' ? DAYS_ES : DAYS_EN;
  const months = lang === 'es' ? MONTHS_ES : MONTHS_EN;
  const { year, month } = viewDate;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday-based
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedStr = selectedDate ? selectedDate.slice(0, 10) : '';

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const next = () => setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
        background: '#0f172a', border: '1px solid rgba(6,182,212,0.2)',
        borderRadius: '14px', padding: '0.6rem', width: 220,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <ChevronLeft size={14} color="#06b6d4" />
        </button>
        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '0.3px' }}>
          {months[month]} {year}
        </span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <ChevronRight size={14} color="#06b6d4" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: '0.2rem' }}>
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#475569', padding: '0.1rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isFuture = new Date(year, month, day) > today;

          return (
            <motion.button
              key={day}
              whileTap={{ scale: 0.85 }}
              disabled={isFuture}
              onClick={() => onSelect(dateStr)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '8px', border: 'none',
                cursor: isFuture ? 'default' : 'pointer',
                background: isSelected ? '#06b6d4' : isToday ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: isSelected ? '#000' : isFuture ? '#1e293b' : isToday ? '#06b6d4' : '#94a3b8',
                fontWeight: isSelected || isToday ? 900 : 700,
                fontSize: '0.6rem', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {day}
            </motion.button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
        <button
          onClick={() => onSelect(todayStr)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800, color: '#06b6d4' }}
        >
          {lang === 'es' ? 'Hoy' : 'Today'}
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800, color: '#64748b' }}
        >
          {lang === 'es' ? 'Cerrar' : 'Close'}
        </button>
      </div>
    </motion.div>
  );
}
