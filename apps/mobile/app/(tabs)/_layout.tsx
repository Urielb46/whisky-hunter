import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1a1a2e' },
        tabBarActiveTintColor: '#b8860b',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#b8860b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Search', tabBarLabel: 'Search' }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{ title: 'Wishlist', tabBarLabel: 'Wishlist' }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Price Alerts', tabBarLabel: 'Alerts' }}
      />
    </Tabs>
  );
}
