import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#242424',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#D4A853',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#111111', borderBottomColor: '#242424', borderBottomWidth: 1 },
        headerTintColor: '#D4A853',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'WhiskyHunter',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarLabel: 'Wishlist',
          tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Price Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
