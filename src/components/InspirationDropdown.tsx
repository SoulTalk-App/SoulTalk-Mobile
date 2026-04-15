import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { fonts } from '../theme';
import JournalService from '../services/JournalService';

const InspirationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!isOpen && !prompts) {
      setIsOpen(true);
      setIsLoading(true);
      try {
        const fetched = await JournalService.getPrompts();
        setPrompts(fetched);
      } catch (error) {
        console.error('Failed to fetch prompts:', error);
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsOpen(!isOpen);
    }
  }, [isOpen, prompts]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={handleToggle}>
        <Text style={styles.headerText}>Need inspiration?</Text>
        <Text style={styles.chevron}>{isOpen ? '\u25B2' : '\u25BC'}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.guidanceText}>
              Journaling with SoulTalk should feel like a candid conversation with a close friend. Reflecting on the last 24 hours, what happened, how did it make you feel, what joy or tensions came up for you that you would want to integrate so you can move forward with more clarity in your life? Vulnerability is a superpower when you unlock it, so type or talk away as much as you want! No right or wrong answers here!
            </Text>
            <Text style={styles.tipText}>
              Tip from Chey: I use the voice to text feature the most so that I can just talk out loud, uninterrupted. I call it word vomit, but think of this like your stream of consciousness that you finally get feedback on, customized just to you.
            </Text>
            {isLoading ? (
              <ActivityIndicator color="#4DE8D4" size="small" style={styles.loader} />
            ) : (
              prompts?.map((prompt, idx) => (
                <View key={idx} style={styles.promptItem}>
                  <Text style={styles.promptText}>{prompt}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  headerText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chevron: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 4,
    maxHeight: 250,
  },
  scrollArea: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  guidanceText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 13 * 1.6,
    marginBottom: 12,
  },
  tipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#4DE8D4',
    lineHeight: 13 * 1.6,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  loader: {
    paddingVertical: 16,
  },
  promptItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 13 * 1.4,
  },
});

export default InspirationDropdown;
