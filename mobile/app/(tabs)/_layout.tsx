import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.gold,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="start"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.startButton}>
              <Ionicons 
                name="book" 
                size={26} 
                color={colors.neutral[950]} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden tabs - accessible via navigation */}
      <Tabs.Screen
        name="conversations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="writing"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.secondary,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
