import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Calendar, Target, Award, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface MoodEntry {
  id: string;
  userId: string;
  mood: number;
  note?: string;
  createdAt: string;
}

interface WellnessGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  icon: string;
}

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [wellnessGoals, setWellnessGoals] = useState<WellnessGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadDashboardData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!user?.id) return;
      
      // Load today's mood entry
      const today = new Date().toISOString().split('T')[0];
      const moodEntries = await blink.db.moodEntries.list({
        where: { 
          userId: user.id,
          createdAt: today
        },
        limit: 1
      });
      
      if (moodEntries.length > 0) {
        setTodayMood(moodEntries[0]);
      }

      // Set sample wellness goals
      setWellnessGoals([
        { id: '1', title: 'Daily Mood Check-ins', progress: 5, target: 7, icon: '💭' },
        { id: '2', title: 'Mindfulness Minutes', progress: 15, target: 30, icon: '🧘' },
        { id: '3', title: 'Community Interactions', progress: 2, target: 5, icon: '👥' },
        { id: '4', title: 'Study Break Reminders', progress: 3, target: 6, icon: '⏰' },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleEmergencyAccess = () => {
    Alert.alert(
      'Emergency Support',
      'If you\'re in crisis, please reach out for immediate help:\n\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n• Emergency Services: 911',
      [
        { text: 'Call 988', onPress: () => {} },
        { text: 'Text Crisis Line', onPress: () => {} },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 8) return '😊';
    if (mood >= 6) return '🙂';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😔';
    return '😢';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your wellness dashboard...</Text>
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
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Student'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={handleEmergencyAccess}
          >
            <AlertCircle color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>

        {/* Today's Mood */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.moodCard}
        >
          <View style={styles.moodHeader}>
            <Heart color="#6366F1" size={20} />
            <Text style={styles.moodTitle}>Today's Mood</Text>
          </View>
          
          {todayMood ? (
            <View style={styles.moodDisplay}>
              <Text style={styles.moodEmoji}>{getMoodEmoji(todayMood.mood)}</Text>
              <Text style={styles.moodText}>
                Feeling {todayMood.mood >= 6 ? 'good' : todayMood.mood >= 4 ? 'okay' : 'struggling'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.moodPrompt}>
              <Text style={styles.moodPromptText}>Tap to check in with your mood</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Wellness Goals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target color="#6366F1" size={20} />
          <Text style={styles.sectionTitle}>Your Wellness Goals</Text>
        </View>
        
        {wellnessGoals.map((goal, index) => (
          <Animated.View 
            key={goal.id}
            entering={FadeInDown.duration(600).delay(index * 100)}
            style={styles.goalCard}
          >
            <View style={styles.goalHeader}>
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalProgress}>
                  {goal.progress} / {goal.target}
                </Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }
                ]} 
              />
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Award color="#6366F1" size={20} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🧘</Text>
            <Text style={styles.actionTitle}>5-Min Meditation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📚</Text>
            <Text style={styles.actionTitle}>Study Break</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionTitle}>Join Discussion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📖</Text>
            <Text style={styles.actionTitle}>Read Article</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Companion Message */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(800)}
        style={styles.companionCard}
      >
        <View style={styles.companionHeader}>
          <Text style={styles.companionAvatar}>🌱</Text>
          <Text style={styles.companionName}>Your Wellness Companion</Text>
        </View>
        <Text style={styles.companionMessage}>
          "Remember, taking care of your mental health is just as important as your studies. You're doing great by being here! 💚"
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  emergencyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  moodText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  moodPrompt: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  moodPromptText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  goalProgress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  companionCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  companionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companionAvatar: {
    fontSize: 24,
    marginRight: 8,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
  },
  companionMessage: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});