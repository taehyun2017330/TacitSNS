import React, { useEffect, useMemo, useState } from 'react';

import type { ClarificationAnswer, ClarificationQuestion } from './types';
import './ClarificationPrompt.css';

const ICONS = {
  summarize: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12M6 12h9M6 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  probe: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9.2a2 2 0 0 1 1.9 2.3c-.2 1.1-1.3 1.5-1.8 2.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1" fill="currentColor" />
    </svg>
  ),
  clarify: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12v10H9l-3 3V7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11h4M10 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  challenge: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m14 4 3 3-3 3M10 20l-3-3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  goal_reframe: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 12 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
};

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function iconForVisual(value?: { kind: string; value?: string; tone?: string; text?: string }) {
  if (!value || value.kind !== 'icon') {
    return null;
  }

  if (value.value === 'scope') {
    return <span className="clarification-card-glyph">◫</span>;
  }
  if (value.value === 'target') {
    return <span className="clarification-card-glyph">◎</span>;
  }
  if (value.value === 'compare') {
    return <span className="clarification-card-glyph">⇄</span>;
  }
  return <span className="clarification-card-glyph">⟐</span>;
}

interface Props {
  question: ClarificationQuestion | null;
  onSubmit: (answer: ClarificationAnswer) => void;
  onSkip: () => void;
  onClose: () => void;
  variant?: 'overlay' | 'inline';
  showHeader?: boolean;
  showPrompt?: boolean;
  showOriginalFeedback?: boolean;
  skipLabel?: string;
  submitLabel?: string;
}

const ClarificationPrompt: React.FC<Props> = ({
  question,
  onSubmit,
  onSkip,
  onClose,
  variant = 'overlay',
  showHeader = true,
  showPrompt = true,
  showOriginalFeedback = true,
  skipLabel = 'Skip',
  submitLabel = 'Apply clarification'
}) => {
  const [values, setValues] = useState<Record<string, string | string[] | number>>({});

  useEffect(() => {
    if (!question) {
      setValues({});
      return;
    }

    const defaults = question.controls.reduce<Record<string, string | string[] | number>>((acc, control) => {
      if (control.kind === 'scale' && typeof control.defaultValue === 'number') {
        acc[control.id] = control.defaultValue;
      } else if (control.kind === 'choice') {
        acc[control.id] = control.selectionMode === 'multiple' ? [] : '';
      } else if (control.kind === 'text') {
        acc[control.id] = '';
      }
      return acc;
    }, {});

    setValues(defaults);
  }, [question]);

  const isValid = useMemo(() => {
    if (!question) {
      return false;
    }

    return question.controls.every(control => {
      if (!('required' in control) || !control.required) {
        return true;
      }

      const value = values[control.id];
      if (control.kind === 'choice') {
        if (control.selectionMode === 'multiple') {
          return Array.isArray(value) && value.length > 0;
        }
        return typeof value === 'string' && value.length > 0;
      }

      return typeof value === 'number' || cleanText(value).length > 0;
    });
  }, [question, values]);

  if (!question) {
    return null;
  }

  const setChoiceValue = (controlId: string, optionId: string, selectionMode: 'single' | 'multiple') => {
    setValues(prev => {
      if (selectionMode === 'single') {
        return { ...prev, [controlId]: prev[controlId] === optionId ? '' : optionId };
      }

      const current = Array.isArray(prev[controlId]) ? prev[controlId] : [];
      return {
        ...prev,
        [controlId]: current.includes(optionId)
          ? current.filter(entry => entry !== optionId)
          : [...current, optionId]
      };
    });
  };

  const handleSubmit = () => {
    onSubmit({
      questionId: question.id,
      family: question.family,
      move: question.move,
      values,
      answeredAt: Date.now()
    });
  };

  const content = (
    <div
      className={`clarification-sheet clarification-sheet--${question.move} clarification-sheet--${question.presentation} clarification-sheet--${variant}`}
    >
        {showHeader ? (
          <div className="clarification-sheet-header">
            <div className="clarification-sheet-heading">
              <span className="clarification-sheet-icon">
                {ICONS[question.move] ?? ICONS[question.family]}
              </span>
              <div>
                <div className="clarification-sheet-title">{question.title}</div>
                <div className="clarification-sheet-subtitle">{question.subtitle}</div>
              </div>
            </div>
            <button type="button" className="clarification-sheet-close" onClick={onClose} aria-label="Close clarification">
              ×
            </button>
          </div>
        ) : null}

        <div className="clarification-sheet-body">
          {showPrompt ? (
            <p className="clarification-sheet-prompt">“{question.prompt}”</p>
          ) : null}

          {showOriginalFeedback && question.originalFeedback ? (
            <div className="clarification-source-block">
              <div className="clarification-source-label">Your original feedback</div>
              <div className="clarification-source-text">“{question.originalFeedback}”</div>
            </div>
          ) : null}

          {question.evidenceImages?.length ? (
            <div className={`clarification-evidence clarification-evidence--${question.move}`}>
              {question.evidenceImages.map(image => (
                <div key={image.id} className="clarification-evidence-card">
                  <div className="clarification-evidence-image">
                    <img src={image.imageUrl} alt={image.label} />
                  </div>
                  <div className="clarification-evidence-label">{image.label}</div>
                  {image.description ? (
                    <div className="clarification-evidence-description">{image.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {question.controls.map(control => {
            if (control.kind === 'choice') {
              const currentValue = values[control.id];
              const isMultiple = control.selectionMode === 'multiple';

              return (
                <section key={control.id} className="clarification-section">
                  <div className="clarification-section-label">{control.label}</div>
                  <div className={`clarification-choice-grid clarification-choice-grid--${control.appearance ?? 'cards'}`}>
                    {control.options.map(option => {
                      const selected = isMultiple
                        ? Array.isArray(currentValue) && currentValue.includes(option.id)
                        : currentValue === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`clarification-choice-card ${selected ? 'selected' : ''}`}
                          onClick={() => setChoiceValue(control.id, option.id, control.selectionMode)}
                        >
                          {option.visual?.kind === 'swatch' ? (
                            <span
                              className="clarification-choice-visual clarification-choice-visual--swatch"
                              style={{ background: option.visual.value }}
                              aria-hidden="true"
                            />
                          ) : null}

                          {option.visual?.kind === 'specimen' ? (
                            <span className={`clarification-choice-visual clarification-choice-visual--specimen is-${option.visual.tone ?? 'clean'}`}>
                              {option.visual.text}
                            </span>
                          ) : null}

                          {iconForVisual(option.visual) ? (
                            <span className="clarification-choice-visual clarification-choice-visual--icon">
                              {iconForVisual(option.visual)}
                            </span>
                          ) : null}

                          <span className="clarification-choice-copy">
                            <span className="clarification-choice-label">{option.label}</span>
                            {option.description ? (
                              <span className="clarification-choice-description">{option.description}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            }

            if (control.kind === 'scale') {
              return (
                <section key={control.id} className="clarification-section">
                  <div className="clarification-section-label">{control.label}</div>
                  <div className="clarification-scale">
                    <span>{control.minLabel}</span>
                    <input
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step ?? 1}
                      value={typeof values[control.id] === 'number' ? values[control.id] : control.defaultValue ?? control.min}
                      onChange={(event) =>
                        setValues(prev => ({
                          ...prev,
                          [control.id]: Number(event.target.value)
                        }))
                      }
                    />
                    <span>{control.maxLabel}</span>
                  </div>
                </section>
              );
            }

            return (
              <section key={control.id} className="clarification-section">
                <div className="clarification-section-label">{control.label}</div>
                {control.multiline ? (
                  <textarea
                    className="clarification-textarea"
                    placeholder={control.placeholder}
                    value={typeof values[control.id] === 'string' ? values[control.id] : ''}
                    rows={3}
                    onChange={(event) =>
                      setValues(prev => ({
                        ...prev,
                        [control.id]: event.target.value
                      }))
                    }
                  />
                ) : (
                  <input
                    className="clarification-input"
                    placeholder={control.placeholder}
                    value={typeof values[control.id] === 'string' ? values[control.id] : ''}
                    onChange={(event) =>
                      setValues(prev => ({
                        ...prev,
                        [control.id]: event.target.value
                      }))
                    }
                  />
                )}
              </section>
            );
          })}
        </div>

        <div className="clarification-sheet-actions">
          <button type="button" className="ui-btn ui-btn--secondary clarification-action-secondary" onClick={onSkip}>
            {skipLabel}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--primary clarification-action-primary"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            {submitLabel}
          </button>
        </div>
      </div>
  );

  if (variant === 'inline') {
    return (
      <div className="clarification-inline" role="dialog" aria-modal="false">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`clarification-overlay clarification-overlay--${question.presentation}`}
      role="dialog"
      aria-modal="false"
    >
      {content}
    </div>
  );
};

export default ClarificationPrompt;
