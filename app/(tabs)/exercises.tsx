import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Star, 
  Filter,
  Heart,
  Brain,
  Wind,
  Activity,
  CheckCircle,
  RotateCcw,
  X
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface GuidedExercise {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  difficultyLevel: number;
  audioUrl?: string;
  instructions: string;
  tags: string;
  isPremium: boolean;
  createdAt: string;
}

interface ExerciseSession {
  id: string;
  userId: string;
  exerciseId: string;
  durationCompleted: number;
  completionPercentage: number;
  rating?: number;
  notes?: string;
  createdAt: string;
}

const categories = [
  { value: 'all', label: 'All', icon: <Heart color="#6366F1" size={20} />, color: '#6366F1' },
  { value: 'meditation', label: 'Meditation', icon: <Brain color="#8B5CF6" size={20} />, color: '#8B5CF6' },
  { value: 'breathing', label: 'Breathing', icon: <Wind color="#10B981" size={20} />, color: '#10B981' },
  { value: 'mindfulness', label: 'Mindfulness', icon: <Star color="#F59E0B" size={20} />, color: '#F59E0B' },
  { value: 'movement', label: 'Movement', icon: <Activity color="#EF4444" size={20} />, color: '#EF4444' },
];

export default function ExercisesScreen() {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState<GuidedExercise[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentExercise, setCurrentExercise] = useState<GuidedExercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadExerciseData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadExerciseData = async () => {
    try {
      // Load guided exercises
      const guidedExercises = await blink.db.guidedExercises.list({
        orderBy: { createdAt: 'desc' },
        limit: 20
      });
      setExercises(guidedExercises);

      // Load user's exercise sessions
      const userSessions = await blink.db.exerciseSessions.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 10
      });
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading exercise data:', error);
    }
  };

  const startExercise = async (exercise: GuidedExercise) => {
    setCurrentExercise(exercise);
    setCurrentStep(0);
    setSessionProgress(0);
    setIsPlaying(false);
    setShowPlayer(true);
  };

  const playPauseExercise = () => {
    if (!currentExercise) return;
    
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      // Start the exercise timer
      const stepDuration = (currentExercise.duration * 60 * 1000) / getInstructions().length;
      
      const timer = setInterval(() => {
        setSessionProgress(prev => {
          const newProgress = prev + (100 / (currentExercise.duration * 60));
          
          if (newProgress >= 100) {
            clearInterval(timer);
            completeExercise();
            return 100;
          }
          
          // Move to next step
          const newStep = Math.floor((newProgress / 100) * getInstructions().length);
          setCurrentStep(newStep);
          
          return newProgress;
        });
      }, 1000);
    }
  };

  const stopExercise = () => {
    setIsPlaying(false);
    setSessionProgress(0);
    setCurrentStep(0);
  };

  const completeExercise = async () => {
    if (!currentExercise || !user) return;

    try {
      // Save exercise session
      await blink.db.exerciseSessions.create({
        userId: user.id,
        exerciseId: currentExercise.id,
        durationCompleted: currentExercise.duration,
        completionPercentage: 100,
        createdAt: new Date().toISOString().split('T')[0]
      });

      // Generate AI feedback
      const prompt = `A student just completed a ${currentExercise.duration}-minute ${currentExercise.category} exercise called "${currentExercise.title}". Generate encouraging feedback (2-3 sentences) and suggest what they might do next for their wellness journey.`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 150
      });

      Alert.alert(
        'Exercise Complete! 🎉',
        text,
        [
          { text: 'Rate Exercise', onPress: () => showRatingModal() },
          { text: 'Done', onPress: () => setShowPlayer(false) }
        ]
      );

      await loadExerciseData();
    } catch (error) {
      console.error('Error completing exercise:', error);
    }
  };

  const showRatingModal = () => {
    Alert.alert(
      'Rate This Exercise',
      'How was your experience?',
      [
        { text: '⭐', onPress: () => rateExercise(1) },
        { text: '⭐⭐', onPress: () => rateExercise(2) },
        { text: '⭐⭐⭐', onPress: () => rateExercise(3) },
        { text: '⭐⭐⭐⭐', onPress: () => rateExercise(4) },
        { text: '⭐⭐⭐⭐⭐', onPress: () => rateExercise(5) },
      ]
    );
  };

  const rateExercise = async (rating: number) => {
    // In a real app, this would update the session with the rating
    Alert.alert('Thank you!', 'Your feedback helps us improve your experience.');
  };

  const getInstructions = (): string[] => {
    if (!currentExercise) return [];
    try {
      return JSON.parse(currentExercise.instructions);
    } catch {
      return currentExercise.instructions.split('\n').filter(line => line.trim());
    }
  };

  const getFilteredExercises = () => {
    if (selectedCategory === 'all') return exercises;
    return exercises.filter(exercise => exercise.category === selectedCategory);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(cat => cat.value === category) || categories[0];
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

  const getCompletedCount = () => {
    return sessions.filter(session => session.completionPercentage === 100).length;
  };

  const getTotalMinutes = () => {
    return sessions.reduce((total, session) => total + session.durationCompleted, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading guided exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Brain color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Guided Exercises</Text>
          <Text style={styles.headerSubtitle}>
            Mindfulness, meditation & wellness activities
          </Text>
        </View>
        
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getCompletedCount()}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTotalMinutes()}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryFilter}>
              {categories.map((category, index) => (
                <Animated.View
                  key={category.value}
                  entering={FadeInUp.duration(600).delay(index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.value && {
                        backgroundColor: category.color,
                      }
                    ]}
                    onPress={() => setSelectedCategory(category.value)}
                  >
                    {React.cloneElement(category.icon, {
                      color: selectedCategory === category.value ? '#FFFFFF' : category.color
                    })}
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category.value && { color: '#FFFFFF' }
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          {getFilteredExercises().map((exercise, index) => (
            <Animated.View
              key={exercise.id}
              entering={FadeInDown.duration(600).delay(index * 100)}
              style={styles.exerciseCard}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <View style={styles.exerciseIcon}>
                    {getCategoryInfo(exercise.category).icon}
                  </View>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.duration} min • {getDifficultyLabel(exercise.difficultyLevel)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.exerciseBadges}>
                  <View 
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(exercise.difficultyLevel) }
                    ]}
                  >
                    <Text style={styles.difficultyText}>
                      {getDifficultyLabel(exercise.difficultyLevel)}
                    </Text>
                  </View>
                  {exercise.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Star color="#F59E0B" size={12} />
                    </View>
                  )}
                </View>
              </View>
              
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              
              {exercise.tags && (
                <View style={styles.tagsContainer}>
                  {exercise.tags.split(',').map((tag, tagIndex) => (
                    <View key={tagIndex} style={styles.tag}>
                      <Text style={styles.tagText}>{tag.trim()}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => startExercise(exercise)}
              >
                <Play color="#FFFFFF" size={16} />
                <Text style={styles.playButtonText}>Start Exercise</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            
            {sessions.slice(0, 3).map((session, index) => {
              const exercise = exercises.find(ex => ex.id === session.exerciseId);
              if (!exercise) return null;
              
              return (
                <Animated.View
                  key={session.id}
                  entering={FadeInUp.duration(600).delay(index * 100)}
                  style={styles.sessionCard}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <CheckCircle color="#10B981" size={20} />
                      <View style={styles.sessionDetails}>
                        <Text style={styles.sessionTitle}>{exercise.title}</Text>
                        <Text style={styles.sessionDate}>
                          {new Date(session.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.sessionDuration}>
                      {session.durationCompleted} min
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Exercise Player Modal */}
      <Modal
        visible={showPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.playerContainer}
        >
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setShowPlayer(false)}>
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>
              {currentExercise?.title || 'Exercise'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          {currentExercise && (
            <View style={styles.playerContent}>
              {/* Progress Circle */}
              <View style={styles.progressContainer}>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressText}>
                    {Math.round(sessionProgress)}%
                  </Text>
                </View>
              </View>
              
              {/* Current Instruction */}
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionTitle}>
                  Step {currentStep + 1} of {getInstructions().length}
                </Text>
                <Text style={styles.instructionText}>
                  {getInstructions()[currentStep] || 'Get ready to begin...'}
                </Text>
              </View>
              
              {/* Controls */}
              <View style={styles.playerControls}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={stopExercise}
                >
                  <Square color="#FFFFFF" size={24} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton, styles.playPauseButton]}
                  onPress={playPauseExercise}
                >
                  {isPlaying ? (
                    <Pause color="#10B981" size={32} />
                  ) : (
                    <Play color="#10B981" size={32} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={() => setSessionProgress(0)}
                >
                  <RotateCcw color="#FFFFFF" size={24} />
                </TouchableOpacity>
              </View>
              
              {/* Exercise Info */}
              <View style={styles.exerciseInfoContainer}>
                <Text style={styles.exerciseInfoText}>
                  {currentExercise.duration} minutes • {getDifficultyLabel(currentExercise.difficultyLevel)}
                </Text>
                <Text style={styles.exerciseInfoDescription}>
                  {currentExercise.description}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </Modal>
    </View>
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
  filterContainer: {
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
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  exerciseList: {
    paddingHorizontal: 20,
  },
  exerciseCard: {
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  exerciseMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  exerciseBadges: {
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  difficultyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionDetails: {
    marginLeft: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionDuration: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  playerContainer: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  playerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  progressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  instructionTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
  },
  exerciseInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  exerciseInfoText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  exerciseInfoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});