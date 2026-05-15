import { Search, Camera } from 'lucide-react';
import { GiCookingPot } from 'react-icons/gi';
import { motion } from 'motion/react';

const CHIPS = [
  { id: 'buscar',   label: 'Buscar',   Icon: Search,      iconSize: 13 },
  { id: 'foto',     label: 'Foto',     Icon: Camera,      iconSize: 13 },
  { id: 'alacena',  label: 'Alacena',  Icon: GiCookingPot, iconSize: 13 },
  { id: 'suplementos', label: 'Suplementos 💊', Icon: null,     iconSize: 13 },
];

export default function ActionHub({ activeChip, onChipSelect }) {
  return (
    <div style={{
      display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.85rem',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
    }}>
      {CHIPS.map(({ id, label, Icon, iconSize }) => {
        const active = activeChip === id;
        return (
          <motion.button key={id} whileTap={{ scale: 0.9 }}
            onClick={() => onChipSelect(id)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.85rem', borderRadius: '20px', cursor: 'pointer', border: 'none',
              background: active ? 'var(--color-primary)' : 'var(--surface-3)',
              color: active ? '#000' : 'var(--text-secondary)',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.2px',
              outline: active ? 'none' : '1px solid var(--border-subtle)',
              transition: 'all 0.15s',
            }}>
            {Icon && <Icon size={iconSize} />}
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
