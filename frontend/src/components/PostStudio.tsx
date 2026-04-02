import React, { useEffect } from 'react';

import PostGrid from './PostGrid';
import PostSingleView from './PostSingleView';
import HistoryBoardModal from './history/HistoryBoardModal';
import GuidedFeedbackInterview from './postStudio/GuidedFeedbackInterview';
import PostGenerationPlan from './postStudio/PostGenerationPlan';
import PostStudioContextRail from './postStudio/PostStudioContextRail';
import { usePostStudioController } from './postStudio/usePostStudioController';
import type { PostStudioProps } from './postStudio/postStudio.types';
import './PostStudio.css';

const PostStudio: React.FC<PostStudioProps> = (props) => {
  const {
    viewMode,
    isRailOpen,
    isGenerating,
    isEvaluating,
    error,
    history,
    currentGridPosts,
    guidedCoachMessage,
    guidedSession,
    generationBrief,
    selectedPost,
    showHistoryModal,
    generatedImageCount,
    clarificationMemory,
    pendingQuestion,
    pendingGoalDraft,
    liveBusinessGoal,
    livePostGoal,
    setIsRailOpen,
    setShowHistoryModal,
    handleBack,
    handleGridBatchFeedbackChange,
    handleInspectPost,
    handleStartGuidedFeedback,
    handleGuidedBackToGrid,
    handleGuidedPrevStep,
    handleGuidedNextStep,
    handleGuidedReasonSelect,
    handleGuidedCustomNoteChange,
    handleGuidedHardToAnswer,
    handleGuidedExampleSelect,
    handleGuidedKeepUnresolved,
    handleGenerationBriefRouteChange,
    handleGenerationBriefSimilarityChange,
    handleGenerateFromBrief,
    handleRegenerateFromBrief,
    handleEdit,
    handleSelectedPostFeedbackChange,
    handleClarificationSubmit,
    handleClarificationSkip,
    handleGoalDraftApply,
    handleGoalDraftDismiss,
    handleFinalize,
    focusGeneration,
    focusNode,
  } = usePostStudioController(props);

  useEffect(() => {
    props.onViewModeChange?.(viewMode);
  }, [props.onViewModeChange, viewMode]);

  return (
    <div className="post-studio">
      <div className="post-studio-shell">
        <PostStudioContextRail
          brandName={props.brandName}
          brandCategory={props.brandCategory}
          brandNarrative={props.brandNarrative}
          businessGoalTitle={liveBusinessGoal.title}
          businessGoalDescription={liveBusinessGoal.description}
          postGoalTitle={livePostGoal.title}
          postGoalDescription={livePostGoal.description}
          isOpen={isRailOpen}
          onBack={handleBack}
          onToggle={() => setIsRailOpen(open => !open)}
        />

        <main className="post-studio-main">
          {error && <div className="error-banner">{error}</div>}

          <div className="post-studio-stage">
            {viewMode === 'grid' ? (
              <PostGrid
                posts={currentGridPosts}
                coachMessage={guidedCoachMessage}
                onInspect={handleInspectPost}
                onStartGuidedFeedback={handleStartGuidedFeedback}
                onBatchFeedbackChange={handleGridBatchFeedbackChange}
                isGenerating={isGenerating}
                traceCount={history.size}
                onTraceClick={() => setShowHistoryModal(true)}
                traceDisabled={history.size === 0}
                generatedImageCount={generatedImageCount}
                onHistoryOpen={() => setShowHistoryModal(true)}
                historyDisabled={history.size === 0}
              />
            ) : null}

            {viewMode === 'guided' ? (
              <GuidedFeedbackInterview
                session={guidedSession}
                posts={currentGridPosts}
                isEvaluating={isEvaluating}
                onBackToGrid={handleGuidedBackToGrid}
                onPrev={handleGuidedPrevStep}
                onNext={handleGuidedNextStep}
                onSelectReason={handleGuidedReasonSelect}
                onCustomNoteChange={handleGuidedCustomNoteChange}
                onOpenHardToAnswer={handleGuidedHardToAnswer}
                onSelectExampleReason={handleGuidedExampleSelect}
                onKeepUnresolved={handleGuidedKeepUnresolved}
                onClarificationSubmit={handleClarificationSubmit}
                onClarificationSkip={handleClarificationSkip}
              />
            ) : null}

            {viewMode === 'brief' ? (
              <PostGenerationPlan
                brief={generationBrief}
                session={guidedSession}
                pendingQuestion={pendingQuestion}
                pendingGoalDraft={pendingGoalDraft}
                isEvaluating={isEvaluating}
                businessGoalTitle={liveBusinessGoal.title}
                postGoalTitle={livePostGoal.title}
                postGoalDescription={livePostGoal.description}
                onBackToGuided={handleBack}
                onRouteChange={handleGenerationBriefRouteChange}
                onSimilarityChange={handleGenerationBriefSimilarityChange}
                onClarificationSubmit={handleClarificationSubmit}
                onClarificationSkip={handleClarificationSkip}
                onGoalDraftApply={handleGoalDraftApply}
                onGoalDraftDismiss={handleGoalDraftDismiss}
                onGenerateNext={handleGenerateFromBrief}
                onRegenerateCurrent={handleRegenerateFromBrief}
              />
            ) : null}

            {viewMode === 'single' && selectedPost ? (
              <PostSingleView
                post={selectedPost}
                feedback={selectedPost.feedback ?? { type: null, reasons: [] }}
                onFeedbackChange={handleSelectedPostFeedbackChange}
                onEdit={handleEdit}
                onFinalize={handleFinalize}
                onBack={handleBack}
                isGenerating={isGenerating}
              />
            ) : null}
          </div>
        </main>
      </div>

      <HistoryBoardModal
        isOpen={showHistoryModal}
        history={history}
        clarificationCycles={clarificationMemory?.cycles ?? []}
        onClose={() => setShowHistoryModal(false)}
        onSelectGeneration={focusGeneration}
        onSelectNode={focusNode}
      />
    </div>
  );
};

export default PostStudio;
