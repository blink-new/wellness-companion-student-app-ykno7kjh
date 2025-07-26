import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Sparkles, 
  Target, 
  Clock, 
  TrendingUp, 
  Brain, 
  BookOpen,
  Heart,
  Zap,
  CheckCircle,
  Play
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface WellnessJourney {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  difficultyLevel: number;
  estimatedDuration: number;
  aiRecommended: boolean;
  progress: number;
  isCompleted: boolean;
  createdAt: string;
}

interface AIInsight {
  id: string;
  userId: string;
  insightType: string;
  title: string;
  description: string;
  confidenceScore: number;
  actionSuggested: string;
  isRead: boolean;
  createdAt: string;
}

export default function JourneyScreen() {
  const [user, setUser] = useState(null);
  const [activeJourneys, setActiveJourneys] = useState<WellnessJourney[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [recommendedJourneys, setRecommendedJourneys] = useState<WellnessJourney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadJourneyData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadJourneyData = async () => {
    try {
      // Load active journeys
      const journeys = await blink.db.wellnessJourneys.list({
        where: { 
          userId: user?.id,
          isCompleted: "0"
        },
        orderBy: { createdAt: 'desc' },
        limit: 10
      });
      setActiveJourneys(journeys);

      // Load AI insights
      const insights = await blink.db.aiInsights.list({
        where: { 
          userId: user?.id,
          isRead: "0"
        },
        orderBy: { createdAt: 'desc' },
        limit: 5
      });
      setAIInsights(insights);

      // Generate AI-powered recommendations
      await generatePersonalizedRecommendations();
    } catch (error) {
      console.error('Error loading journey data:', error);
    }
  };

  const generatePersonalizedRecommendations = async () => {
    try {
      // Get user's recent mood data for personalization
      const recentMoods = await blink.db.moodEntries.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 7
      });

      const avgMood = recentMoods.length > 0 
        ? recentMoods.reduce((sum, entry) => sum + entry.mood, 0) / recentMoods.length 
        : 3;

      // Generate AI recommendations based on mood patterns
      const prompt = `Based on a student's recent mood average of ${avgMood}/5, recommend 3 personalized wellness journeys. Consider:
      - If mood is low (1-2): Focus on stress relief, self-compassion, crisis support
      - If mood is neutral (3): Focus on building resilience, study skills, social connection
      - If mood is high (4-5): Focus on maintaining wellness, goal setting, helping others
      
      Return a JSON array with: title, description, category, estimatedDuration (minutes), difficultyLevel (1-3)`;

      const { object } = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  estimatedDuration: { type: 'number' },
                  difficultyLevel: { type: 'number' }
                }
              }
            }
          }
        }
      });

      // Create recommended journeys
      const recommendations = object.recommendations.map((rec, index) => ({
        id: `ai_rec_${Date.now()}_${index}`,
        userId: user?.id || '',
        title: rec.title,
        description: rec.description,
        category: rec.category,
        difficultyLevel: rec.difficultyLevel,
        estimatedDuration: rec.estimatedDuration,
        aiRecommended: true,
        progress: 0,
        isCompleted: false,
        createdAt: new Date().toISOString()
      }));

      setRecommendedJourneys(recommendations);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      // Fallback to static recommendations
      setRecommendedJourneys([
        {
          id: 'static_1',
          userId: user?.id || '',
          title: 'Stress-Free Study Sessions',
          description: 'Learn techniques to stay calm and focused during study time',
          category: 'academic',
          difficultyLevel: 1,
          estimatedDuration: 15,
          aiRecommended: true,
          progress: 0,
          isCompleted: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'static_2',
          userId: user?.id || '',
          title: 'Building Social Confidence',
          description: 'Develop skills for meaningful connections with peers',
          category: 'social',
          difficultyLevel: 2,
          estimatedDuration: 20,
          aiRecommended: true,
          progress: 0,
          isCompleted: false,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const startJourney = async (journey: WellnessJourney) => {
    try {
      // Save journey to database
      await blink.db.wellnessJourneys.create({
        id: journey.id,
        userId: user?.id || '',
        title: journey.title,
        description: journey.description,
        category: journey.category,
        difficultyLevel: journey.difficultyLevel,
        estimatedDuration: journey.estimatedDuration,
        aiRecommended: journey.aiRecommended,
        progress: 0,
        isCompleted: false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      });

      Alert.alert(
        'Journey Started! 🌟',
        `You've begun "${journey.title}". Your personalized wellness journey awaits!`,
        [{ text: 'Let\'s Go!' }]
      );

      // Reload data
      await loadJourneyData();
    } catch (error) {
      console.error('Error starting journey:', error);
      Alert.alert('Error', 'Failed to start journey. Please try again.');
    }
  };

  const continueJourney = (journey: WellnessJourney) => {
    Alert.alert(
      'Continue Journey',
      `Resume "${journey.title}" - ${journey.progress}% complete`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {} }
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic': return <BookOpen color="#6366F1" size={20} />;
      case 'stress': return <Zap color="#EF4444" size={20} />;
      case 'social': return <Heart color="#EC4899" size={20} />;
      case 'sleep': return <Clock color="#8B5CF6" size={20} />;
      default: return <Target color="#10B981" size={20} />;
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return '#10B981';
      case 2: return '#F59E0B';
      case 3: return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Intermediate';
      case 3: return 'Advanced';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your wellness journey...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Sparkles color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Your Wellness Journey</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered personalized support for your well-being
          </Text>
        </View>
      </LinearGradient>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>AI Insights</Text>
          </View>
          
          {aiInsights.map((insight, index) => (
            <Animated.View
              key={insight.id}
              entering={FadeInDown.duration(600).delay(index * 100)}
              style={styles.insightCard}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <View style={styles.confidenceScore}>
                  <Text style={styles.confidenceText}>
                    {Math.round(insight.confidenceScore * 100)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              {insight.actionSuggested && (
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>{insight.actionSuggested}</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ))}
        </View>
      )}

      {/* Active Journeys */}
      {activeJourneys.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Continue Your Journey</Text>
          </View>
          
          {activeJourneys.map((journey, index) => (
            <Animated.View
              key={journey.id}
              entering={FadeInDown.duration(600).delay(index * 100)}
              style={styles.journeyCard}
            >
              <View style={styles.journeyHeader}>
                <View style={styles.journeyInfo}>
                  {getCategoryIcon(journey.category)}
                  <View style={styles.journeyDetails}>
                    <Text style={styles.journeyTitle}>{journey.title}</Text>
                    <Text style={styles.journeyMeta}>
                      {journey.estimatedDuration} min • {getDifficultyLabel(journey.difficultyLevel)}
                    </Text>
                  </View>
                </View>
                {journey.aiRecommended && (
                  <View style={styles.aiTag}>
                    <Sparkles color="#6366F1" size={12} />
                    <Text style={styles.aiTagText}>AI</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.journeyDescription}>{journey.description}</Text>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${journey.progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{journey.progress}% complete</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={() => continueJourney(journey)}
              >
                <Play color="#FFFFFF" size={16} />
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* AI Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Sparkles color="#6366F1" size={20} />
          <Text style={styles.sectionTitle}>Recommended for You</Text>
        </View>
        
        {recommendedJourneys.map((journey, index) => (
          <Animated.View
            key={journey.id}
            entering={FadeInUp.duration(600).delay(index * 150)}
            style={styles.recommendationCard}
          >
            <View style={styles.recommendationHeader}>
              <View style={styles.journeyInfo}>
                {getCategoryIcon(journey.category)}
                <View style={styles.journeyDetails}>
                  <Text style={styles.journeyTitle}>{journey.title}</Text>
                  <Text style={styles.journeyMeta}>
                    {journey.estimatedDuration} min • {getDifficultyLabel(journey.difficultyLevel)}
                  </Text>
                </View>
              </View>
              <View style={styles.difficultyBadge}>
                <View 
                  style={[
                    styles.difficultyDot, 
                    { backgroundColor: getDifficultyColor(journey.difficultyLevel) }
                  ]} 
                />
              </View>
            </View>
            
            <Text style={styles.journeyDescription}>{journey.description}</Text>
            
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => startJourney(journey)}
            >
              <Text style={styles.startButtonText}>Start Journey</Text>
              <Sparkles color="#6366F1" size={16} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Journey Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore by Category</Text>
        
        <View style={styles.categoriesGrid}>
          {[
            { name: 'Academic Success', icon: '📚', color: '#6366F1' },
            { name: 'Stress Relief', icon: '🧘', color: '#EF4444' },
            { name: 'Social Skills', icon: '👥', color: '#EC4899' },
            { name: 'Sleep & Rest', icon: '😴', color: '#8B5CF6' },
            { name: 'Self-Care', icon: '💚', color: '#10B981' },
            { name: 'Mindfulness', icon: '🌸', color: '#F59E0B' },
          ].map((category, index) => (
            <Animated.View
              key={category.name}
              entering={FadeInUp.duration(600).delay(index * 100)}
            >
              <TouchableOpacity style={styles.categoryCard}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Motivational Message */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(1000)}
        style={styles.motivationCard}
      >
        <Text style={styles.motivationIcon}>🌟</Text>
        <Text style={styles.motivationTitle}>Your Journey Matters</Text>
        <Text style={styles.motivationText}>
          Every step you take towards better mental health is a victory. Our AI learns from your progress to provide increasingly personalized support.
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
  insightCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    flex: 1,
  },
  confidenceScore: {
    backgroundColor: '#0369A1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  insightDescription: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#0369A1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  journeyCard: {
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
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  journeyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  journeyDetails: {
    marginLeft: 12,
    flex: 1,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  journeyMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  journeyDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiTagText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: 4,
  },
  difficultyBadge: {
    alignItems: 'center',
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  startButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  categoryCard: {
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
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});