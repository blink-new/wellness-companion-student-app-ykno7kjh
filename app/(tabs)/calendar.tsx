import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
// import { Calendar } from 'react-native-calendars';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  BookOpen, 
  AlertTriangle, 
  Clock, 
  Target,
  Bell,
  X,
  Save
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface AcademicEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate?: string;
  stressLevel: number;
  reminderSent: boolean;
  createdAt: string;
}

const eventTypes = [
  { value: 'exam', label: 'Exam', icon: '📝', color: '#EF4444' },
  { value: 'assignment', label: 'Assignment', icon: '📋', color: '#F59E0B' },
  { value: 'project', label: 'Project', icon: '🎯', color: '#6366F1' },
  { value: 'deadline', label: 'Deadline', icon: '⏰', color: '#EC4899' },
];

const stressLevels = [
  { value: 1, label: 'Very Low', color: '#10B981', emoji: '😌' },
  { value: 2, label: 'Low', color: '#84CC16', emoji: '🙂' },
  { value: 3, label: 'Moderate', color: '#F59E0B', emoji: '😐' },
  { value: 4, label: 'High', color: '#F97316', emoji: '😰' },
  { value: 5, label: 'Very High', color: '#EF4444', emoji: '😱' },
];

export default function CalendarScreen() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'exam',
    stressLevel: 3,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadCalendarData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadCalendarData = async () => {
    try {
      const academicEvents = await blink.db.academicEvents.list({
        where: { userId: user?.id },
        orderBy: { startDate: 'asc' },
        limit: 50
      });
      
      setEvents(academicEvents);
      
      // Generate AI-powered wellness reminders for upcoming high-stress events
      await generateWellnessReminders(academicEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const generateWellnessReminders = async (events: AcademicEvent[]) => {
    try {
      const upcomingHighStressEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        const today = new Date();
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil >= 0 && event.stressLevel >= 4 && !event.reminderSent;
      });

      for (const event of upcomingHighStressEvents) {
        const daysUntil = Math.ceil((new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        const prompt = `Generate a supportive wellness reminder for a student who has a ${event.eventType} "${event.title}" in ${daysUntil} days. The student rated this as stress level ${event.stressLevel}/5. Provide:
        1. A calming, encouraging message
        2. 2-3 specific wellness activities they can do today
        3. A study break reminder
        Keep it under 150 words and supportive.`;

        const { text } = await blink.ai.generateText({
          prompt,
          maxTokens: 200
        });

        // Save AI insight
        await blink.db.aiInsights.create({
          userId: user?.id || '',
          insightType: 'stress_reminder',
          title: `Wellness Reminder: ${event.title}`,
          description: text,
          confidenceScore: 0.9,
          actionSuggested: 'Take a 5-minute breathing break',
          isRead: false,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error generating wellness reminders:', error);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      await blink.db.academicEvents.create({
        userId: user?.id || '',
        title: newEvent.title,
        description: newEvent.description,
        eventType: newEvent.eventType,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate || null,
        stressLevel: newEvent.stressLevel,
        reminderSent: false,
        createdAt: new Date().toISOString().split('T')[0]
      });

      Alert.alert('Success', 'Event added to your calendar!');
      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        eventType: 'exam',
        stressLevel: 3,
        startDate: selectedDate,
        endDate: ''
      });
      
      await loadCalendarData();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    events.forEach(event => {
      const eventType = eventTypes.find(type => type.value === event.eventType);
      marked[event.startDate] = {
        marked: true,
        dotColor: eventType?.color || '#6366F1',
        selectedColor: eventType?.color || '#6366F1'
      };
    });

    // Highlight selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#6366F1'
      };
    }

    return marked;
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.startDate === date);
  };

  const getStressLevelInfo = (level: number) => {
    return stressLevels.find(s => s.value === level) || stressLevels[2];
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const getUpcomingEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(event => event.startDate >= today)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your academic calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <CalendarIcon color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Academic Calendar</Text>
          <Text style={styles.headerSubtitle}>
            Stay organized and stress-aware
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarPlaceholder}>
            <Text style={styles.calendarPlaceholderText}>
              📅 Academic Calendar
            </Text>
            <Text style={styles.calendarPlaceholderSubtext}>
              Selected: {new Date(selectedDate).toLocaleDateString()}
            </Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
              }}
            >
              <Text style={styles.datePickerButtonText}>Go to Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Events for Selected Date */}
        {getEventsForDate(selectedDate).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Events for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {getEventsForDate(selectedDate).map((event, index) => (
              <Animated.View
                key={event.id}
                entering={FadeInDown.duration(600).delay(index * 100)}
                style={styles.eventCard}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventIcon}>
                      {getEventTypeInfo(event.eventType).icon}
                    </Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventType}>
                        {getEventTypeInfo(event.eventType).label}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.stressIndicator}>
                    <Text style={styles.stressEmoji}>
                      {getStressLevelInfo(event.stressLevel).emoji}
                    </Text>
                    <Text style={styles.stressLevel}>
                      {getStressLevelInfo(event.stressLevel).label}
                    </Text>
                  </View>
                </View>
                
                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}
              </Animated.View>
            ))}
          </View>
        )}

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
          
          {getUpcomingEvents().length > 0 ? (
            getUpcomingEvents().map((event, index) => {
              const daysUntil = Math.ceil((new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <Animated.View
                  key={event.id}
                  entering={FadeInUp.duration(600).delay(index * 100)}
                  style={[
                    styles.upcomingEventCard,
                    daysUntil <= 3 && event.stressLevel >= 4 && styles.urgentEventCard
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventIcon}>
                        {getEventTypeInfo(event.eventType).icon}
                      </Text>
                      <View style={styles.eventDetails}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDate}>
                          {daysUntil === 0 ? 'Today' : 
                           daysUntil === 1 ? 'Tomorrow' : 
                           `In ${daysUntil} days`}
                        </Text>
                      </View>
                    </View>
                    
                    {daysUntil <= 3 && event.stressLevel >= 4 && (
                      <View style={styles.urgentBadge}>
                        <AlertTriangle color="#EF4444" size={16} />
                      </View>
                    )}
                  </View>
                  
                  {daysUntil <= 3 && event.stressLevel >= 4 && (
                    <TouchableOpacity style={styles.wellnessPrompt}>
                      <Bell color="#6366F1" size={16} />
                      <Text style={styles.wellnessPromptText}>
                        Take a wellness break before this high-stress event
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No upcoming events</Text>
          )}
        </View>

        {/* Stress Level Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Stress Level Overview</Text>
          </View>
          
          <View style={styles.stressOverview}>
            {stressLevels.map((level, index) => {
              const count = events.filter(e => e.stressLevel === level.value).length;
              return (
                <Animated.View
                  key={level.value}
                  entering={FadeInUp.duration(600).delay(index * 100)}
                  style={styles.stressLevelCard}
                >
                  <Text style={styles.stressLevelEmoji}>{level.emoji}</Text>
                  <Text style={styles.stressLevelCount}>{count}</Text>
                  <Text style={styles.stressLevelLabel}>{level.label}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Academic Event</Text>
            <TouchableOpacity onPress={addEvent}>
              <Save color="#6366F1" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Title *</Text>
              <TextInput
                style={styles.formInput}
                value={newEvent.title}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Math Final Exam"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={newEvent.description}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
                placeholder="Additional details..."
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Type</Text>
              <View style={styles.typeSelector}>
                {eventTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      newEvent.eventType === type.value && styles.typeOptionSelected
                    ]}
                    onPress={() => setNewEvent(prev => ({ ...prev, eventType: type.value }))}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeLabel,
                      newEvent.eventType === type.value && styles.typeLabelSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Stress Level</Text>
              <View style={styles.stressSelector}>
                {stressLevels.map(level => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.stressOption,
                      newEvent.stressLevel === level.value && {
                        backgroundColor: level.color,
                        borderColor: level.color
                      }
                    ]}
                    onPress={() => setNewEvent(prev => ({ ...prev, stressLevel: level.value }))}
                  >
                    <Text style={styles.stressOptionEmoji}>{level.emoji}</Text>
                    <Text style={[
                      styles.stressOptionLabel,
                      newEvent.stressLevel === level.value && { color: '#FFFFFF' }
                    ]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={newEvent.startDate}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, startDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </ScrollView>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  calendarPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 12,
  },
  calendarPlaceholderSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  datePickerButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  datePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  eventCard: {
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
  upcomingEventCard: {
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
  urgentEventCard: {
    borderWidth: 2,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  eventDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  stressIndicator: {
    alignItems: 'center',
  },
  stressEmoji: {
    fontSize: 20,
  },
  stressLevel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  urgentBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wellnessPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  wellnessPromptText: {
    fontSize: 14,
    color: '#0369A1',
    marginLeft: 8,
    flex: 1,
  },
  stressOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stressLevelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stressLevelEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  stressLevelCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stressLevelLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeOption: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F9FF',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeLabelSelected: {
    color: '#6366F1',
  },
  stressSelector: {
    gap: 8,
  },
  stressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stressOptionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  stressOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
});