import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput } from 'react-native';
import { createClient } from '@blinkdotnew/sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Heart, 
  Shield,
  Plus,
  User,
  Clock,
  Globe,
  X,
  Save,
  PhoneCall
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const blink = createClient({
  projectId: 'wellness-companion-student-app-ykno7kjh',
  authRequired: true
});

interface CrisisResource {
  id: string;
  title: string;
  description: string;
  resourceType: string;
  contactInfo: string;
  availability: string;
  countryCode: string;
  language: string;
  isActive: boolean;
  createdAt: string;
}

interface EmergencyContact {
  id: string;
  userId: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  relationship: string;
  isPrimary: boolean;
  canReceiveAlerts: boolean;
  createdAt: string;
}

const resourceTypes = [
  { type: 'hotline', icon: <Phone color="#FFFFFF" size={20} />, color: '#EF4444' },
  { type: 'text', icon: <MessageCircle color="#FFFFFF" size={20} />, color: '#6366F1' },
  { type: 'chat', icon: <MessageCircle color="#FFFFFF" size={20} />, color: '#10B981' },
  { type: 'website', icon: <Globe color="#FFFFFF" size={20} />, color: '#8B5CF6' },
];

export default function EmergencyScreen() {
  const [user, setUser] = useState(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state for adding contacts
  const [newContact, setNewContact] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    relationship: 'friend',
    isPrimary: false,
    canReceiveAlerts: true
  });

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user && !state.isLoading) {
        loadEmergencyData();
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const loadEmergencyData = async () => {
    try {
      // Load crisis resources
      const resources = await blink.db.crisisResources.list({
        where: { isActive: "1" },
        orderBy: { createdAt: 'asc' },
        limit: 20
      });
      setCrisisResources(resources);

      // Load user's emergency contacts
      const contacts = await blink.db.emergencyContacts.list({
        where: { userId: user?.id },
        orderBy: { isPrimary: 'desc', createdAt: 'asc' },
        limit: 10
      });
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading emergency data:', error);
    }
  };

  const handleCrisisContact = async (resource: CrisisResource) => {
    const { resourceType, contactInfo, title } = resource;
    
    Alert.alert(
      `Contact ${title}`,
      `Are you sure you want to reach out for support?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Contact Now', 
          onPress: () => initiateContact(resourceType, contactInfo, title)
        }
      ]
    );
  };

  const initiateContact = async (type: string, contactInfo: string, title: string) => {
    try {
      switch (type) {
        case 'hotline':
          await Linking.openURL(`tel:${contactInfo}`);
          break;
        case 'text':
          await Linking.openURL(`sms:${contactInfo}`);
          break;
        case 'website':
        case 'chat':
          await Linking.openURL(contactInfo);
          break;
        default:
          Alert.alert('Error', 'Unable to open this resource');
          return;
      }
      
      // Log the crisis contact for analytics
      await blink.db.userAnalytics.create({
        userId: user?.id || '',
        metricName: 'crisis_contact_used',
        metricValue: 1,
        timePeriod: 'daily',
        dateRecorded: new Date().toISOString().split('T')[0],
        metadata: JSON.stringify({ resourceTitle: title, resourceType: type })
      });
    } catch (error) {
      console.error('Error initiating contact:', error);
      Alert.alert('Error', 'Unable to open this contact method');
    }
  };

  const addEmergencyContact = async () => {
    if (!newContact.contactName.trim()) {
      Alert.alert('Error', 'Please enter a contact name');
      return;
    }

    if (!newContact.contactPhone.trim() && !newContact.contactEmail.trim()) {
      Alert.alert('Error', 'Please enter either a phone number or email');
      return;
    }

    try {
      await blink.db.emergencyContacts.create({
        userId: user?.id || '',
        contactName: newContact.contactName,
        contactPhone: newContact.contactPhone || null,
        contactEmail: newContact.contactEmail || null,
        relationship: newContact.relationship,
        isPrimary: newContact.isPrimary,
        canReceiveAlerts: newContact.canReceiveAlerts,
        createdAt: new Date().toISOString().split('T')[0]
      });

      Alert.alert('Success', 'Emergency contact added successfully');
      setShowAddContactModal(false);
      setNewContact({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        relationship: 'friend',
        isPrimary: false,
        canReceiveAlerts: true
      });
      
      await loadEmergencyData();
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      Alert.alert('Error', 'Failed to add emergency contact');
    }
  };

  const contactEmergencyPerson = (contact: EmergencyContact) => {
    const options = [];
    
    if (contact.contactPhone) {
      options.push({
        text: 'Call',
        onPress: () => Linking.openURL(`tel:${contact.contactPhone}`)
      });
    }
    
    if (contact.contactEmail) {
      options.push({
        text: 'Email',
        onPress: () => Linking.openURL(`mailto:${contact.contactEmail}?subject=I need support`)
      });
    }
    
    options.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert(
      `Contact ${contact.contactName}`,
      `Reach out to your ${contact.relationship} for support`,
      options
    );
  };

  const sendQuickAlert = async () => {
    const primaryContact = emergencyContacts.find(contact => contact.isPrimary && contact.canReceiveAlerts);
    
    if (!primaryContact) {
      Alert.alert(
        'No Primary Contact',
        'Please add a primary emergency contact first',
        [{ text: 'Add Contact', onPress: () => setShowAddContactModal(true) }]
      );
      return;
    }

    Alert.alert(
      'Send Alert',
      `Send a wellness check alert to ${primaryContact.contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          onPress: () => sendWellnessAlert(primaryContact)
        }
      ]
    );
  };

  const sendWellnessAlert = async (contact: EmergencyContact) => {
    try {
      // In a real app, this would send an actual alert
      // For now, we'll simulate it and provide the user with a message template
      
      const message = `Hi ${contact.contactName}, this is ${user?.email?.split('@')[0] || 'your friend'}. I'm reaching out because I could use some support right now. Could we talk when you have a moment? Thank you.`;
      
      if (contact.contactPhone) {
        await Linking.openURL(`sms:${contact.contactPhone}&body=${encodeURIComponent(message)}`);
      } else if (contact.contactEmail) {
        await Linking.openURL(`mailto:${contact.contactEmail}?subject=I could use some support&body=${encodeURIComponent(message)}`);
      }
      
      Alert.alert('Alert Sent', 'Your wellness check alert has been prepared. Please send it when ready.');
    } catch (error) {
      console.error('Error sending wellness alert:', error);
      Alert.alert('Error', 'Unable to send alert');
    }
  };

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find(rt => rt.type === type);
    return resourceType ? resourceType.icon : <Phone color="#FFFFFF" size={20} />;
  };

  const getResourceColor = (type: string) => {
    const resourceType = resourceTypes.find(rt => rt.type === type);
    return resourceType ? resourceType.color : '#6B7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading emergency resources...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <AlertTriangle color="#FFFFFF" size={28} />
          <Text style={styles.headerTitle}>Emergency Support</Text>
          <Text style={styles.headerSubtitle}>
            Immediate help when you need it most
          </Text>
        </View>
        
        {/* Quick Alert Button */}
        <TouchableOpacity 
          style={styles.quickAlertButton}
          onPress={sendQuickAlert}
        >
          <Shield color="#FFFFFF" size={20} />
          <Text style={styles.quickAlertText}>Quick Alert</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Crisis Hotlines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone color="#EF4444" size={20} />
            <Text style={styles.sectionTitle}>Crisis Resources</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Professional support available 24/7. Don't hesitate to reach out.
          </Text>
          
          {crisisResources.map((resource, index) => (
            <Animated.View
              key={resource.id}
              entering={FadeInDown.duration(600).delay(index * 100)}
              style={styles.resourceCard}
            >
              <View style={styles.resourceHeader}>
                <View style={[
                  styles.resourceIcon,
                  { backgroundColor: getResourceColor(resource.resourceType) }
                ]}>
                  {getResourceIcon(resource.resourceType)}
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceType}>
                    {resource.resourceType.charAt(0).toUpperCase() + resource.resourceType.slice(1)} • {resource.availability}
                  </Text>
                </View>
                <View style={styles.resourceAvailability}>
                  <Clock color="#10B981" size={16} />
                </View>
              </View>
              
              <Text style={styles.resourceDescription}>{resource.description}</Text>
              
              <TouchableOpacity 
                style={[
                  styles.contactButton,
                  { backgroundColor: getResourceColor(resource.resourceType) }
                ]}
                onPress={() => handleCrisisContact(resource)}
              >
                <PhoneCall color="#FFFFFF" size={16} />
                <Text style={styles.contactButtonText}>
                  {resource.resourceType === 'hotline' ? 'Call Now' :
                   resource.resourceType === 'text' ? 'Text Now' :
                   resource.resourceType === 'chat' ? 'Chat Now' : 'Visit'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User color="#6366F1" size={20} />
            <Text style={styles.sectionTitle}>Your Emergency Contacts</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddContactModal(true)}
            >
              <Plus color="#6366F1" size={20} />
            </TouchableOpacity>
          </View>
          
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact, index) => (
              <Animated.View
                key={contact.id}
                entering={FadeInUp.duration(600).delay(index * 100)}
                style={[
                  styles.contactCard,
                  contact.isPrimary && styles.primaryContactCard
                ]}
              >
                <View style={styles.contactHeader}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactInitial}>
                        {contact.contactName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.contactName}>
                        {contact.contactName}
                        {contact.isPrimary && (
                          <Text style={styles.primaryBadge}> • Primary</Text>
                        )}
                      </Text>
                      <Text style={styles.contactRelationship}>
                        {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.contactActionButton}
                    onPress={() => contactEmergencyPerson(contact)}
                  >
                    <Phone color="#6366F1" size={20} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.contactMethods}>
                  {contact.contactPhone && (
                    <Text style={styles.contactMethod}>📞 {contact.contactPhone}</Text>
                  )}
                  {contact.contactEmail && (
                    <Text style={styles.contactMethod}>✉️ {contact.contactEmail}</Text>
                  )}
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No emergency contacts added yet
              </Text>
              <TouchableOpacity 
                style={styles.addFirstContactButton}
                onPress={() => setShowAddContactModal(true)}
              >
                <Text style={styles.addFirstContactText}>Add Your First Contact</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Self-Care Reminders */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(800)}
          style={styles.selfCareCard}
        >
          <View style={styles.selfCareHeader}>
            <Heart color="#EC4899" size={24} />
            <Text style={styles.selfCareTitle}>Remember</Text>
          </View>
          <Text style={styles.selfCareText}>
            You are not alone. Reaching out for help is a sign of strength, not weakness. 
            Your feelings are valid, and support is always available.
          </Text>
          <View style={styles.selfCareTips}>
            <Text style={styles.selfCareTip}>• Take deep breaths</Text>
            <Text style={styles.selfCareTip}>• You are worthy of care</Text>
            <Text style={styles.selfCareTip}>• This feeling will pass</Text>
            <Text style={styles.selfCareTip}>• Help is always available</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddContactModal(false)}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TouchableOpacity onPress={addEmergencyContact}>
              <Save color="#6366F1" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newContact.contactName}
                onChangeText={(text) => setNewContact(prev => ({ ...prev, contactName: text }))}
                placeholder="e.g., Mom, Best Friend, Counselor"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                value={newContact.contactPhone}
                onChangeText={(text) => setNewContact(prev => ({ ...prev, contactPhone: text }))}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                value={newContact.contactEmail}
                onChangeText={(text) => setNewContact(prev => ({ ...prev, contactEmail: text }))}
                placeholder="contact@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Relationship</Text>
              <View style={styles.relationshipSelector}>
                {['parent', 'guardian', 'friend', 'counselor', 'teacher', 'other'].map(relationship => (
                  <TouchableOpacity
                    key={relationship}
                    style={[
                      styles.relationshipOption,
                      newContact.relationship === relationship && styles.relationshipOptionSelected
                    ]}
                    onPress={() => setNewContact(prev => ({ ...prev, relationship }))}
                  >
                    <Text style={[
                      styles.relationshipLabel,
                      newContact.relationship === relationship && styles.relationshipLabelSelected
                    ]}>
                      {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setNewContact(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
                >
                  <View style={[
                    styles.checkboxBox,
                    newContact.isPrimary && styles.checkboxBoxChecked
                  ]}>
                    {newContact.isPrimary && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Make this my primary contact</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setNewContact(prev => ({ ...prev, canReceiveAlerts: !prev.canReceiveAlerts }))}
                >
                  <View style={[
                    styles.checkboxBox,
                    newContact.canReceiveAlerts && styles.checkboxBoxChecked
                  ]}>
                    {newContact.canReceiveAlerts && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Can receive wellness alerts</Text>
                </TouchableOpacity>
              </View>
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
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
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
  quickAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quickAlertText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceCard: {
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
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  resourceType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  resourceAvailability: {
    alignItems: 'center',
  },
  resourceDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryContactCard: {
    borderWidth: 2,
    borderColor: '#E0E7FF',
    backgroundColor: '#F8FAFC',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  primaryBadge: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  contactRelationship: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactMethods: {
    gap: 4,
  },
  contactMethod: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  addFirstContactButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addFirstContactText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selfCareCard: {
    backgroundColor: '#FDF2F8',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  selfCareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selfCareTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#BE185D',
    marginLeft: 8,
  },
  selfCareText: {
    fontSize: 15,
    color: '#BE185D',
    lineHeight: 22,
    marginBottom: 16,
  },
  selfCareTips: {
    gap: 8,
  },
  selfCareTip: {
    fontSize: 14,
    color: '#BE185D',
    lineHeight: 20,
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
  relationshipSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  relationshipOptionSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  relationshipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  relationshipLabelSelected: {
    color: '#FFFFFF',
  },
  checkboxGroup: {
    gap: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
});