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
  elementLabelForKey,
  getElementColor,
  getElementLabel,
  getStatusColor,
  getStatusTooltip,
  getSuggestionIcon
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
        { text: 'products for', type: 'continuation', targets: ['offer'] },
        { text: 'care designed for', type: 'continuation', targets: ['offer'] }
      ];
  }
}

const BrandAutocomplete: React.FC<Props> = ({ brandContext, value, onChange, showHeader = true }) => {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [brandStatus, setBrandStatus] = useState<BrandStatus | null>(null);
  const [progress, setProgress] = useState<NarrativeProgress | null>(null);
  const [modelConfig] = useState<ModelConfig>({
    directionModel: 'gpt-4.1',
    suggestionModel: 'gpt-4o',
    directionTemp: 0.2,
    suggestionTemp: 0.7
  });
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const progressElements = Array.isArray(progress?.allElements) ? progress.allElements : [];
  const progressByKey = new Map(progressElements.map(element => [element.key, element]));
  const missingElements = progressElements.filter(element => !element.covered).slice(0, 3);

  const narrativeChecklist = CHECKLIST_ITEMS.map(item => {
    const progressItem = progressByKey.get(item.id);
    return {
      ...item,
      covered: Boolean(progressItem?.covered),
      evidence: progressItem?.evidence || ''
    };
  });

  const firstIncompleteChecklistIndex = narrativeChecklist.findIndex(item => !item.covered);
  const activeChecklistKey =
    progress?.activeKey && progress.activeKey !== 'none'
      ? progress.activeKey
      : firstIncompleteChecklistIndex >= 0
        ? narrativeChecklist[firstIncompleteChecklistIndex].id
        : null;

  const fetchSuggestions = async (currentText: string = '') => {
    setIsLoading(true);
    try {
      const data = await requestSuggestions({
        brandContext,
        currentText,
        sessionId,
        modelConfig
      });
      setSuggestions(data.suggestions || []);
      setBrandStatus(data.brandStatus || null);
      setProgress(data.progress || null);
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) {
        console.error('Error fetching suggestions:', error);
      }
      setSuggestions(buildFallbackSuggestions(brandContext.brandName, activeChecklistKey));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsTyping(true);
    setSuggestions([]);

    debounceRef.current = setTimeout(() => {
      setIsTyping(false);
      fetchSuggestions(text);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setText(nextValue);
    onChange?.(nextValue);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const nextText = applySuggestionToText(text, suggestion);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    skipDebounceRef.current = true;
    setText(nextText);
    onChange?.(nextText);
    textareaRef.current?.focus();
    setIsTyping(false);
    fetchSuggestions(nextText);
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
            <span className="brand-narrative-checklist-eyebrow">Include At Least</span>
            <p>The checklist updates as your narrative covers the essentials.</p>
          </div>
          <div className="brand-narrative-checklist-grid">
            {narrativeChecklist.map((item, index) => {
              const isCurrent = !item.covered && index === firstIncompleteChecklistIndex;
              const accent = getElementColor([item.id]);

              return (
                <div
                  key={item.id}
                  className={[
                    'brand-narrative-checklist-item',
                    item.covered ? 'is-complete' : '',
                    isCurrent ? 'is-current' : ''
                  ].filter(Boolean).join(' ')}
                  style={{
                    borderColor: item.covered || isCurrent ? `${accent}33` : undefined,
                    backgroundColor: item.covered ? `${accent}12` : isCurrent ? `${accent}0E` : undefined
                  }}
                >
                  <span
                    className="brand-narrative-checklist-mark"
                    aria-hidden="true"
                    style={{
                      borderColor: item.covered || isCurrent ? `${accent}33` : undefined,
                      color: item.covered || isCurrent ? accent : undefined,
                      backgroundColor: item.covered || isCurrent ? `${accent}14` : undefined
                    }}
                  >
                    {item.covered ? '✓' : index + 1}
                  </span>
                  <div className="brand-narrative-checklist-copy">
                    <strong>{item.title}</strong>
                    <span>{item.hint}</span>
                    {item.covered && item.evidence && (
                      <small className="brand-narrative-checklist-evidence">“{item.evidence}”</small>
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
            placeholder="Describe what the brand is, who it serves, what makes it different, and how it should come across."
            className="brand-textarea"
            rows={8}
          />

          <div className="status-indicator-overlay">
            <div className={`status-light ${getStatusColor(text, brandStatus)}`} title="Hover for writing guidance">
              <div className="status-tooltip">
                <div className="status-tooltip-message">
                  {getStatusTooltip(text, brandStatus).map((part, index) =>
                    part.color ? (
                      <span key={index} className="highlighted-keyword" style={{ color: part.color, fontWeight: 600 }}>
                        {part.text}
                      </span>
                    ) : (
                      <span key={index}>{part.text}</span>
                    )
                  )}
                </div>
                {missingElements.length > 0 && (
                  <div className="status-tooltip-tags">
                    {missingElements.map(element => (
                      <span
                        key={element.key}
                        className="status-tooltip-tag"
                        style={{
                          borderColor: getElementColor([element.key]),
                          color: getElementColor([element.key])
                        }}
                      >
                        {elementLabelForKey(element.key)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="evaluation-note-inline">
                  Hover here to see what to add next, then use the suggestion chips below.
                </div>
              </div>
            </div>
          </div>

          <div className="suggestion-tray">
            {suggestions.length > 0 && !isLoading && !isTyping && (
              <div className="inline-suggestions">
                {suggestions.map((suggestion, index) => {
                  const elementLabel = getElementLabel(suggestion.targets);
                  const elementColor = getElementColor(suggestion.targets);
                  const showDirectionIndicator = Boolean(elementLabel && suggestion.reasoning);

                  return (
                    <button
                      key={index}
                      className={`inline-suggestion-bubble ${suggestion.type} ${showDirectionIndicator ? 'has-direction' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={showDirectionIndicator ? { borderLeftColor: elementColor, borderLeftWidth: '3px' } : {}}
                    >
                      {showDirectionIndicator && (
                        <span className="direction-indicator" style={{ backgroundColor: elementColor }} />
                      )}
                      <span className="bubble-icon">{getSuggestionIcon(suggestion.type)}</span>
                      <span className="bubble-text">{suggestion.text}</span>
                      {showDirectionIndicator && (
                        <div className="direction-tooltip">
                          <div className="tooltip-header" style={{ backgroundColor: elementColor }}>
                            {elementLabel}
                          </div>
                          <div className="tooltip-body">{suggestion.reasoning}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
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

        <div className="char-count">{text.length} characters</div>
      </div>
    </div>
  );
};

export default BrandAutocomplete;
