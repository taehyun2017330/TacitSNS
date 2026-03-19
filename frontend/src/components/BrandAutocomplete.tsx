import React, { useState, useEffect, useRef } from 'react';
import { Suggestion, BrandContext, ModelConfig, SentenceAnnotation, SentenceSegment } from '../types/brandAutocomplete';
import './BrandAutocomplete.css';

interface Props {
  brandContext: BrandContext;
  value?: string;
  onChange?: (text: string) => void;
  showHeader?: boolean;
}

const BrandAutocomplete: React.FC<Props> = ({ brandContext, value, onChange, showHeader = true }) => {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [brandStatus, setBrandStatus] = useState<{
    satisfied: boolean;
    overallAssessment: string;
    statusMessage: string;
    sentenceEnded: boolean;
  } | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    thinking: string;
    elapsed: number;
  } | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    directionModel: 'gpt-4o',
    suggestionModel: 'gpt-4o-mini',
    directionTemp: 0.3,
    suggestionTemp: 1.0
  });
  const [sentenceAnnotations, setSentenceAnnotations] = useState<Record<number, SentenceAnnotation>>({});
  const [segmentTooltip, setSegmentTooltip] = useState<{
    left: number;
    top: number;
    primaryColor: string;
    targets: string[];
  } | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [progressPanelOpen, setProgressPanelOpen] = useState(false);
  const activeSentenceIndexRef = useRef<number | null>(null);
  const sentenceDebounceRef = useRef<NodeJS.Timeout>();
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  // Generate unique session ID on every mount to ensure fresh context
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const skipDebounceRef = useRef(false); // Flag to skip debounce after clicking suggestion

  const API_URL = import.meta.env.VITE_BRAND_AUTOCOMPLETE_API_URL || 'http://localhost:8001';
  const MODEL_OPTIONS = [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-5-nano-2025-08-07',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo'
  ];

  const splitSentences = (fullText: string) => {
    const sentences: Array<{ index: number; start: number; end: number; text: string }> = [];
    const regex = /[^.!?]+[.!?]?\s*/g;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = regex.exec(fullText)) !== null) {
      const textPart = match[0];
      if (!textPart) continue;
      sentences.push({
        index: i++,
        start: match.index,
        end: match.index + textPart.length,
        text: textPart
      });
    }
    return sentences;
  };

  const getSentenceIndexAt = (fullText: string, cursorPos: number) => {
    const sentences = splitSentences(fullText);
    const idx = sentences.findIndex(s => cursorPos >= s.start && cursorPos <= s.end);
    return idx === -1 ? null : idx;
  };

  const selectSentenceInTextarea = (fullText: string, sentenceIndex: number) => {
    const sentences = splitSentences(fullText);
    const s = sentences.find(x => x.index === sentenceIndex);
    if (!s || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(s.start, s.end);
  };

  const elementLabelForKey = (key: string) => {
    const labels: { [key: string]: string } = {
      companyType: 'Industry/Type',
      audience: 'Target Audience',
      problem: 'Problem',
      solution: 'Solution',
      mission: 'Mission',
      differentiator: 'Differentiator',
      brandIdentity: 'Brand Identity',
      values: 'Values'
    };
    return labels[key] || key;
  };

  const normalizeTargets = (targets: string[] | undefined | null) => {
    const allowed = new Set([
      'companyType',
      'audience',
      'problem',
      'solution',
      'mission',
      'differentiator',
      'brandIdentity',
      'values'
    ]);
    return (targets || []).filter(t => allowed.has(t));
  };

  const getFulfilledTargetSet = () => {
    const set = new Set<string>();
    if (progress?.allElements && Array.isArray(progress.allElements)) {
      progress.allElements.forEach((el: any) => {
        if (el?.covered && typeof el?.key === 'string') set.add(el.key);
      });
    }
    return set;
  };

  const fetchSentenceAnnotation = async (sentenceText: string, sentenceIndex: number) => {
    try {
      const response = await fetch(`${API_URL}/api/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brandContext.brandName,
          brandCategory: brandContext.brandCategory,
          sentenceText,
          modelConfig
        })
      });
      const data = (await response.json()) as SentenceAnnotation;
      const segments: SentenceSegment[] = Array.isArray(data?.segments) ? data.segments : [{ text: sentenceText, targets: [] }];
      const cleaned: SentenceAnnotation = {
        segments: segments.map(s => ({ text: s.text || '', targets: normalizeTargets(s.targets) })),
        sentenceTargets: normalizeTargets(data?.sentenceTargets)
      };
      setSentenceAnnotations(prev => ({ ...prev, [sentenceIndex]: cleaned }));
    } catch (e) {
      setSentenceAnnotations(prev => ({
        ...prev,
        [sentenceIndex]: { segments: [{ text: sentenceText, targets: [] }], sentenceTargets: [] }
      }));
    }
  };

  const fetchSuggestions = async (currentText: string = '') => {
    const fetchUrl = `${API_URL}/api/suggestions`;
    setIsLoading(true);
    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: brandContext.brandName,
          brandCategory: brandContext.brandCategory,
          currentText,
          sessionId,
          modelConfig
        }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      if (data.brandStatus) {
        setBrandStatus(data.brandStatus);
      }
      if (data.debug) {
        setDebugInfo(data.debug);
      }
      if (data.progress) {
        setProgress(data.progress);
      }

      // If backend returned a direction-model annotation, store it.
      if (data.annotation?.sentenceIndex !== undefined && Array.isArray(data.annotation?.segments)) {
        const cleaned: SentenceAnnotation = {
          segments: data.annotation.segments.map((s: any) => ({ text: s.text || '', targets: normalizeTargets(s.targets) })),
          sentenceTargets: normalizeTargets(data.annotation.sentenceTargets)
        };
        setSentenceAnnotations(prev => ({ ...prev, [data.annotation.sentenceIndex]: cleaned }));
      } else if (currentText.trim() && data.brandStatus?.sentenceEnded) {
        // Fallback: annotate locally via /api/annotate
        const sentences = splitSentences(currentText);
        const last = sentences[sentences.length - 1];
        if (last) fetchSentenceAnnotation(last.text, last.index);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        { text: `${brandContext.brandName} was founded to`, type: 'new_angle' },
        { text: 'Our mission is to', type: 'new_angle' },
        { text: 'What makes us unique is', type: 'new_angle' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Skip if this update came from clicking a suggestion
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Clear suggestions and show typing indicator while user is typing
    setIsTyping(true);
    setSuggestions([]);

    // Wait 0.5 seconds after user stops typing (for both empty and non-empty text)
    debounceRef.current = setTimeout(() => {
      setIsTyping(false);
      fetchSuggestions(text);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleModelSelect = (field: 'directionModel' | 'suggestionModel', value: string) => {
    setModelConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemperatureChange = (field: 'directionTemp' | 'suggestionTemp', value: string) => {
    const parsed = Math.max(0, Math.min(2, parseFloat(value) || 0));
    setModelConfig(prev => ({ ...prev, [field]: parsed }));
  };

  const applyModelConfig = () => {
    // Re-fetch using new configuration
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    skipDebounceRef.current = true;
    setIsTyping(false);
    fetchSuggestions(text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    if (onChange) {
      onChange(newValue);
    }
    // Text changed; highlights will update from state, but active sentence may need re-detection.
    // Cursor activity handler will fire on keyup/select/click; keep this lightweight.
  };

  const handleCursorActivity = () => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart ?? 0;
    const idx = getSentenceIndexAt(text, cursorPos);
    if (idx === null || idx === activeSentenceIndexRef.current) return;
    activeSentenceIndexRef.current = idx;

    if (sentenceDebounceRef.current) clearTimeout(sentenceDebounceRef.current);
    sentenceDebounceRef.current = setTimeout(() => {
      const sentences = splitSentences(text);
      const sentence = sentences.find(s => s.index === idx);
      if (sentence) {
        fetchSentenceAnnotation(sentence.text, idx);
      }
    }, 350);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    let newText = text;

    // Smart insertion logic
    if (text.trim() === '') {
      // Empty text - just add the suggestion
      newText = suggestion.text;
    } else if (suggestion.text === '.') {
      // Period only - append directly without space
      newText = text.trimEnd() + '.';
    } else if (text.endsWith(' ')) {
      // Already has space - add suggestion
      newText = text + suggestion.text;
    } else if (suggestion.type === 'continuation' || suggestion.type === 'sentence_end') {
      // Continuation or sentence_end - add space then suggestion
      newText = text + ' ' + suggestion.text;
    } else {
      // New angle - add period and space if needed
      const lastChar = text.trim().slice(-1);
      if (lastChar !== '.' && lastChar !== '!' && lastChar !== '?') {
        newText = text.trim() + '. ' + suggestion.text;
      } else {
        newText = text.trim() + ' ' + suggestion.text;
      }
    }

    // Clear any pending debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set flag to skip the debounce useEffect
    skipDebounceRef.current = true;

    // Update text state
    setText(newText);
    if (onChange) {
      onChange(newText);
    }
    textareaRef.current?.focus();

    // Clear typing state and fetch immediately
    setIsTyping(false);
    fetchSuggestions(newText);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'continuation':
        return '→';
      case 'sentence_end':
        return '→';
      case 'new_angle':
        return '✨';
      case 'example':
        return '💡';
      default:
        return '→';
    }
  };

  const getElementColor = (targets: string[] | undefined) => {
    if (!targets || targets.length === 0) return '#6B7280';
    const element = targets[0];
    const colors: { [key: string]: string } = {
      companyType: '#3B82F6',      // Blue
      audience: '#10B981',          // Green
      problem: '#EF4444',           // Red
      solution: '#8B5CF6',          // Purple
      mission: '#F59E0B',           // Amber
      differentiator: '#EC4899',    // Pink
      brandIdentity: '#06B6D4',     // Cyan
      values: '#14B8A6'             // Teal
    };
    return colors[element] || '#6B7280';
  };

  const getElementLabel = (targets: string[] | undefined) => {
    if (!targets || targets.length === 0) return '';
    const element = targets[0];
    const labels: { [key: string]: string } = {
      companyType: 'Industry/Type',
      audience: 'Target Audience',
      problem: 'Problem',
      solution: 'Solution',
      mission: 'Mission',
      differentiator: 'Differentiator',
      brandIdentity: 'Brand Identity',
      values: 'Values'
    };
    return labels[element] || '';
  };

  const getUniqueSentenceTargets = (annotation: SentenceAnnotation | undefined | null) => {
    if (!annotation) return [];
    const fulfilled = getFulfilledTargetSet();
    const set = new Set<string>();
    annotation.segments.forEach(seg =>
      normalizeTargets(seg.targets)
        .filter(t => (fulfilled.size ? fulfilled.has(t) : true))
        .forEach(t => set.add(t))
    );
    return Array.from(set);
  };

  const underlineStyleForTargets = (targets: string[]) => {
    if (!targets.length) {
      return {
        boxShadow: 'none',
        background: 'transparent'
      } as React.CSSProperties;
    }

    // Avoid multi-color underlines for a single phrase; pick a single "primary" target.
    const primary = targets[0];
    const primaryColor = getElementColor([primary]);
    return {
      boxShadow: `inset 0 -2px 0 ${primaryColor}`,
      background: `${primaryColor}14`
    } as React.CSSProperties;
  };

  const renderAnnotatedSentence = (sentenceIndex: number, sentenceText: string, annotation: SentenceAnnotation | undefined) => {
    const segments = annotation?.segments?.length ? annotation.segments : [{ text: sentenceText, targets: [] }];
    return (
      <div
        key={sentenceIndex}
        className={`sentence-row ${activeSentenceIndexRef.current === sentenceIndex ? 'active' : ''}`}
        onClick={() => selectSentenceInTextarea(text, sentenceIndex)}
        role="button"
        tabIndex={0}
      >
        <div className="sentence-text">
          {segments.map((seg, i) => {
            const targets = normalizeTargets(seg.targets);
            return (
              <span
                key={i}
                className="sentence-seg"
                style={underlineStyleForTargets(targets)}
                title={targets.length ? targets.map(elementLabelForKey).join(', ') : 'Unlabeled'}
              >
                {seg.text}
              </span>
            );
          })}
        </div>
        <div className="sentence-tags">
          {getUniqueSentenceTargets(annotation).map(t => (
            <span key={t} className="sentence-tag" style={{ borderColor: getElementColor([t]), color: getElementColor([t]) }}>
              {elementLabelForKey(t)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Determine status indicator color
  const getStatusColor = () => {
    if (!text.trim()) return 'red'; // Empty = red
    if (!brandStatus) return 'orange'; // No analysis yet = orange
    if (brandStatus.satisfied && brandStatus.sentenceEnded) return 'green'; // Complete + period = green
    return 'orange'; // Otherwise = orange (typing or not satisfied)
  };

  // Map element keywords to their colors and labels
  const elementKeywords: { [key: string]: { color: string; label: string } } = {
    'company type': { color: '#3B82F6', label: 'Industry/Type' },
    'industry': { color: '#3B82F6', label: 'Industry/Type' },
    'type': { color: '#3B82F6', label: 'Industry/Type' },
    'audience': { color: '#10B981', label: 'Target Audience' },
    'target audience': { color: '#10B981', label: 'Target Audience' },
    'problem': { color: '#EF4444', label: 'Problem' },
    'solution': { color: '#8B5CF6', label: 'Solution' },
    'mission': { color: '#F59E0B', label: 'Mission' },
    'vision': { color: '#F59E0B', label: 'Mission' },
    'differentiator': { color: '#EC4899', label: 'Differentiator' },
    'unique': { color: '#EC4899', label: 'Differentiator' },
    'brand identity': { color: '#06B6D4', label: 'Brand Identity' },
    'personality': { color: '#06B6D4', label: 'Brand Identity' },
    'values': { color: '#14B8A6', label: 'Values' }
  };

  const highlightElements = (message: string) => {
    // Split message into parts and highlight element keywords
    const parts: Array<{ text: string; color?: string }> = [];
    let remainingText = message;
    let lastIndex = 0;

    // Sort keywords by length (longest first) to match longer phrases first
    const sortedKeywords = Object.entries(elementKeywords).sort((a, b) => b[0].length - a[0].length);

    const matches: Array<{ start: number; end: number; keyword: string; color: string }> = [];

    // Find all matches
    sortedKeywords.forEach(([keyword, { color }]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(message)) !== null) {
        // Check if this position is already matched by a longer keyword
        const overlaps = matches.some(m =>
          (match!.index >= m.start && match!.index < m.end) ||
          (match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end)
        );
        if (!overlaps) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            keyword: match[0],
            color
          });
        }
      }
    });

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Build highlighted parts
    matches.forEach(match => {
      if (lastIndex < match.start) {
        parts.push({ text: message.substring(lastIndex, match.start) });
      }
      parts.push({ text: match.keyword, color: match.color });
      lastIndex = match.end;
    });

    if (lastIndex < message.length) {
      parts.push({ text: message.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ text: message }];
  };

  const getStatusTooltip = () => {
    if (!text.trim()) {
      return [{ text: 'Start by introducing what type of brand your company is' }];
    }
    if (!brandStatus) {
      return [{ text: 'Continue building your brand description' }];
    }
    const fullMessage = `${brandStatus.overallAssessment}: ${brandStatus.statusMessage}`;
    return highlightElements(fullMessage);
  };

  const buildOverlaySegments = () => {
    const sentences = splitSentences(text);
    const nodes: React.ReactNode[] = [];
    const fulfilled = getFulfilledTargetSet();

    sentences.forEach(s => {
      const annotation = sentenceAnnotations[s.index];
      const segments = annotation?.segments?.length ? annotation.segments : [{ text: s.text, targets: [] }];
      const joined = segments.map(seg => seg.text).join('');
      const safeSegments = joined === s.text ? segments : [{ text: s.text, targets: [] }];

      let cursor = s.start;
      safeSegments.forEach((seg, i) => {
        const segText = seg.text || '';
        const start = cursor;
        const end = cursor + segText.length;
        cursor = end;

        const targets = normalizeTargets(seg.targets).filter(t => (fulfilled.size ? fulfilled.has(t) : true));
        const primary = targets[0];
        const color = primary ? getElementColor([primary]) : '#6B7280';
        const tooltipTargets = targets;

        nodes.push(
          <span
            key={`${s.index}-${i}-${start}`}
            className={`overlay-seg ${primary ? 'labeled' : 'unlabeled'}`}
            style={underlineStyleForTargets(targets)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!textareaRef.current) return;
              textareaRef.current.focus();
              const index = getCaretIndexFromPoint(e.clientX, e.clientY);
              const next = index === null ? end : index;
              textareaRef.current.setSelectionRange(next, next);
              setTimeout(() => handleCursorActivity(), 0);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!textareaRef.current) return;
              textareaRef.current.focus();
              const index = getCaretIndexFromPoint(e.clientX, e.clientY);
              const next = index === null ? end : index;
              textareaRef.current.setSelectionRange(next, next);
              setTimeout(() => handleCursorActivity(), 0);
            }}
            onMouseEnter={(e) => {
              if (!targets.length || !inputWrapperRef.current) return;
              const segRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const wrapperRect = inputWrapperRef.current.getBoundingClientRect();
              setSegmentTooltip({
                left: segRect.left - wrapperRect.left + segRect.width / 2,
                top: segRect.top - wrapperRect.top,
                primaryColor: color,
                targets: tooltipTargets
              });
            }}
            onMouseLeave={() => setSegmentTooltip(null)}
          >
            {segText}
          </span>
        );
      });
    });

    return nodes.length ? nodes : null;
  };

  const getCaretIndexFromPoint = (clientX: number, clientY: number) => {
    const container = overlayContentRef.current;
    if (!container) return null;

    // Chrome/Safari
    const anyDoc = document as any;
    const range: Range | null =
      typeof anyDoc.caretRangeFromPoint === 'function'
        ? anyDoc.caretRangeFromPoint(clientX, clientY)
        : null;

    // Firefox
    if (!range && typeof anyDoc.caretPositionFromPoint === 'function') {
      const pos = anyDoc.caretPositionFromPoint(clientX, clientY);
      if (pos?.offsetNode) {
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
        return getOffsetWithinContainer(container, r);
      }
      return null;
    }

    if (!range) return null;
    return getOffsetWithinContainer(container, range);
  };

  const getOffsetWithinContainer = (container: HTMLElement, caretRange: Range) => {
    try {
      const pre = document.createRange();
      pre.setStart(container, 0);
      pre.setEnd(caretRange.startContainer, caretRange.startOffset);
      return pre.toString().length;
    } catch {
      return null;
    }
  };

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (!overlayRef.current) return;
    const x = -(target.scrollLeft || 0);
    const y = -(target.scrollTop || 0);
    overlayRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  return (
    <div className="brand-autocomplete">
      {showHeader && (
        <div className="header">
          <h1 style={{ textAlign: 'left', marginBottom: '8px' }}>Tell us about your brand</h1>
          <p style={{ textAlign: 'left', color: '#6B7280', marginBottom: '16px', fontSize: '15px' }}>Describe it in your own words</p>
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
        <div className="input-wrapper" ref={inputWrapperRef}>
          {guidanceOpen && (
            <>
              <div
                className="textarea-overlay"
                ref={overlayRef}
                aria-hidden="true"
                onMouseDown={(e) => {
                  // Keep textarea editable even though overlay sits above it.
                  if ((e.target as HTMLElement)?.classList?.contains('overlay-seg')) return;
                  e.preventDefault();
                  textareaRef.current?.focus();
                }}
              >
                <div className="textarea-overlay-content" ref={overlayContentRef}>
                  {buildOverlaySegments()}
                </div>
              </div>
              {segmentTooltip && (
                <div
                  className="segment-tooltip"
                  style={{
                    left: segmentTooltip.left,
                    top: segmentTooltip.top
                  }}
                >
                  <div className="tooltip-header" style={{ backgroundColor: segmentTooltip.primaryColor }}>
                    Fulfilled
                  </div>
                  <div className="tooltip-body">
                    <div className="segment-tooltip-tags">
                      {segmentTooltip.targets.map(t => (
                        <span
                          key={t}
                          className="segment-tooltip-tag"
                          style={{ borderColor: getElementColor([t]), color: getElementColor([t]) }}
                        >
                          {elementLabelForKey(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onClick={handleCursorActivity}
            onKeyUp={handleCursorActivity}
            onSelect={handleCursorActivity}
            onScroll={handleTextareaScroll}
            placeholder="Start typing about your brand... (AI recommendation is sensitive to your input and periods)"
            className="brand-textarea"
            rows={8}
          />

          {/* Status indicator (click to toggle highlights + explanation) */}
          <div className="status-indicator-overlay">
            <div
              className={`status-light ${getStatusColor()} ${guidanceOpen ? 'open' : ''}`}
              onClick={() => {
                setGuidanceOpen(open => {
                  const next = !open;
                  if (!next) setSegmentTooltip(null);
                  return next;
                });
              }}
              role="button"
              tabIndex={0}
              title="Toggle analysis + highlights"
            >
              <div className="status-tooltip">
                <div className="status-tooltip-message">
                  {getStatusTooltip().map((part, idx) => (
                    part.color ? (
                      <span key={idx} className="highlighted-keyword" style={{ color: part.color, fontWeight: 600 }}>
                        {part.text}
                      </span>
                    ) : (
                      <span key={idx}>{part.text}</span>
                    )
                  ))}
                </div>
                <div className="evaluation-note-inline">
                  Click the circle to {guidanceOpen ? 'hide' : 'show'} highlights
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
                  const showDirectionIndicator = elementLabel && suggestion.reasoning;

                  return (
                    <button
                      key={index}
                      className={`inline-suggestion-bubble ${suggestion.type} ${showDirectionIndicator ? 'has-direction' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={showDirectionIndicator ? { borderLeftColor: elementColor, borderLeftWidth: '3px' } : {}}
                    >
                      {showDirectionIndicator && (
                        <span
                          className="direction-indicator"
                          style={{ backgroundColor: elementColor }}
                        />
                      )}
                      <span className="bubble-icon">{getSuggestionIcon(suggestion.type)}</span>
                      <span className="bubble-text">{suggestion.text}</span>
                      {showDirectionIndicator && (
                        <div className="direction-tooltip">
                          <div className="tooltip-header" style={{ backgroundColor: elementColor }}>
                            {elementLabel}
                          </div>
                          <div className="tooltip-body">
                            {suggestion.reasoning}
                          </div>
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

      {/* Model Controls Panel - Hidden */}

      {/* Progress checklist - Hidden */}
    </div>
  );
};

export default BrandAutocomplete;
