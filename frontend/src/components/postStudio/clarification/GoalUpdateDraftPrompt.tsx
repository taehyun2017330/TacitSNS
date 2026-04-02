import React, { useEffect, useState } from 'react';

import type { ClarificationDraftGoalUpdate } from '../../history/types';
import './GoalUpdateDraftPrompt.css';

interface Props {
  draft: ClarificationDraftGoalUpdate | null;
  onApply: (draft: ClarificationDraftGoalUpdate) => void;
  onDismiss: () => void;
  variant?: 'overlay' | 'inline';
}

const GoalUpdateDraftPrompt: React.FC<Props> = ({
  draft,
  onApply,
  onDismiss,
  variant = 'overlay'
}) => {
  const [localDraft, setLocalDraft] = useState<ClarificationDraftGoalUpdate | null>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  if (!localDraft) {
    return null;
  }

  const updateDirectionAngle = (index: number, value: string) => {
    setLocalDraft(current => {
      if (!current) {
        return current;
      }

      const nextAngles = [...(current.directionAngles ?? [])];
      nextAngles[index] = value;
      return {
        ...current,
        directionAngles: nextAngles
      };
    });
  };

  return (
    <aside className={`goal-update-draft goal-update-draft--${variant}`} role="dialog" aria-modal="false">
      <div className="goal-update-draft-header">
        <div>
          <div className="goal-update-draft-eyebrow">
            {localDraft.target === 'business_goal' ? 'Business goal revision' : 'Post goal revision'}
          </div>
          <div className="goal-update-draft-title">Apply this update?</div>
        </div>
        <button
          type="button"
          className="goal-update-draft-close"
          onClick={onDismiss}
          aria-label="Dismiss goal update draft"
        >
          ×
        </button>
      </div>

      <div className="goal-update-draft-body">
        <label className="goal-update-draft-field">
          <span>Title</span>
          <input
            value={localDraft.title}
            onChange={(event) =>
              setLocalDraft(current => (current ? { ...current, title: event.target.value } : current))
            }
          />
        </label>

        <label className="goal-update-draft-field">
          <span>Description</span>
          <textarea
            rows={3}
            value={localDraft.description}
            onChange={(event) =>
              setLocalDraft(current => (current ? { ...current, description: event.target.value } : current))
            }
          />
        </label>

        {localDraft.target === 'post_goal' && localDraft.whyThisDirectionFits ? (
          <label className="goal-update-draft-field">
            <span>Why this works</span>
            <textarea
              rows={2}
              value={localDraft.whyThisDirectionFits}
              onChange={(event) =>
                setLocalDraft(current =>
                  current ? { ...current, whyThisDirectionFits: event.target.value } : current
                )
              }
            />
          </label>
        ) : null}

        {localDraft.target === 'post_goal' && localDraft.directionAngles?.length ? (
          <div className="goal-update-draft-directions">
            <div className="goal-update-draft-section-title">Direction angles</div>
            <div className="goal-update-draft-direction-list">
              {localDraft.directionAngles.map((angle, index) => (
                <input
                  key={`${localDraft.id}-angle-${index}`}
                  value={angle}
                  onChange={(event) => updateDirectionAngle(index, event.target.value)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="goal-update-draft-actions">
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onDismiss}>
          Dismiss
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => onApply(localDraft)}
        >
          Apply live
        </button>
      </div>
    </aside>
  );
};

export default GoalUpdateDraftPrompt;
