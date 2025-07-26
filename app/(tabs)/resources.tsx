import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Search, Play, FileText, Headphones, Video, Clock, Star } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'audio' | 'exercise';
  category: string;
  duration: string;
  rating: number;
  thumbnail: string;
  url?: string;
}

const resourceCategories = [
  { id: 'all', name: 'All Resources', icon: '📚' },
  { id: 'stress-management', name: 'Stress Management', icon: '🧘' },
  { id: 'study-skills', name: 'Study Skills', icon: '📖' },
  { id: 'social-skills', name: 'Social Skills', icon: '👥' },
  { id: 'self-care', name: 'Self Care', icon: '💆' },
  { id: 'motivation', name: 'Motivation', icon: '⚡' },
  { id: 'crisis-support', name: 'Crisis Support', icon: '🆘' },
];

const sampleResources: Resource[] = [
  {
    id: '1',
    title: 'The 4-7-8 Breathing Technique',
    description: 'A simple breathing exercise to reduce anxiety and promote relaxation before exams.',
    type: 'exercise',
    category: 'stress-management',
    duration: '5 min',
    rating: 4.8,
    thumbnail: '🫁',
  },
  {
    id: '2',
    title: 'Effective Study Strategies for College Students',
    description: 'Evidence-based techniques to improve focus, retention, and academic performance.',
    type: 'article',
    category: 'study-skills',
    duration: '8 min read',
    rating: 4.6,
    thumbnail: '📚',
  },
  {
    id: '3',
    title: 'Overcoming Social Anxiety in College',
    description: 'Practical tips for building confidence and making meaningful connections on campus.',
    type: 'video',
    category: 'social-skills',
    duration: '12 min',
    rating: 4.7,
    thumbnail: '🎥',
  },
  {
    id: '4',
    title: 'Mindful Morning Routine',
    description: 'Start your day with intention and calm through this guided morning meditation.',
    type: 'audio',
    category: 'self-care',
    duration: '15 min',
    rating: 4.9,
    thumbnail: '🌅',
  },
  {
    id: '5',
    title: 'Building Resilience During Difficult Times',
    description: 'Learn how to bounce back from setbacks and maintain mental strength.',
    type: 'article',
    category: 'motivation',
    duration: '6 min read',
    rating: 4.5,
    thumbnail: '💪',
  },
  {
    id: '6',
    title: 'Progressive Muscle Relaxation',
    description: 'A guided exercise to release physical tension and promote deep relaxation.',
    type: 'exercise',
    category: 'stress-management',
    duration: '20 min',
    rating: 4.8,
    thumbnail: '🧘‍♀️',
  },
  {
    id: '7',
    title: 'Crisis Resources and Emergency Contacts',
    description: 'Important phone numbers and resources for immediate mental health support.',
    type: 'article',
    category: 'crisis-support',
    duration: '2 min read',
    rating: 5.0,
    thumbnail: '🆘',
  },
  {
    id: '8',
    title: 'Sleep Hygiene for Students',
    description: 'Improve your sleep quality and energy levels with these science-backed tips.',
    type: 'video',
    category: 'self-care',
    duration: '10 min',
    rating: 4.6,
    thumbnail: '😴',
  },
];

export default function ResourcesScreen() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>(sampleResources);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadResources();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadResources = async () => {
    try {
      // In a real app, this would load from the database
      setResources(sampleResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText color="#6366F1" size={20} />;
      case 'video': return <Video color="#EF4444" size={20} />;
      case 'audio': return <Headphones color="#10B981" size={20} />;
      case 'exercise': return <Play color="#F59E0B" size={20} />;
      default: return <BookOpen color="#6B7280" size={20} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'article': return 'Article';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'exercise': return 'Exercise';
      default: return 'Resource';
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} color="#F59E0B" size={12} fill="#F59E0B" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" color="#F59E0B" size={12} />);
    }

    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading resources...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#A855F7']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <BookOpen color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Resource Vault</Text>
          <Text style={styles.headerSubtitle}>
            Curated content for your wellness journey
          </Text>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#9CA3AF" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {resourceCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resources List */}
      <ScrollView style={styles.resourcesContainer} showsVerticalScrollIndicator={false}>
        {filteredResources.map((resource, index) => (
          <Animated.View
            key={resource.id}
            entering={FadeInUp.duration(600).delay(index * 100)}
            style={styles.resourceCard}
          >
            <TouchableOpacity style={styles.resourceContent}>
              <View style={styles.resourceHeader}>
                <View style={styles.resourceThumbnail}>
                  <Text style={styles.thumbnailEmoji}>{resource.thumbnail}</Text>
                </View>
                
                <View style={styles.resourceInfo}>
                  <View style={styles.resourceMeta}>
                    {getResourceIcon(resource.type)}
                    <Text style={styles.resourceType}>
                      {getTypeLabel(resource.type)}
                    </Text>
                    <View style={styles.separator} />
                    <Clock color="#9CA3AF" size={14} />
                    <Text style={styles.resourceDuration}>{resource.duration}</Text>
                  </View>
                  
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceDescription}>{resource.description}</Text>
                  
                  <View style={styles.resourceFooter}>
                    <View style={styles.rating}>
                      {renderStars(resource.rating)}
                      <Text style={styles.ratingText}>{resource.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
        
        {filteredResources.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateText}>
              No resources found matching your criteria.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or category filter.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Featured Section */}
      <View style={styles.featuredSection}>
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.featuredCard}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Text style={styles.featuredIcon}>🆘</Text>
              <View style={styles.featuredText}>
                <Text style={styles.featuredTitle}>Need Immediate Help?</Text>
                <Text style={styles.featuredSubtitle}>
                  Crisis support resources available 24/7
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  categoriesContainer: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  resourcesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resourceContent: {
    padding: 20,
  },
  resourceHeader: {
    flexDirection: 'row',
  },
  resourceThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  thumbnailEmoji: {
    fontSize: 24,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  resourceDuration: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 24,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 6,
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
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  featuredSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: 20,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});