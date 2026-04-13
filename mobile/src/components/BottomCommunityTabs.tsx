import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { getSidebarFooterClanLineColor } from '@evoconn/constants/clanColors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  BOTTOM_BAR_DEFAULT_LUPITA,
  getBottomBarLupitaByHouse,
} from '@evoconn/utils/getBottomBarLupitaByHouse';

const TABS = [
  { id: 'siguiendo', label: 'SIGUIENDO' },
  { id: 'mas-votadas', label: 'MAS VOTADAS' },
  { id: 'para-ti', label: 'PARA TI' },
  { id: 'search', label: 'SEARCH' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

type BottomCommunityTabsProps = {
  /** Pass null to show no tab as active (e.g. on profile / clan screens). */
  activeTab: TabId | null;
  onTabChange: (tab: TabId) => void;
};

function underlineWidthForTab(tabId: TabId): number | null {
  return tabId === 'search'
    ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_WIDTH_SEARCH
    : BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_WIDTH_TEXT;
}

export function BottomCommunityTabs({ activeTab, onTabChange }: BottomCommunityTabsProps) {
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const selectedColor = getSidebarFooterClanLineColor(activeClan);
  const LupitaIcon = useMemo(() => {
    if (activeTab === 'search') {
      return getBottomBarLupitaByHouse(activeClan);
    }
    return BOTTOM_BAR_DEFAULT_LUPITA;
  }, [activeTab, activeClan]);
  const lupEd = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_LUPITA_EDITOR;
  const lupitaPx = Math.round(
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SEARCH_ICON_SIZE *
      BOTTOM_BAR_LAYOUT.SEARCH_ICON_FRAME_SCALE *
      lupEd.scale
  );

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = activeTab !== null && activeTab === tab.id;
        const uw = underlineWidthForTab(tab.id);
        const th = BOTTOM_BAR_LAYOUT.BOTTOM_BAR_UNDERLINE_THICKNESS;
        const lupUnderlineShiftX =
          tab.id === 'search' ? BOTTOM_BAR_LAYOUT.BOTTOM_BAR_LUPITA_UNDERLINE_EDITOR.offsetX : 0;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={styles.tab}
          >
            {tab.id === 'search' ? (
              <View
                style={[
                  styles.searchFrame,
                  {
                    width: lupitaPx,
                    height: lupitaPx,
                    transform: [{ translateX: lupEd.offsetX }, { translateY: lupEd.offsetY }],
                  },
                ]}
              >
                <LupitaIcon width={lupitaPx} height={lupitaPx} />
              </View>
            ) : (
              <Text style={[styles.label, isActive && { color: selectedColor }]}>{tab.label}</Text>
            )}
            {isActive && (
              <View
                style={[
                  styles.tabUnderline,
                  uw == null
                    ? {
                        left: 0,
                        right: 0,
                        backgroundColor: selectedColor,
                        height: th,
                        ...(lupUnderlineShiftX !== 0
                          ? { transform: [{ translateX: lupUnderlineShiftX }] }
                          : {}),
                      }
                    : {
                        width: uw,
                        height: th,
                        backgroundColor: selectedColor,
                        left: '50%',
                        marginLeft: -uw / 2 + lupUnderlineShiftX,
                      },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
    backgroundColor: evoconnColors.background,
    paddingVertical: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, position: 'relative' },
  tabUnderline: { position: 'absolute', bottom: 0 },
  label: { color: evoconnColors.muted, fontSize: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_TAB_TEXT_SIZE, fontWeight: '600' },
  searchFrame: { alignItems: 'center', justifyContent: 'center' },
});
