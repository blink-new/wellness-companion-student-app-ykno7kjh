import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Award, 
  Target, 
  Trophy, 
  Star,
  Calendar,
  Heart,
  Brain,
  Users,
  Zap,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface UserBadge {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  earnedAt: string;
  isDisplayed: boolean;
}

interface WellnessChallenge {
  id: string;
  title: string;
  description: string;
  challengeType: string;
  targetValue: number;
  targetMetric: string;
  startDate: string;
  endDate: string;
  rewardBadge: string;
  isActive: boolean;
  createdAt: string;
}

interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  joinedAt: string;
}

const badgeCategories = [
  { type: 'mood', icon: <Heart color="#EC4899" size={20} />, color: '#EC4899', label: 'Mood Tracking' },
  { type: 'meditation', icon: <Brain color="#8B5CF6" size={20} />, color: '#8B5CF6', label: 'Meditation' },
  { type: 'community', icon: <Users color="#10B981" size={20} />, color: '#10B981', label: 'Community' },
  { type: 'streak', icon: <Zap color="#F59E0B" size={20} />, color: '#F59E0B', label: 'Consistency' },
  { type: 'milestone', icon: <Trophy color="#6366F1" size={20} />, color: '#6366F1', label: 'Milestones' },
];

export default function BadgesScreen() {
  const [user, setUser] = useState(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<WellnessChallenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadBadgesData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadBadgesData = async () => {
    try {
      // Load user's earned badges
      const badges = await blink.db.userBadges.list({
        where: { userId: user?.id },
        orderBy: { earnedAt: 'desc' },
        limit: 50
      });
      setUserBadges(badges);

      // Load active challenges
      const challenges = await blink.db.wellnessChallenges.list({
        where: { isActive: "1" },
        orderBy: { createdAt: 'desc' },
        limit: 10
      });
      setActiveChallenges(challenges);

      // Load user's challenge progress
      const userChallengeProgress = await blink.db.userChallenges.list({
        where: { userId: user?.id },
        orderBy: { joinedAt: 'desc' },
        limit: 20
      });
      setUserChallenges(userChallengeProgress);

      // Check for new badges to award
      await checkForNewBadges();
    } catch (error) {
      console.error('Error loading badges data:', error);
    }
  };

  const checkForNewBadges = async () => {
    try {
      // Get user's mood entries for streak calculation
      const moodEntries = await blink.db.moodEntries.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 30
      });

      // Get user's exercise sessions
      const exerciseSessions = await blink.db.exerciseSessions.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 50
      });

      // Check for mood tracking badges
      if (moodEntries.length >= 7 && !userBadges.some(b => b.badgeType === 'mood_week')) {
        await awardBadge('mood_week', 'Week Warrior', 'Tracked your mood for 7 days', '🗓️');
      }

      if (moodEntries.length >= 30 && !userBadges.some(b => b.badgeType === 'mood_month')) {
        await awardBadge('mood_month', 'Monthly Master', 'Tracked your mood for 30 days', '📅');
      }

      // Check for meditation badges
      const completedSessions = exerciseSessions.filter(s => s.completionPercentage === 100);
      if (completedSessions.length >= 5 && !userBadges.some(b => b.badgeType === 'meditation_starter')) {
        await awardBadge('meditation_starter', 'Mindful Beginner', 'Completed 5 meditation sessions', '🧘');
      }

      if (completedSessions.length >= 25 && !userBadges.some(b => b.badgeType === 'meditation_master')) {
        await awardBadge('meditation_master', 'Zen Master', 'Completed 25 meditation sessions', '🏆');
      }

      // Check for streak badges
      const streakDays = calculateCurrentStreak(moodEntries);
      if (streakDays >= 7 && !userBadges.some(b => b.badgeType === 'streak_week')) {
        await awardBadge('streak_week', 'Consistency Champion', '7-day wellness streak', '🔥');
      }
    } catch (error) {
      console.error('Error checking for new badges:', error);
    }
  };

  const calculateCurrentStreak = (moodEntries: any[]): number => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const hasEntry = moodEntries.some(entry => entry.createdAt === dateString);
      if (hasEntry) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const awardBadge = async (badgeType: string, badgeName: string, description: string, icon: string) => {
    try {
      await blink.db.userBadges.create({
        userId: user?.id || '',
        badgeType,
        badgeName,
        badgeDescription: description,
        badgeIcon: icon,
        earnedAt: new Date().toISOString().split('T')[0],
        isDisplayed: true
      });

      Alert.alert(
        '🎉 Badge Earned!',
        `Congratulations! You've earned the "${badgeName}" badge!\n\n${description}`,
        [{ text: 'Awesome!' }]
      );

      // Reload badges
      await loadBadgesData();
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  const joinChallenge = async (challenge: WellnessChallenge) => {
    try {
      // Check if already joined
      const existingChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
      if (existingChallenge) {
        Alert.alert('Already Joined', 'You are already participating in this challenge!');
        return;
      }

      await blink.db.userChallenges.create({
        userId: user?.id || '',
        challengeId: challenge.id,
        currentProgress: 0,
        isCompleted: false,
        joinedAt: new Date().toISOString().split('T')[0]
      });

      Alert.alert(
        'Challenge Joined! 🎯',
        `You've joined "${challenge.title}". Good luck!`,
        [{ text: 'Let\'s Go!' }]
      );

      await loadBadgesData();
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    }
  };

  const getFilteredBadges = () => {
    if (selectedCategory === 'all') return userBadges;
    return userBadges.filter(badge => badge.badgeType.includes(selectedCategory));
  };

  const getChallengeProgress = (challengeId: string) => {
    const userChallenge = userChallenges.find(uc => uc.challengeId === challengeId);
    return userChallenge || null;
  };

  const getBadgesByCategory = (category: string) => {
    return userBadges.filter(badge => badge.badgeType.includes(category)).length;
  };

  const getTotalBadges = () => userBadges.length;

  const getCompletionRate = () => {
    const completedChallenges = userChallenges.filter(uc => uc.isCompleted).length;
    const totalChallenges = userChallenges.length;
    return totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your achievements...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Trophy color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>
            Celebrate your wellness journey
          </Text>
        </View>
        
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTotalBadges()}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userChallenges.filter(uc => uc.isCompleted).length}</Text>
            <Text style={styles.statLabel}>Challenges Won</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getCompletionRate()}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Badge Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryFilter}>
            <Animated.View entering={FadeInUp.duration(600)}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === 'all' && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Star color={selectedCategory === 'all' ? '#FFFFFF' : '#6366F1'} size={20} />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === 'all' && styles.categoryButtonTextActive
                ]}>
                  All ({getTotalBadges()})
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            {badgeCategories.map((category, index) => (
              <Animated.View
                key={category.type}
                entering={FadeInUp.duration(600).delay(index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.type && {
                      backgroundColor: category.color,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category.type)}
                >
                  {React.cloneElement(category.icon, {
                    color: selectedCategory === category.type ? '#FFFFFF' : category.color
                  })}
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category.type && { color: '#FFFFFF' }
                  ]}>
                    {category.label} ({getBadgesByCategory(category.type)})
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Earned Badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Badges</Text>
        
        {getFilteredBadges().length > 0 ? (
          <View style={styles.badgesGrid}>
            {getFilteredBadges().map((badge, index) => (
              <Animated.View
                key={badge.id}
                entering={FadeInDown.duration(600).delay(index * 100)}
                style={styles.badgeCard}
              >
                <Text style={styles.badgeIcon}>{badge.badgeIcon}</Text>
                <Text style={styles.badgeName}>{badge.badgeName}</Text>
                <Text style={styles.badgeDescription}>{badge.badgeDescription}</Text>
                <Text style={styles.badgeDate}>
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </Text>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏆</Text>
            <Text style={styles.emptyStateText}>
              No badges in this category yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Keep using the app to earn your first badge!
            </Text>
          </View>
        )}
      </View>

      {/* Active Challenges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target color="#6366F1" size={20} />
          <Text style={styles.sectionTitle}>Active Challenges</Text>
        </View>
        
        {activeChallenges.map((challenge, index) => {
          const userProgress = getChallengeProgress(challenge.id);
          const progressPercentage = userProgress 
            ? Math.min((userProgress.currentProgress / challenge.targetValue) * 100, 100)
            : 0;
          
          return (
            <Animated.View
              key={challenge.id}
              entering={FadeInUp.duration(600).delay(index * 100)}
              style={[
                styles.challengeCard,
                userProgress?.isCompleted && styles.completedChallengeCard
              ]}
            >
              <View style={styles.challengeHeader}>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                  <Text style={styles.challengeMeta}>
                    {challenge.challengeType.charAt(0).toUpperCase() + challenge.challengeType.slice(1)} Challenge • 
                    Target: {challenge.targetValue} {challenge.targetMetric.replace('_', ' ')}
                  </Text>
                </View>
                
                {userProgress?.isCompleted && (
                  <View style={styles.completedBadge}>
                    <CheckCircle color="#10B981" size={24} />
                  </View>
                )}
              </View>
              
              {userProgress ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressText}>
                      Progress: {userProgress.currentProgress} / {challenge.targetValue}
                    </Text>
                    <Text style={styles.progressPercentage}>
                      {Math.round(progressPercentage)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${progressPercentage}%` }
                      ]}
                    />
                  </View>
                  {userProgress.isCompleted && (
                    <Text style={styles.completedText}>
                      🎉 Completed on {new Date(userProgress.completedAt || '').toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.joinButton}
                  onPress={() => joinChallenge(challenge)}
                >
                  <Text style={styles.joinButtonText}>Join Challenge</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.challengeReward}>
                <Award color="#F59E0B" size={16} />
                <Text style={styles.rewardText}>
                  Reward: {challenge.rewardBadge} Badge
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Motivational Message */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(1000)}
        style={styles.motivationCard}
      >
        <Text style={styles.motivationIcon}>🌟</Text>
        <Text style={styles.motivationTitle}>Keep Going!</Text>
        <Text style={styles.motivationText}>
          Every badge represents a step forward in your wellness journey. 
          Challenges help you build healthy habits while having fun!
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  categoriesContainer: {
    paddingVertical: 20,
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#6366F1',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
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
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDate: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completedChallengeCard: {
    borderWidth: 2,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  challengeMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  completedBadge: {
    marginLeft: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rewardText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    marginLeft: 6,
  },
  motivationCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  motivationIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  motivationText: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});