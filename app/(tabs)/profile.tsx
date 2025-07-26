import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Moon, 
  Globe, 
  Heart, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Award,
  Calendar
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface UserStats {
  moodEntries: number;
  streakDays: number;
  communityPosts: number;
  resourcesViewed: number;
}

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState<UserStats>({
    moodEntries: 0,
    streakDays: 0,
    communityPosts: 0,
    resourcesViewed: 0,
  });
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    anonymousMode: false,
    parentalSharing: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadUserData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadUserData = async () => {
    try {
      // Load user statistics
      // In a real app, this would query the database
      setUserStats({
        moodEntries: 23,
        streakDays: 7,
        communityPosts: 5,
        resourcesViewed: 18,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => blink.auth.logout()
        }
      ]
    );
  };

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, this would save to the database
  };

  const handleEmergencyContacts = () => {
    Alert.alert(
      'Emergency Contacts',
      'Set up trusted contacts who can be notified in case of emergency.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      'Privacy Settings',
      'Manage what data you share and with whom.',
      [{ text: 'OK' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Get Support',
      'Need help? Contact our support team or access crisis resources.',
      [
        { text: 'Contact Support', onPress: () => {} },
        { text: 'Crisis Resources', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.email?.split('@')[0] || 'Student'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.statsGrid}
        >
          <View style={styles.statCard}>
            <Heart color="#EC4899" size={24} />
            <Text style={styles.statNumber}>{userStats.moodEntries}</Text>
            <Text style={styles.statLabel}>Mood Entries</Text>
          </View>
          
          <View style={styles.statCard}>
            <Award color="#F59E0B" size={24} />
            <Text style={styles.statNumber}>{userStats.streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar color="#10B981" size={24} />
            <Text style={styles.statNumber}>{userStats.communityPosts}</Text>
            <Text style={styles.statLabel}>Community Posts</Text>
          </View>
          
          <View style={styles.statCard}>
            <Globe color="#8B5CF6" size={24} />
            <Text style={styles.statNumber}>{userStats.resourcesViewed}</Text>
            <Text style={styles.statLabel}>Resources Viewed</Text>
          </View>
        </Animated.View>
      </View>

      {/* Settings Sections */}
      <View style={styles.sectionsContainer}>
        {/* Account Settings */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User color="#6366F1" size={20} />
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleEmergencyContacts}
          >
            <View style={styles.settingLeft}>
              <Shield color="#EF4444" size={20} />
              <Text style={styles.settingText}>Emergency Contacts</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Privacy & Safety */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Privacy & Safety</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handlePrivacySettings}
          >
            <View style={styles.settingLeft}>
              <Shield color="#6366F1" size={20} />
              <Text style={styles.settingText}>Privacy Settings</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User color="#6366F1" size={20} />
              <Text style={styles.settingText}>Anonymous Mode</Text>
            </View>
            <Switch
              value={settings.anonymousMode}
              onValueChange={(value) => handleSettingChange('anonymousMode', value)}
              trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
              thumbColor={settings.anonymousMode ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Heart color="#EC4899" size={20} />
              <Text style={styles.settingText}>Parent/Teacher Sharing</Text>
            </View>
            <Switch
              value={settings.parentalSharing}
              onValueChange={(value) => handleSettingChange('parentalSharing', value)}
              trackColor={{ false: '#E5E7EB', true: '#EC4899' }}
              thumbColor={settings.parentalSharing ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Bell color="#F59E0B" size={20} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
              thumbColor={settings.notifications ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Moon color="#6366F1" size={20} />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => handleSettingChange('darkMode', value)}
              trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
              thumbColor={settings.darkMode ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Globe color="#10B981" size={20} />
              <Text style={styles.settingText}>Language</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>English</Text>
              <ChevronRight color="#9CA3AF" size={20} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Support */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleSupport}
          >
            <View style={styles.settingLeft}>
              <HelpCircle color="#6366F1" size={20} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Heart color="#EC4899" size={20} />
              <Text style={styles.settingText}>About Wellness Companion</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(600)}
          style={styles.section}
        >
          <TouchableOpacity 
            style={[styles.settingItem, styles.signOutItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <LogOut color="#EF4444" size={20} />
              <Text style={[styles.settingText, styles.signOutText]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(700)}
        style={styles.footer}
      >
        <Text style={styles.footerText}>
          Wellness Companion v1.0.0
        </Text>
        <Text style={styles.footerSubtext}>
          Your privacy and well-being are our priority
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '500',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});