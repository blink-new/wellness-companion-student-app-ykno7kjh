import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, MessageCircle, Heart, Send, Shield } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface ForumPost {
  id: string;
  userId: string;
  username: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  replies: number;
  createdAt: string;
  isAnonymous: boolean;
}

const forumCategories = [
  { id: 'exam-stress', name: 'Exam Stress', icon: '📚', color: '#EF4444' },
  { id: 'social-anxiety', name: 'Social Anxiety', icon: '👥', color: '#F97316' },
  { id: 'study-tips', name: 'Study Tips', icon: '💡', color: '#EAB308' },
  { id: 'self-care', name: 'Self Care', icon: '🌸', color: '#EC4899' },
  { id: 'motivation', name: 'Motivation', icon: '⚡', color: '#8B5CF6' },
  { id: 'general', name: 'General Support', icon: '💬', color: '#10B981' },
];

export default function CommunityScreen() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadPosts();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadPosts = async () => {
    try {
      // For now, we'll use sample data since we haven't set up the database tables yet
      const samplePosts: ForumPost[] = [
        {
          id: '1',
          userId: 'user1',
          username: 'StudyBuddy23',
          title: 'Feeling overwhelmed with finals approaching',
          content: 'Anyone else feeling super anxious about finals? I have 5 exams in 2 weeks and I don\'t know how to manage the stress. Any tips?',
          category: 'exam-stress',
          likes: 12,
          replies: 8,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isAnonymous: false,
        },
        {
          id: '2',
          userId: 'user2',
          username: 'Anonymous',
          title: 'Small wins matter too',
          content: 'Just wanted to share that I finally went to the campus counseling center today. It was scary but I\'m glad I did it. If you\'re thinking about it, take that first step! 💪',
          category: 'motivation',
          likes: 24,
          replies: 15,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          isAnonymous: true,
        },
        {
          id: '3',
          userId: 'user3',
          username: 'MindfulMaven',
          title: 'My favorite 5-minute meditation routine',
          content: 'I\'ve been doing this simple breathing exercise between classes and it really helps center me. Breathe in for 4, hold for 4, out for 6. Repeat 5 times. Game changer!',
          category: 'self-care',
          likes: 18,
          replies: 6,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          isAnonymous: false,
        },
        {
          id: '4',
          userId: 'user4',
          username: 'Anonymous',
          title: 'Struggling with making friends in college',
          content: 'I\'m a sophomore but still feel like I haven\'t found my people. Social situations make me really anxious. How do you put yourself out there?',
          category: 'social-anxiety',
          likes: 9,
          replies: 12,
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          isAnonymous: true,
        },
      ];
      
      setPosts(samplePosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and content.');
      return;
    }

    try {
      // In a real app, this would save to the database
      const newPost: ForumPost = {
        id: Date.now().toString(),
        userId: user?.id || 'current-user',
        username: 'You',
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: selectedCategory === 'all' ? 'general' : selectedCategory,
        likes: 0,
        replies: 0,
        createdAt: new Date().toISOString(),
        isAnonymous: false,
      };

      setPosts([newPost, ...posts]);
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPost(false);
      
      Alert.alert('Post Created! 🎉', 'Your post has been shared with the community.');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getCategoryInfo = (categoryId: string) => {
    return forumCategories.find(cat => cat.id === categoryId) || forumCategories[5];
  };

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading community...</Text>
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
          <Users color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>
            Safe space for peer support
          </Text>
        </View>
        
        <View style={styles.safetyBanner}>
          <Shield color="#10B981" size={16} />
          <Text style={styles.safetyText}>
            Moderated • Anonymous options • Crisis support available
          </Text>
        </View>
      </LinearGradient>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === 'all' && styles.categoryTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {forumCategories.map((category) => (
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

      {/* New Post Button */}
      <View style={styles.newPostContainer}>
        <TouchableOpacity
          style={styles.newPostButton}
          onPress={() => setShowNewPost(!showNewPost)}
        >
          <MessageCircle color="#FFFFFF" size={20} />
          <Text style={styles.newPostButtonText}>Share Your Thoughts</Text>
        </TouchableOpacity>
      </View>

      {/* New Post Form */}
      {showNewPost && (
        <Animated.View 
          entering={FadeInDown.duration(400)}
          style={styles.newPostForm}
        >
          <TextInput
            style={styles.postTitleInput}
            placeholder="What's on your mind?"
            value={newPostTitle}
            onChangeText={setNewPostTitle}
          />
          <TextInput
            style={styles.postContentInput}
            placeholder="Share your thoughts, ask for advice, or offer support..."
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowNewPost(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postButton}
              onPress={handleCreatePost}
            >
              <Send color="#FFFFFF" size={16} />
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Posts List */}
      <ScrollView style={styles.postsContainer} showsVerticalScrollIndicator={false}>
        {filteredPosts.map((post, index) => {
          const categoryInfo = getCategoryInfo(post.category);
          return (
            <Animated.View
              key={post.id}
              entering={FadeInUp.duration(600).delay(index * 100)}
              style={styles.postCard}
            >
              <View style={styles.postHeader}>
                <View style={styles.postAuthor}>
                  <View style={[
                    styles.categoryDot,
                    { backgroundColor: categoryInfo.color }
                  ]} />
                  <Text style={styles.username}>{post.username}</Text>
                  <Text style={styles.timestamp}>{getTimeAgo(post.createdAt)}</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{categoryInfo.name}</Text>
                </View>
              </View>
              
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContent}>{post.content}</Text>
              
              <View style={styles.postFooter}>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLikePost(post.id)}
                >
                  <Heart color="#EC4899" size={16} />
                  <Text style={styles.likeCount}>{post.likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.replyButton}>
                  <MessageCircle color="#6B7280" size={16} />
                  <Text style={styles.replyCount}>{post.replies} replies</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
        
        {filteredPosts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>
              No posts in this category yet. Be the first to share!
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 16,
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
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  safetyText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 6,
  },
  categoriesContainer: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
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
  newPostContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  newPostButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newPostForm: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postTitleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  postContentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  postsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  postContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  likeCount: {
    fontSize: 14,
    color: '#EC4899',
    fontWeight: '500',
    marginLeft: 6,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCount: {
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});