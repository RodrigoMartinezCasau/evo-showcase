import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { getSidebarFooterClanLineColor } from '@evoconn/constants/clanColors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { bottomBarIcons } from '@evoconn/assets/icons/bottomBar';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';

const TABS = [
  { id: 'siguiendo', label: 'SIGUIENDO' },
  { id: 'mas-votadas', label: 'MAS VOTADAS' },
  { id: 'para-ti', label: 'PARA TI' },
  { id: 'search', label: 'SEARCH' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type BottomCommunityTabsProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function BottomCommunityTabs({ activeTab, onTabChange }: BottomCommunityTabsProps) {
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const selectedColor = getSidebarFooterClanLineColor(activeClan);

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          style={[
            styles.tab,
            activeTab === tab.id && styles.tabActiveUnderline,
            activeTab === tab.id && { borderBottomColor: selectedColor },
          ]}
        >
          {tab.id === 'search' ? (
            <View
              style={[
                styles.searchFrame,
                {
                  width: Math.round(
                    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SEARCH_ICON_SIZE * BOTTOM_BAR_LAYOUT.SEARCH_ICON_FRAME_SCALE
                  ),
                  height: Math.round(
                    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SEARCH_ICON_SIZE * BOTTOM_BAR_LAYOUT.SEARCH_ICON_FRAME_SCALE
                  ),
                  transform: [
                    { translateX: BOTTOM_BAR_LAYOUT.SEARCH_ICON_OFFSET_X },
                    { translateY: BOTTOM_BAR_LAYOUT.SEARCH_ICON_OFFSET_Y },
                  ],
                },
              ]}
            >
              <Image
                source={activeTab === 'search' ? bottomBarIcons.searchActive : bottomBarIcons.searchInactive}
                style={styles.searchIcon}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={[styles.label, activeTab === tab.id && { color: selectedColor }]}>{tab.label}</Text>
          )}
        </TouchableOpacity>
      ))}
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
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabActiveUnderline: { borderBottomWidth: 2 },
  label: { color: evoconnColors.muted, fontSize: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_TAB_TEXT_SIZE, fontWeight: '600' },
  searchFrame: { alignItems: 'center', justifyContent: 'center' },
  searchIcon: { width: '100%', height: '100%' },
});
