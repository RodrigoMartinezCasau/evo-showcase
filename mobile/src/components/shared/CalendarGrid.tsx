/**
 * A monthly calendar grid with left/right month navigation.
 *
 * variant='circles'     (default) — active days shown as filled circles.
 * variant='streak-line' — active runs shown as one continuous rounded pill per row,
 *                         with flat ends where it connects to the adjacent row.
 *
 * Active day text is always black; inactive day text is dim white.
 * The current day gets a white border highlight in both variants.
 *
 * Navigation:
 *   - Users can go back up to MAX_MONTHS_BACK (12) months.
 *   - Users cannot navigate forward past the current month.
 *   - Tapping an arrow plays a lightweight slide animation.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { getLocalDayKey } from '@evoconn/services/userStatsStorage';
import {
  STREAK_DAY_CELL_SIZE,
  STREAK_DAY_CELL_GAP,
  STREAK_CALENDAR_SCALE,
  STREAK_CALENDAR_OFFSET_X,
  STREAK_CALENDAR_OFFSET_Y,
} from '@evoconn/constants/streakLayout';

type Props = {
  /** YYYY-MM-DD strings for days that have activity. */
  activeDays: string[];
  /** Accent color for active marks (circles or pill). */
  activeColor: string;
  /** Optional label shown above the grid. */
  label?: string;
  /** YYYY-MM-DD of today (defaults to actual today). */
  today?: string;
  /** Override scale. */
  scale?: number;
  /** Shared horizontal offset for the calendar content block. */
  offsetX?: number;
  /** Shared vertical offset for the calendar content block. */
  offsetY?: number;
  /**
   * 'circles'     = standard separate filled circles per active day (default).
   * 'streak-line' = active consecutive days shown as one continuous rounded pill.
   */
  variant?: 'circles' | 'streak-line';
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES   = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const MAX_MONTHS_BACK = 12;
const NAV_SLIDE_DIST  = 350; // px — wider than any calendar grid

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns [year, month 1-12] for the month `offset` steps from [baseY, baseM]. */
function getViewedYearMonth(baseY: number, baseM: number, offset: number): [number, number] {
  let m = baseM + offset;
  let y = baseY;
  while (m <= 0) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return [y, m];
}

// ─── Month grid builder ───────────────────────────────────────────────────────

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const firstOffset = (firstDay + 6) % 7;                 // shift so Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─── Streak-line row renderer ─────────────────────────────────────────────────

type StreakRowProps = {
  row: (number | null)[];
  rowIndex: number;
  allRows: (number | null)[][];
  activeSet: Set<string>;
  datePrefix: string; // 'YYYY-MM'
  cell: number;
  gap: number;
  activeColor: string;
  todayStr: string;
  scale: number;
  isFirst: boolean;
};

function StreakLineRow({
  row, rowIndex, allRows, activeSet, datePrefix,
  cell, gap, activeColor, todayStr, scale, isFirst,
}: StreakRowProps) {
  // Which columns are active in this row?
  const activeCols: boolean[] = row.map((day) => {
    if (!day) return false;
    return activeSet.has(`${datePrefix}-${String(day).padStart(2, '0')}`);
  });

  // Find consecutive runs of active columns
  type Run = { start: number; end: number };
  const runs: Run[] = [];
  let s = -1;
  for (let i = 0; i < 7; i++) {
    if (activeCols[i]) { if (s === -1) s = i; }
    else if (s !== -1) { runs.push({ start: s, end: i - 1 }); s = -1; }
  }
  if (s !== -1) runs.push({ start: s, end: 6 });

  // Each row always gets its own fully-rounded ends — no cross-row flattening.
  const pillLeft  = (run: { start: number; end: number }) => run.start * (cell + gap);
  const pillWidth = (run: { start: number; end: number }) =>
    (run.end - run.start) * (cell + gap) + cell;
  const r = cell / 2;

  return (
    <View style={[styles.streakRow, { height: cell, marginTop: isFirst ? 0 : gap }]}>
      {/* ── Pill backgrounds (absolute, behind day numbers) ── */}
      {runs.map((run) => (
        <View
          key={`pill-${run.start}-${run.end}`}
          style={{
            position: 'absolute',
            left: pillLeft(run),
            top: 0,
            width: pillWidth(run),
            height: cell,
            backgroundColor: activeColor,
            borderRadius: r,   // fully rounded on all four corners, every row
          }}
        />
      ))}

      {/* ── Day cells (absolute, on top of pills) ── */}
      <View style={[styles.streakCellRow, { gap }]}>
        {row.map((day, ci) => {
          if (!day) return <View key={ci} style={{ width: cell, height: cell }} />;
          const dateStr  = `${datePrefix}-${String(day).padStart(2, '0')}`;
          const isActive = activeSet.has(dateStr);
          const isToday  = dateStr === todayStr;
          return (
            <View
              key={ci}
              style={[
                { width: cell, height: cell, borderRadius: r,
                  alignItems: 'center', justifyContent: 'center' },
                isToday && styles.todayBorder,
              ]}
            >
              <Text
                style={{
                  color:      isActive ? '#000000' : 'rgba(255,255,255,0.45)',
                  fontSize:   10 * scale,
                  fontWeight: isActive ? '700' : '500',
                }}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const CalendarGrid = React.memo(function CalendarGrid({
  activeDays,
  activeColor,
  label,
  today,
  scale   = STREAK_CALENDAR_SCALE,
  offsetX = STREAK_CALENDAR_OFFSET_X,
  offsetY = STREAK_CALENDAR_OFFSET_Y,
  variant = 'circles',
}: Props) {
  const todayStr = today ?? getLocalDayKey();
  const [ty, tm] = todayStr.split('-').map(Number);

  // ── Month navigation state ────────────────────────────────────────────────
  const [monthOffset, setMonthOffset] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [vy, vm] = useMemo(
    () => getViewedYearMonth(ty, tm, monthOffset),
    [ty, tm, monthOffset],
  );

  const atMin = monthOffset <= -MAX_MONTHS_BACK;
  const atMax = monthOffset >= 0;

  const handlePrev = useCallback(() => {
    if (atMin) return;
    slideAnim.setValue(-NAV_SLIDE_DIST);
    setMonthOffset(o => o - 1);
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [atMin, slideAnim]);

  const handleNext = useCallback(() => {
    if (atMax) return;
    slideAnim.setValue(NAV_SLIDE_DIST);
    setMonthOffset(o => o + 1);
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [atMax, slideAnim]);

  // ── Calendar data ─────────────────────────────────────────────────────────
  const activeSet  = useMemo(() => new Set(activeDays), [activeDays]);
  const rows       = useMemo(() => buildMonthGrid(vy, vm), [vy, vm]);
  const datePrefix = `${vy}-${String(vm).padStart(2, '0')}`;

  const cell = STREAK_DAY_CELL_SIZE * scale;
  const gap  = STREAK_DAY_CELL_GAP  * scale;

  return (
    <View style={styles.outerWrap}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* ── Month navigation row ── */}
      <View style={styles.monthNavRow}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={atMin}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={[styles.navArrow, atMin && styles.navArrowDisabled]}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthLabel}>{MONTH_NAMES[vm - 1]} {vy}</Text>

        <TouchableOpacity
          onPress={handleNext}
          disabled={atMax}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={[styles.navArrow, atMax && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar grid — slides on month change ── */}
      <View style={styles.calendarCenterWrap}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* offsetX/Y nudge applied inside so they operate from the centered position */}
          <View style={{ transform: [{ translateX: offsetX }, { translateY: offsetY }] }}>

            {/* Weekday header row */}
            <View style={[styles.row, { gap }]}>
              {DAY_NAMES.map((d) => (
                <View key={d} style={[styles.cell, { width: cell, height: cell }]}>
                  <Text style={[styles.dayName, { fontSize: 9 * scale }]}>{d}</Text>
                </View>
              ))}
            </View>

            {variant === 'streak-line' ? (
              /* ── Streak-line variant ── */
              rows.map((row, ri) => (
                <StreakLineRow
                  key={ri}
                  row={row}
                  rowIndex={ri}
                  allRows={rows}
                  activeSet={activeSet}
                  datePrefix={datePrefix}
                  cell={cell}
                  gap={gap}
                  activeColor={activeColor}
                  todayStr={todayStr}
                  scale={scale}
                  isFirst={ri === 0}
                />
              ))
            ) : (
              /* ── Circles variant (default) ── */
              rows.map((row, ri) => (
                <View key={ri} style={[styles.row, { gap, marginTop: gap }]}>
                  {row.map((day, ci) => {
                    if (!day) return <View key={ci} style={[styles.cell, { width: cell, height: cell }]} />;
                    const dateStr  = `${datePrefix}-${String(day).padStart(2, '0')}`;
                    const isActive = activeSet.has(dateStr);
                    const isToday  = dateStr === todayStr;
                    return (
                      <View
                        key={ci}
                        style={[
                          styles.cell,
                          styles.dayCell,
                          { width: cell, height: cell, borderRadius: cell / 2 },
                          isActive  && { backgroundColor: activeColor },
                          !isActive && { backgroundColor: 'rgba(255,255,255,0.07)' },
                          isToday   && styles.todayBorder,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            { fontSize: 10 * scale },
                            isActive && styles.dayNumActive,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}

          </View>
        </Animated.View>
      </View>{/* end calendarCenterWrap */}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Fills the card's content width so the calendar can center within it. */
  outerWrap: {
    width: '100%',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // ── Month navigation row ──
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navArrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontWeight: '300',
    width: 24,
    textAlign: 'center',
  },
  navArrowDisabled: {
    color: 'rgba(255,255,255,0.18)',
  },
  monthLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // ── Calendar grid wrap ──
  /** Centers the calendar grid horizontally within the card at any scale.
   *  overflow:hidden clips the slide animation to the card bounds. */
  calendarCenterWrap: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    overflow: 'hidden',
  },
  todayBorder: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  dayName: {
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  dayNum: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  dayNumActive: {
    color: '#000000',
    fontWeight: '700',
  },
  // Streak-line row container: relative so absolute pills are anchored here
  streakRow: {
    position: 'relative',
  },
  // Day-numbers row sits on top of the absolute pills
  streakCellRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
