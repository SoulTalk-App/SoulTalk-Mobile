import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { fonts } from '../theme';
import JournalService from '../services/JournalService';

interface InspirationDropdownProps {
  onSelectPrompt: (text: string) => void;
}

const InspirationDropdown: React.FC<InspirationDropdownProps> = ({ onSelectPrompt }) => {
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
          {isLoading ? (
            <ActivityIndicator color="#59168B" size="small" style={styles.loader} />
          ) : (
            prompts?.map((prompt, idx) => (
              <Pressable
                key={idx}
                style={styles.promptItem}
                onPress={() => {
                  onSelectPrompt(prompt);
                  setIsOpen(false);
                }}
              >
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))
          )}
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    gap: 6,
  },
  headerText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  chevron: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingVertical: 4,
  },
  loader: {
    paddingVertical: 16,
  },
  promptItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(89, 22, 139, 0.1)',
  },
  promptText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: '#59168B',
    lineHeight: 13 * 1.4,
  },
});

export default InspirationDropdown;
