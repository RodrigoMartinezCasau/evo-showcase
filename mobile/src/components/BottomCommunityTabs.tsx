import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

const TABS = [
  { id: 'siguiendo', label: 'SIGUIENDO' },
  { id: 'mas-votadas', label: 'MAS VOTADAS' },
  { id: 'para-ti', label: 'PARA TI' },
  { id: 'search', label: '🔍' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type BottomCommunityTabsProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function BottomCommunityTabs({ activeTab, onTabChange }: BottomCommunityTabsProps) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
        >
          <Text style={[styles.label, activeTab === tab.id && styles.labelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: evoconnColors.border,
    backgroundColor: evoconnColors.background,
    paddingVertical: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: evoconnColors.neonGreen },
  label: { color: evoconnColors.muted, fontSize: 11, fontWeight: '600' },
  labelActive: { color: evoconnColors.neonGreen },
});
