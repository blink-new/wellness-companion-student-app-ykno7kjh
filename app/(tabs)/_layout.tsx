import { Tabs } from 'expo-router';
import { 
  Heart, 
  Home, 
  Users, 
  Brain, 
  Settings
} from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood',
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <Brain color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
      
      {/* Hidden screens - accessible through navigation but not in tab bar */}
      <Tabs.Screen
        name="journey"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}