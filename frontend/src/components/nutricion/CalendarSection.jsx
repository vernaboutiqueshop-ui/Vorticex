import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { HiOutlineChartBar } from 'react-icons/hi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';

const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function CalendarSection({ perfil, historial }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayMeals, setDayMeals] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDay = async (fecha) => {
    setSelectedDate(fecha);
    setDrawerOpen(true);
    setLoadingDay(true);
    setDayMeals([]);
    try {
      const res = await authFetch(`${API}/api/nutricion/comidas-fecha?perfil=${perfil}&fecha=${fecha}`);
      const data = await res.json();
      if (data.comidas) setDayMeals(data.comidas);
    } catch {}
    setLoadingDay(false);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedDate(null); };

  const hoy = new Date();
  const todayStr = hoy.toISOString().split('T')[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (6 - i));
    const fecha = d.toISOString().split('T')[0];
    const isToday = fecha === todayStr;
    const histItem = historial.find(h => h.fecha === fecha);
    const calorias = histItem?.calorias || 0;
    return { fecha, isToday, calorias, dayLabel: DIAS_LABEL[d.getDay()] };
  });

  const maxCal = Math.max(...days.map(d => d.calorias), 1);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}
      >
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', margin: '0 0 0.75rem' }}>
          <HiOutlineChartBar size={14} /> SEMANA — tocá un día para ver tus comidas
        </h3>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {days.map((day, i) => {
            const pct = maxCal > 0 ? day.calorias / maxCal : 0;
            const isSelected = selectedDate === day.fecha;
            const dotColor = pct > 0.75 ? 'var(--color-prot)' : pct > 0.35 ? 'var(--color-kcal)' : pct > 0 ? '#ef4444' : 'var(--surface-3)';
            return (
              <motion.button key={day.fecha} whileTap={{ scale: 0.9 }}
                onClick={() => !day.isToday && openDay(day.fecha)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                  background: isSelected ? 'rgba(0,201,255,0.08)' : day.isToday ? 'rgba(0,201,255,0.04)' : 'transparent',
                  border: day.isToday ? '1px solid rgba(0,201,255,0.25)' : isSelected ? '1px solid rgba(0,201,255,0.4)' : '1px solid transparent',
                  borderRadius: '10px', padding: '0.5rem 0.2rem', cursor: day.isToday ? 'default' : 'pointer',
                }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 900, color: day.isToday ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                  {day.dayLabel}
                </span>
                <div style={{ width: '100%', height: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct * 28, day.calorias > 0 ? 4 : 0)}px` }}
                    transition={{ duration: 0.5, delay: 0.05 * i }}
                    style={{ width: '60%', borderRadius: '3px 3px 0 0', background: dotColor, opacity: isSelected ? 1 : 0.75 }}
                  />
                </div>
                <span style={{ fontSize: '0.42rem', color: day.calorias > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 800 }}>
                  {day.calorias > 0 ? Math.round(day.calorias) : '—'}
                </span>
                {day.isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* BOTTOM DRAWER */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && closeDrawer()}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'var(--surface-2)', borderRadius: '20px 20px 0 0', padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  </div>
                  {!loadingDay && (
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {dayMeals.length === 0
                        ? 'Sin registros ese día'
                        : `${dayMeals.length} comida${dayMeals.length !== 1 ? 's' : ''} · ${Math.round(dayMeals.reduce((s, m) => s + (m.calorias || 0), 0))} kcal`}
                    </div>
                  )}
                </div>
                <button onClick={closeDrawer} style={{ background: 'var(--surface-3)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>

              {loadingDay && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={20} className="spin" color="var(--color-primary)" />
                </div>
              )}

              {!loadingDay && dayMeals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  No hay comidas registradas ese día
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {dayMeals.map((c, i) => {
                  const cal = Math.round(c.calorias || 0);
                  const calColor = cal > 500 ? '#ef4444' : cal > 250 ? 'var(--color-kcal)' : 'var(--color-prot)';
                  const gramosMatch = c.descripcion?.match(/\((\d+)g\)$/);
                  const gramos = gramosMatch ? gramosMatch[1] : null;
                  const nombreBase = gramos ? c.descripcion.replace(/\s*\(\d+g\)$/, '') : c.descripcion;
                  return (
                    <motion.div key={c.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-1)', borderRadius: '12px', padding: '0.55rem 0.65rem', border: '1px solid var(--surface-hover)' }}>
                      <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: `${calColor}18`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</span>
                        <span style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.15rem' }}>
                          {nombreBase}
                          {gramos && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem', color: 'var(--color-primary)', background: 'rgba(0,201,255,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{gramos}g</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-prot)' }}>P {Math.round(c.proteinas || 0)}g</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-carb)' }}>C {Math.round(c.carbos || 0)}g</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-gras)' }}>G {Math.round(c.grasas || 0)}g</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
