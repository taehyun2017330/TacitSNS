import React, { useEffect, useRef, useState } from 'react';

import { ApiUnavailableError } from '../config/api';
import type {
  BrandContext,
  BrandStatus,
  ChecklistKey,
  NarrativeProgress,
  ModelConfig,
  Suggestion
} from '../types/brandAutocomplete';
import { requestSuggestions } from './brandAutocomplete/api';
import {
  applySuggestionToText,
  getElementLabel,
  getStatusColor,
} from './brandAutocomplete/utils';
import './BrandAutocomplete.css';

interface Props {
  brandContext: BrandContext;
  value?: string;
  onChange?: (text: string) => void;
  showHeader?: boolean;
}

const CHECKLIST_ITEMS: Array<{
  id: ChecklistKey;
  title: string;
  hint: string;
}> = [
  {
    id: 'offer',
    title: 'What you sell',
    hint: 'Mention the product, service, or offer.'
  },
  {
    id: 'audience',
    title: 'Who it is for',
    hint: 'Name the target customer or audience.'
  },
  {
    id: 'emphasis',
    title: 'What you want to emphasize',
    hint: 'Call out the quality, difference, or result people should notice.'
  },
  {
    id: 'tone',
    title: 'How it should come across',
    hint: 'Describe the tone, personality, or feeling the brand should project.'
  }
];

const AUTOCOMPLETE_DEBOUNCE_MS = 220;

function needsMoreDetail(itemId: ChecklistKey, evidence: string) {
  const trimmed = evidence.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }

  const genericPatterns: Record<ChecklistKey, string[]> = {
    offer: ['range of', 'innovative product', 'innovative products', 'high-quality product', 'solutions'],
    audience: ['everyone', 'all customers', 'many people', 'broad audience'],
    emphasis: ['quality', 'innovation', 'value', 'great result'],
    tone: ['professional', 'friendly', 'trustworthy', 'premium']
  };

  if (trimmed.length < 28) {
    return true;
  }

  return genericPatterns[itemId].some(pattern => trimmed.includes(pattern));
}

function buildFallbackSuggestions(brandName: string, activeKey: ChecklistKey | null): Suggestion[] {
  switch (activeKey) {
    case 'audience':
      return [
        { text: 'for people who want', type: 'continuation', targets: ['audience'] },
        { text: 'for customers with', type: 'continuation', targets: ['audience'] },
        { text: 'for those looking for', type: 'continuation', targets: ['audience'] },
        { text: 'for people who need', type: 'continuation', targets: ['audience'] }
      ];
    case 'emphasis':
      return [
        { text: 'with a focus on', type: 'continuation', targets: ['emphasis'] },
        { text: 'while emphasizing', type: 'continuation', targets: ['emphasis'] },
        { text: 'by highlighting', type: 'continuation', targets: ['emphasis'] },
        { text: 'through a clear focus on', type: 'continuation', targets: ['emphasis'] }
      ];
    case 'tone':
      return [
        { text: 'and should feel', type: 'continuation', targets: ['tone'] },
        { text: 'while coming across as', type: 'continuation', targets: ['tone'] },
        { text: 'with a tone that feels', type: 'continuation', targets: ['tone'] },
        { text: 'and should sound', type: 'continuation', targets: ['tone'] }
      ];
    case 'offer':
    default:
      return [
        { text: `${brandName || 'This brand'} sells`, type: 'continuation', targets: ['offer'] },
        { text: `${brandName || 'This brand'} offers`, type: 'continuation', targets: ['offer'] },
        { text: `${brandName || 'This brand'} creates`, type: 'continuation', targets: ['offer'] },
        { text: `${brandName || 'This brand'} provides`, type: 'continuation', targets: ['offer'] }
      ];
  }
}

function sanitizeSuggestionText(text: string) {
  return text.replace(/\s*(?:\.\.\.|…)+\s*$/, '').trimEnd();
}

function sanitizeSuggestion(suggestion: Suggestion): Suggestion {
  return {
    ...suggestion,
    text: sanitizeSuggestionText(suggestion.text)
  };
}

function shouldTriggerAutocompleteRequest(nextText: string) {
  if (!nextText.trim()) {
    return true;
  }

  if (/\s$/.test(nextText)) {
    return true;
  }

  return /[.!?]$/.test(nextText.trimEnd());
}

const BrandAutocomplete: React.FC<Props> = ({ brandContext, value, onChange, showHeader = true }) => {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [brandStatus, setBrandStatus] = useState<BrandStatus | null>(null);
  const [progress, setProgress] = useState<NarrativeProgress | null>(null);
  const [modelConfig] = useState<ModelConfig>({
    directionModel: 'gpt-4o-mini',
    suggestionModel: 'gpt-4o',
    directionTemp: 0.2,
    suggestionTemp: 0.7
  });
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestSequenceRef = useRef(0);
  const lastBrandSignatureRef = useRef('__init__');
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const progressElements = Array.isArray(progress?.allElements) ? progress.allElements : [];
  const progressByKey = new Map(progressElements.map(element => [element.key, element]));

  const narrativeChecklist = CHECKLIST_ITEMS.map(item => {
    const progressItem = progressByKey.get(item.id);
    const evidence = progressItem?.evidence || '';
    return {
      ...item,
      covered: Boolean(progressItem?.covered),
      evidence,
      needsDetail: Boolean(progressItem?.covered && needsMoreDetail(item.id, evidence))
    };
  });

  const firstIncompleteChecklistIndex = narrativeChecklist.findIndex(item => !item.covered);
  const activeChecklistKey =
    progress?.activeKey && progress.activeKey !== 'none'
      ? progress.activeKey
      : firstIncompleteChecklistIndex >= 0
        ? narrativeChecklist[firstIncompleteChecklistIndex].id
        : null;
  const activeChecklistItem =
    (activeChecklistKey
      ? narrativeChecklist.find(item => item.id === activeChecklistKey)
      : null) ??
    (firstIncompleteChecklistIndex >= 0 ? narrativeChecklist[firstIncompleteChecklistIndex] : null);
  const tooltipEyebrow = !text.trim()
    ? 'Start Here'
    : activeChecklistItem
      ? 'Write Next'
      : 'Refine';
  const tooltipTitle = !text.trim()
    ? 'What you sell'
    : activeChecklistItem
      ? activeChecklistItem.title
      : 'Core narrative covered';
  const tooltipMessage = !text.trim()
    ? 'Mention the product, service, or offer first.'
    : activeChecklistItem
      ? activeChecklistItem.hint
      : 'You have covered the essentials. Refine the tone or add one more concrete detail.';
  const tooltipNote = activeChecklistItem?.covered && activeChecklistItem.needsDetail
    ? 'This part is present, but it still needs a more specific detail.'
    : !text.trim()
      ? 'Use the suggestion chips below to start the first sentence.'
      : brandStatus?.statusMessage || 'Use the suggestion chips below to keep writing.';
  const isSentenceStarterContext = !text.trim() || /[.!?]$/.test(text.trimEnd());

  const fetchSuggestions = async (currentText: string = '') => {
    const requestId = ++requestSequenceRef.current;
    setIsLoading(true);
    try {
      const data = await requestSuggestions({
        brandContext,
        currentText,
        sessionId: sessionIdRef.current,
        modelConfig
      });
      if (requestId !== requestSequenceRef.current) {
        return;
      }
      setSuggestions((data.suggestions || []).map(sanitizeSuggestion).filter(suggestion => suggestion.text));
      setBrandStatus(data.brandStatus || null);
      setProgress(data.progress || null);
    } catch (error) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }
      if (!(error instanceof ApiUnavailableError)) {
        console.error('Error fetching suggestions:', error);
      }
      setSuggestions(buildFallbackSuggestions(brandContext.brandName, activeChecklistKey).map(sanitizeSuggestion));
    } finally {
      if (requestId === requestSequenceRef.current) {
        setIsLoading(false);
      }
    }
  };

  const clearPendingFetch = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const scheduleFetchSuggestions = (currentText: string, immediate = false) => {
    clearPendingFetch();

    if (immediate) {
      setIsTyping(false);
      void fetchSuggestions(currentText);
      return;
    }

    setIsTyping(true);
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      setIsTyping(false);
      void fetchSuggestions(currentText);
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    clearPendingFetch();
  }, []);

  useEffect(() => {
    const normalizedBrandName = brandContext.brandName.trim();
    const normalizedBrandCategory = brandContext.brandCategory.trim();
    const hasFullBrandContext = Boolean(normalizedBrandName && normalizedBrandCategory);
    const brandSignature = `${normalizedBrandName}::${normalizedBrandCategory}`;

    if (lastBrandSignatureRef.current === brandSignature) {
      return;
    }

    lastBrandSignatureRef.current = brandSignature;
    clearPendingFetch();
    requestSequenceRef.current += 1;
    sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setBrandStatus(null);
    setProgress(null);
    setIsLoading(false);
    setIsTyping(false);

    if (hasFullBrandContext) {
      scheduleFetchSuggestions(text, true);
      return;
    }

    setSuggestions(buildFallbackSuggestions(normalizedBrandName, activeChecklistKey).map(sanitizeSuggestion));
  }, [activeChecklistKey, brandContext.brandCategory, brandContext.brandName, text]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setText(nextValue);
    onChange?.(nextValue);
    clearPendingFetch();
    setIsTyping(false);

    if (shouldTriggerAutocompleteRequest(nextValue)) {
      setSuggestions([]);
      scheduleFetchSuggestions(nextValue);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const nextText = applySuggestionToText(text, sanitizeSuggestion(suggestion));
    setText(nextText);
    onChange?.(nextText);
    textareaRef.current?.focus();
    clearPendingFetch();
    setIsTyping(false);
    scheduleFetchSuggestions(nextText, true);
  };

  return (
    <div className="brand-autocomplete">
      {showHeader && (
        <div className="header">
          <h1 style={{ textAlign: 'left', marginBottom: '8px' }}>Tell us about your brand</h1>
          <p style={{ textAlign: 'left', color: '#6B7280', marginBottom: '16px', fontSize: '15px' }}>
            Describe it in your own words
          </p>
          <div className="brand-context" style={{ justifyContent: 'flex-start', gap: '24px', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Brand name:</span>
              <span className="brand-name">{brandContext.brandName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Category:</span>
              <span className="brand-category">{brandContext.brandCategory}</span>
            </div>
          </div>
        </div>
      )}

      <div className="input-section">
        <div className="brand-narrative-checklist" aria-label="Brand narrative checklist">
          <div className="brand-narrative-checklist-header">
            <span className="brand-narrative-checklist-eyebrow">Things you could mention</span>
          </div>
          <div className="brand-narrative-checklist-grid">
            {narrativeChecklist.map((item, index) => {
              const isCurrent = !item.covered && index === firstIncompleteChecklistIndex;

              return (
                <div
                  key={item.id}
                  className={[
                    'brand-narrative-checklist-item',
                    item.covered ? 'is-complete' : '',
                    isCurrent ? 'is-current' : ''
                  ].filter(Boolean).join(' ')}
                >
                  <span
                    className="brand-narrative-checklist-mark"
                    aria-hidden="true"
                  >
                    {item.covered ? '✓' : index + 1}
                  </span>
                  <div className="brand-narrative-checklist-copy">
                    <strong>{item.title}</strong>
                    <span>{item.hint}</span>
                    {item.covered && item.evidence && (
                      <small className="brand-narrative-checklist-evidence">“{item.evidence}”</small>
                    )}
                    {item.covered && item.needsDetail && (
                      <small className="brand-narrative-checklist-detail-note">Give more detail</small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Describe your brand in a few sentences."
            className="brand-textarea"
            rows={5}
          />

          <div className="status-indicator-overlay">
            <div className={`status-light ${getStatusColor(text, brandStatus)}`}>
              <div className="status-tooltip">
                <div className="status-tooltip-eyebrow">
                  {tooltipEyebrow}
                </div>
                <div className="status-tooltip-title">{tooltipTitle}</div>
                <div className="status-tooltip-message">{tooltipMessage}</div>
                <div className="evaluation-note-inline">{tooltipNote}</div>
              </div>
            </div>
          </div>

          <div className="suggestion-tray">
            {suggestions.length > 0 && !isLoading && !isTyping && (
              <>
                <div className="suggestion-tray-header">
                  <span className="suggestion-tray-label">
                    {activeChecklistItem
                      ? <>Start a phrase for <span className="suggestion-tray-target">{activeChecklistItem.title.toLowerCase()}</span>, or choose one of our suggested completions:</>
                      : 'Choose one of our suggested completions:'}
                  </span>
                </div>
                <div className="inline-suggestions">
                  {suggestions.map((suggestion, index) => {
                    const elementLabel = getElementLabel(suggestion.targets);
                    const showDirectionIndicator = Boolean(
                      isSentenceStarterContext && elementLabel && suggestion.reasoning
                    );

                    return (
                      <button
                        key={index}
                        className={[
                          'inline-suggestion-bubble',
                          isSentenceStarterContext ? 'is-starter' : 'is-completion',
                          showDirectionIndicator ? 'has-direction' : ''
                        ].join(' ')}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {showDirectionIndicator && (
                          <span className="direction-indicator" />
                        )}
                        <span className="bubble-text">{suggestion.text}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {isTyping && (
              <div className="inline-loading">
                <div className="loading-bubble">
                  <span className="loading-dots">●●●</span> Typing...
                </div>
              </div>
            )}

            {isLoading && !isTyping && (
              <div className="inline-loading">
                <div className="loading-bubble">
                  <span className="loading-dots">●●●</span> Thinking...
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BrandAutocomplete;
