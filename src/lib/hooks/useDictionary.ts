import { useState, useEffect } from 'react';
import { DictionaryService } from '../services/dictionary.service';

const dictionaryService = new DictionaryService();

export function useDictionary() {
  const [isDictionaryReady, setIsDictionaryReady] = useState(dictionaryService.isInitialized());

  useEffect(() => {
    const initializeDictionary = async () => {
      if (!dictionaryService.isInitialized()) {
        try {
          const response = await fetch('/api/dictionary');
          const words = await response.json();
          dictionaryService.initialize(words);
          setIsDictionaryReady(true);
        } catch (error) {
          console.error('Failed to initialize dictionary:', error);
        }
      }
    };

    initializeDictionary();
  }, []);

  return {
    dictionaryService,
    isDictionaryReady
  };
} 