import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
// import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  Brain,
  Heart,
  Activity,
  Clock,
  Zap,
  Star
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

const screenWidth = Dimensions.get('window').width;

interface MoodTrend {
  date: string;
  mood: number;
  note?: string;
}

interface AnalyticsData {
  moodTrends: MoodTrend[];
  weeklyAverage: number;
  monthlyAverage: number;
  streakDays: number;
  totalSessions: number;
  favoriteCategory: string;
  stressPatterns: { [key: string]: number };
  improvementScore: number;
}

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#6366F1',
  },
};

export default function AnalyticsScreen() {
  const [user, setUser] = useState(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    moodTrends: [],
    weeklyAverage: 0,
    monthlyAverage: 0,
    streakDays: 0,
    totalSessions: 0,
    favoriteCategory: 'meditation',
    stressPatterns: {},
    improvementScore: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadAnalyticsData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load mood entries for trends
      const moodEntries = await blink.db.moodEntries.list({
        where: { user_id: user?.id },
        orderBy: { created_at: 'desc' },
        limit: 30
      });

      // Load exercise sessions
      const sessions = await blink.db.exerciseSessions.list({
        where: { user_id: user?.id },
        orderBy: { created_at: 'desc' },
        limit: 50
      });

      // Load academic events for stress analysis
      const academicEvents = await blink.db.academicEvents.list({
        where: { user_id: user?.id },
        orderBy: { start_date: 'desc' },
        limit: 20
      });

      // Process data for analytics
      const processedData = await processAnalyticsData(moodEntries, sessions, academicEvents);
      setAnalyticsData(processedData);

      // Generate AI insights based on patterns
      await generateAIInsights(processedData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const processAnalyticsData = async (moodEntries: any[], sessions: any[], academicEvents: any[]): Promise<AnalyticsData> => {
    // Process mood trends
    const moodTrends = moodEntries.map(entry => ({
      date: entry.created_at || entry.createdAt,
      mood: entry.mood,
      note: entry.note
    })).reverse();

    // Calculate averages
    const weeklyMoods = moodEntries.slice(0, 7);
    const monthlyMoods = moodEntries.slice(0, 30);
    
    const weeklyAverage = weeklyMoods.length > 0 
      ? weeklyMoods.reduce((sum, entry) => sum + entry.mood, 0) / weeklyMoods.length 
      : 0;
    
    const monthlyAverage = monthlyMoods.length > 0 
      ? monthlyMoods.reduce((sum, entry) => sum + entry.mood, 0) / monthlyMoods.length 
      : 0;

    // Calculate streak
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const hasEntry = moodEntries.some(entry => (entry.created_at || entry.createdAt) === dateString);
      if (hasEntry) {
        streakDays++;
      } else {
        break;
      }
    }

    // Analyze stress patterns
    const stressPatterns: { [key: string]: number } = {};
    academicEvents.forEach(event => {
      const eventType = event.event_type || event.eventType;
      if (!stressPatterns[eventType]) {
        stressPatterns[eventType] = 0;
      }
      stressPatterns[eventType] += event.stress_level || event.stressLevel || 1;
    });

    // Calculate improvement score
    const recentMoods = moodEntries.slice(0, 7);
    const olderMoods = moodEntries.slice(7, 14);
    
    const recentAvg = recentMoods.length > 0 
      ? recentMoods.reduce((sum, entry) => sum + entry.mood, 0) / recentMoods.length 
      : 0;
    
    const olderAvg = olderMoods.length > 0 
      ? olderMoods.reduce((sum, entry) => sum + entry.mood, 0) / olderMoods.length 
      : 0;
    
    const improvementScore = Math.max(0, Math.min(100, ((recentAvg - olderAvg) + 2) * 25));

    return {
      moodTrends,
      weeklyAverage,
      monthlyAverage,
      streakDays,
      totalSessions: sessions.length,
      favoriteCategory: 'meditation', // This would be calculated from session data
      stressPatterns,
      improvementScore
    };
  };

  const generateAIInsights = async (data: AnalyticsData) => {
    try {
      const prompt = `Analyze this student's wellness data and provide insights:
      - Weekly mood average: ${data.weeklyAverage.toFixed(1)}/5
      - Monthly mood average: ${data.monthlyAverage.toFixed(1)}/5
      - Current streak: ${data.streakDays} days
      - Total exercise sessions: ${data.totalSessions}
      - Improvement score: ${data.improvementScore}%
      
      Provide 2-3 key insights and actionable recommendations for their wellness journey.`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 300
      });

      // Save AI insight
      await blink.db.aiInsights.create({
        user_id: user?.id || '',
        insight_type: 'analytics_summary',
        title: 'Your Wellness Analytics Summary',
        description: text,
        confidence_score: 0.85,
        action_suggested: 'Review your patterns and set new goals',
        is_read: "0",
        created_at: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error generating AI insights:', error);
    }
  };

  const getMoodChartData = () => {
    const filteredData = getFilteredMoodData();
    
    return {
      labels: filteredData.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: filteredData.map(item => item.mood),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3,
      }]
    };
  };

  const getFilteredMoodData = () => {
    const now = new Date();
    let daysBack = 7;
    
    switch (selectedPeriod) {
      case 'week': daysBack = 7; break;
      case 'month': daysBack = 30; break;
      case 'year': daysBack = 365; break;
    }
    
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return analyticsData.moodTrends.filter(trend => 
      new Date(trend.date) >= cutoffDate
    ).slice(-10); // Show last 10 data points for readability
  };

  const getStressPatternData = () => {
    const patterns = analyticsData.stressPatterns;
    const colors = ['#EF4444', '#F59E0B', '#6366F1', '#EC4899', '#10B981'];
    
    return Object.entries(patterns).map(([type, value], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      population: value,
      color: colors[index % colors.length],
      legendFontColor: '#1F2937',
      legendFontSize: 14,
    }));
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4.5) return '😊';
    if (mood >= 3.5) return '🙂';
    if (mood >= 2.5) return '😐';
    if (mood >= 1.5) return '😔';
    return '😢';
  };

  const getImprovementColor = (score: number) => {
    if (score >= 75) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getImprovementLabel = (score: number) => {
    if (score >= 75) return 'Excellent Progress';
    if (score >= 50) return 'Good Progress';
    if (score >= 25) return 'Some Progress';
    return 'Keep Going';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your analytics...</Text>
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
          <TrendingUp color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Your Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Insights into your wellness journey
          </Text>
        </View>
      </LinearGradient>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.metricsGrid}
        >
          <View style={styles.metricCard}>
            <Heart color="#EC4899" size={24} />
            <Text style={styles.metricValue}>
              {analyticsData.weeklyAverage.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>Weekly Avg</Text>
            <Text style={styles.metricEmoji}>
              {getMoodEmoji(analyticsData.weeklyAverage)}
            </Text>
          </View>
          
          <View style={styles.metricCard}>
            <Award color="#F59E0B" size={24} />
            <Text style={styles.metricValue}>{analyticsData.streakDays}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
            <Text style={styles.metricEmoji}>🔥</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Activity color="#10B981" size={24} />
            <Text style={styles.metricValue}>{analyticsData.totalSessions}</Text>
            <Text style={styles.metricLabel}>Sessions</Text>
            <Text style={styles.metricEmoji}>💪</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Star color="#8B5CF6" size={24} />
            <Text style={styles.metricValue}>
              {Math.round(analyticsData.improvementScore)}%
            </Text>
            <Text style={styles.metricLabel}>Progress</Text>
            <Text style={styles.metricEmoji}>📈</Text>
          </View>
        </Animated.View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((period, index) => (
          <Animated.View
            key={period}
            entering={FadeInUp.duration(600).delay(index * 100)}
          >
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Mood Trend Chart */}
      {analyticsData.moodTrends.length > 0 && (
        <Animated.View 
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.chartContainer}
        >
          <View style={styles.chartHeader}>
            <Brain color="#6366F1" size={20} />
            <Text style={styles.chartTitle}>Mood Trends</Text>
          </View>
          
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              📈 Mood Trend Chart
            </Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Weekly Average: {analyticsData.weeklyAverage.toFixed(1)}/5
            </Text>
          </View>
          
          <View style={styles.chartInsight}>
            <Text style={styles.insightText}>
              Your mood has been {analyticsData.weeklyAverage > analyticsData.monthlyAverage ? 'improving' : 'stable'} recently. 
              Keep up the great work with your wellness practices!
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Improvement Score */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(400)}
        style={styles.improvementContainer}
      >
        <View style={styles.improvementHeader}>
          <Target color="#6366F1" size={20} />
          <Text style={styles.chartTitle}>Wellness Progress</Text>
        </View>
        
        <View style={styles.improvementCard}>
          <View style={styles.improvementScore}>
            <Text style={[
              styles.improvementValue,
              { color: getImprovementColor(analyticsData.improvementScore) }
            ]}>
              {Math.round(analyticsData.improvementScore)}%
            </Text>
            <Text style={styles.improvementLabel}>
              {getImprovementLabel(analyticsData.improvementScore)}
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${analyticsData.improvementScore}%`,
                  backgroundColor: getImprovementColor(analyticsData.improvementScore)
                }
              ]}
            />
          </View>
          
          <Text style={styles.improvementDescription}>
            Based on your recent mood patterns compared to previous weeks
          </Text>
        </View>
      </Animated.View>

      {/* Stress Patterns */}
      {Object.keys(analyticsData.stressPatterns).length > 0 && (
        <Animated.View 
          entering={FadeInDown.duration(600).delay(600)}
          style={styles.chartContainer}
        >
          <View style={styles.chartHeader}>
            <Zap color="#6366F1" size={20} />
            <Text style={styles.chartTitle}>Stress Patterns</Text>
          </View>
          
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              📊 Stress Patterns Chart
            </Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Analyzing your stress triggers
            </Text>
          </View>
          
          <View style={styles.chartInsight}>
            <Text style={styles.insightText}>
              Understanding your stress triggers helps you prepare better wellness strategies.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Weekly Summary */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(800)}
        style={styles.summaryContainer}
      >
        <View style={styles.summaryHeader}>
          <Calendar color="#6366F1" size={20} />
          <Text style={styles.chartTitle}>This Week's Highlights</Text>
        </View>
        
        <View style={styles.highlightsList}>
          <View style={styles.highlightItem}>
            <View style={styles.highlightIcon}>
              <Heart color="#EC4899" size={16} />
            </View>
            <Text style={styles.highlightText}>
              Logged mood {Math.min(7, analyticsData.moodTrends.length)} times this week
            </Text>
          </View>
          
          <View style={styles.highlightItem}>
            <View style={styles.highlightIcon}>
              <Activity color="#10B981" size={16} />
            </View>
            <Text style={styles.highlightText}>
              Completed {analyticsData.totalSessions} wellness sessions
            </Text>
          </View>
          
          <View style={styles.highlightItem}>
            <View style={styles.highlightIcon}>
              <Clock color="#F59E0B" size={16} />
            </View>
            <Text style={styles.highlightText}>
              Maintained {analyticsData.streakDays}-day consistency streak
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Motivational Message */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(1000)}
        style={styles.motivationCard}
      >
        <Text style={styles.motivationIcon}>🌟</Text>
        <Text style={styles.motivationTitle}>Keep Growing!</Text>
        <Text style={styles.motivationText}>
          Your consistent effort in tracking and improving your mental health is making a real difference. 
          Every data point represents your commitment to wellness.
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
  metricsContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
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
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  metricEmoji: {
    fontSize: 20,
    marginTop: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartPlaceholder: {
    height: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  chartInsight: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  insightText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  improvementContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  improvementCard: {
    alignItems: 'center',
  },
  improvementScore: {
    alignItems: 'center',
    marginBottom: 20,
  },
  improvementValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  improvementLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  improvementDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightsList: {
    gap: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightText: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
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