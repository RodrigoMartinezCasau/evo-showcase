/**
 * A monthly calendar grid.
 * Active days are shown as colored circles; inactive days are dark grey.
 * The current day gets a white border highlight.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  /** Accent color for active day circles. */
  activeColor: string;
  /** Optional label shown above the grid. */
  label?: string;
  /** YYYY-MM-DD of today (defaults to actual today). */
  today?: string;
  /** Override scale. */
  scale?: number;
  /**
   * Shared horizontal offset for the calendar content block.
   * Defaults to STREAK_CALENDAR_OFFSET_X from layout constants.
   */
  offsetX?: number;
  /**
   * Shared vertical offset for the calendar content block.
   * Defaults to STREAK_CALENDAR_OFFSET_Y from layout constants.
   */
  offsetY?: number;
};

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  // Shift so Monday=0
  const firstOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export const CalendarGrid = React.memo(function CalendarGrid({
  activeDays,
  activeColor,
  label,
  today,
  scale = STREAK_CALENDAR_SCALE,
  offsetX = STREAK_CALENDAR_OFFSET_X,
  offsetY = STREAK_CALENDAR_OFFSET_Y,
}: Props) {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  const [ty, tm] = todayStr.split('-').map(Number);
  const activeSet = useMemo(() => new Set(activeDays), [activeDays]);
  const rows = useMemo(() => buildMonthGrid(ty, tm), [ty, tm]);

  const cell = STREAK_DAY_CELL_SIZE * scale;
  const gap = STREAK_DAY_CELL_GAP * scale;

  return (
    <View>
      {/* Title and month label stay fixed — not affected by offset */}
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={styles.monthLabel}>{MONTH_NAMES[tm - 1]} {ty}</Text>

      {/* Calendar content wrapper — shifted by the shared position editors */}
      <View style={{ transform: [{ translateX: offsetX }, { translateY: offsetY }] }}>
        {/* Day name headers */}
        <View style={[styles.row, { gap }]}>
          {DAY_NAMES.map((d) => (
            <View key={d} style={[styles.cell, { width: cell, height: cell }]}>
              <Text style={[styles.dayName, { fontSize: 9 * scale }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Day rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.row, { gap, marginTop: gap }]}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={[styles.cell, { width: cell, height: cell }]} />;
              const dateStr = `${ty}-${String(tm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isActive = activeSet.has(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <View
                  key={ci}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    { width: cell, height: cell, borderRadius: cell / 2 },
                    isActive && { backgroundColor: activeColor },
                    !isActive && { backgroundColor: 'rgba(255,255,255,0.07)' },
                    isToday && styles.todayBorder,
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
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  monthLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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
});
