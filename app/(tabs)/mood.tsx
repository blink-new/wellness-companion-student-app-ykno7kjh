import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Calendar, TrendingUp, MessageCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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

const moodOptions = [
  { value: 1, emoji: '😢', label: 'Very Low', color: '#EF4444' },
  { value: 2, emoji: '😔', label: 'Low', color: '#F97316' },
  { value: 3, emoji: '😐', label: 'Neutral', color: '#EAB308' },
  { value: 4, emoji: '🙂', label: 'Good', color: '#84CC16' },
  { value: 5, emoji: '😊', label: 'Great', color: '#10B981' },
];

export default function MoodScreen() {
  const [user, setUser] = useState(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadMoodData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadMoodData = async () => {
    try {
      if (!user?.id) return;
      
      // Check if user already logged mood today
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = await blink.db.moodEntries.list({
        where: { 
          userId: user.id,
          createdAt: today
        },
        limit: 1
      });

      if (todayEntries.length > 0) {
        setSelectedMood(todayEntries[0].mood);
        setMoodNote(todayEntries[0].note || '');
      }

      // Load recent mood entries
      const entries = await blink.db.moodEntries.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 7
      });
      
      setRecentEntries(entries);
    } catch (error) {
      console.error('Error loading mood data:', error);
    }
  };

  const handleMoodSubmit = async () => {
    if (!selectedMood || !user) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if entry exists for today
      const existingEntries = await blink.db.moodEntries.list({
        where: { 
          userId: user.id,
          createdAt: today
        },
        limit: 1
      });

      if (existingEntries.length > 0) {
        // Update existing entry
        await blink.db.moodEntries.update(existingEntries[0].id, {
          mood: selectedMood,
          note: moodNote.trim() || null,
        });
      } else {
        // Create new entry
        await blink.db.moodEntries.create({
          userId: user.id,
          mood: selectedMood,
          note: moodNote.trim() || null,
          createdAt: today,
        });
      }

      Alert.alert(
        'Mood Logged! 🎉',
        'Thank you for checking in. Your wellness journey matters.',
        [{ text: 'OK' }]
      );

      // Reload data
      await loadMoodData();
    } catch (error) {
      console.error('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save your mood. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMoodColor = (mood: number) => {
    const option = moodOptions.find(opt => opt.value === mood);
    return option?.color || '#6B7280';
  };

  const getMoodEmoji = (mood: number) => {
    const option = moodOptions.find(opt => opt.value === mood);
    return option?.emoji || '😐';
  };

  const getMoodLabel = (mood: number) => {
    const option = moodOptions.find(opt => opt.value === mood);
    return option?.label || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading mood tracker...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#EC4899', '#F97316']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Heart color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Mood Check-in</Text>
          <Text style={styles.headerSubtitle}>
            How are you feeling today?
          </Text>
        </View>
      </LinearGradient>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Your Mood</Text>
        
        <View style={styles.moodGrid}>
          {moodOptions.map((option, index) => (
            <Animated.View
              key={option.value}
              entering={FadeInUp.duration(600).delay(index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.moodOption,
                  selectedMood === option.value && {
                    backgroundColor: option.color,
                    transform: [{ scale: 1.1 }],
                  }
                ]}
                onPress={() => setSelectedMood(option.value)}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  selectedMood === option.value && { color: '#FFFFFF' }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Mood Note */}
      {selectedMood && (
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.section}
        >
          <View style={styles.noteHeader}>
            <MessageCircle color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Add a Note (Optional)</Text>
          </View>
          
          <TextInput
            style={styles.noteInput}
            placeholder="What's on your mind? Share your thoughts..."
            value={moodNote}
            onChangeText={setMoodNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: getMoodColor(selectedMood) }
            ]}
            onPress={handleMoodSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Saving...' : 'Log My Mood'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <TrendingUp color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Your Mood Journey</Text>
          </View>
          
          {recentEntries.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.duration(600).delay(index * 100)}
              style={styles.entryCard}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryMood}>
                  <Text style={styles.entryEmoji}>
                    {getMoodEmoji(entry.mood)}
                  </Text>
                  <View>
                    <Text style={styles.entryLabel}>
                      {getMoodLabel(entry.mood)}
                    </Text>
                    <Text style={styles.entryDate}>
                      {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                </View>
                
                <View 
                  style={[
                    styles.moodIndicator,
                    { backgroundColor: getMoodColor(entry.mood) }
                  ]}
                />
              </View>
              
              {entry.note && (
                <Text style={styles.entryNote}>"{entry.note}"</Text>
              )}
            </Animated.View>
          ))}
        </View>
      )}

      {/* Encouragement Message */}
      <Animated.View 
        entering={FadeInDown.duration(600).delay(800)}
        style={styles.encouragementCard}
      >
        <Text style={styles.encouragementIcon}>🌟</Text>
        <Text style={styles.encouragementText}>
          Every mood is valid. By tracking your feelings, you're taking an important step in understanding yourself better.
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  moodOption: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMood: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  entryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  entryDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  entryNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 20,
  },
  encouragementCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  encouragementIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  encouragementText: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});