import React from 'react';

interface Props {
  brandName: string;
  selectedBusinessGoalTitle: string | null;
  onCancel: () => void;
  onKeepPreviousGoal: () => void;
  onRegenerateGoals: () => void;
}

const GoalRefreshDecisionCard: React.FC<Props> = ({
  brandName,
  selectedBusinessGoalTitle,
  onCancel,
  onKeepPreviousGoal,
  onRegenerateGoals
}) => (
  <div className="goal-transition-card">
    <h3>Update the saved business-goal step?</h3>
    <p>
      You changed the brand narrative after choosing a business goal. Keep the previous business goal and post goals, or regenerate a new business-goal set from the updated narrative.
    </p>
    <div className="goal-transition-summary">
      <span>{brandName || 'Your brand'}</span>
      <span>{selectedBusinessGoalTitle || 'Business goal selected'}</span>
    </div>
    <div className="brand-onboarding-actions brand-onboarding-actions--inline">
      <button
        type="button"
        className="ui-btn ui-btn--secondary"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        className="ui-btn ui-btn--secondary"
        onClick={onKeepPreviousGoal}
      >
        Keep previous goal
      </button>
      <button
        type="button"
        className="ui-btn ui-btn--primary"
        onClick={onRegenerateGoals}
      >
        Regenerate goals
      </button>
    </div>
  </div>
);

export default GoalRefreshDecisionCard;
