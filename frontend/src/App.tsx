import React, { useCallback, useEffect, useRef, useState } from 'react';

import PrototypeLogin from './components/auth/PrototypeLogin';
import PrototypeDebugDrawer from './components/debug/PrototypeDebugDrawer';
import type { ClarificationDraftGoalUpdate } from './components/history/types';
import AppJourneyProgress, { type JourneyStepKey } from './components/navigation/AppJourneyProgress';
import BrandInfoStep from './components/onboarding/BrandInfoStep';
import type { OnboardingStep } from './components/onboarding/brandOnboarding.config';
import PostStudio from './components/PostStudio';
import {
  bootstrapInitialStudioSession,
  createPendingStudioSession
} from './components/postStudio/sessionBootstrap';
import type { ViewMode } from './components/postStudio/postStudio.types';
import WorkspaceEditModal from './components/workspace/WorkspaceEditModal';
import PostGoalWorkspace from './components/workspace/PostGoalWorkspace';
import {
  createPostGoalFolder,
  inferBusinessGoalOptions
} from './data/goalHierarchy';
import type { BrandData } from './types/brand';
import type { PostGoalStudioSession } from './types/postStudio';
import type {
  AppStage,
  OnboardingResult,
  PostGoalFolder,
  PrototypeUser,
  WorkspaceSnapshot
} from './types/workspace';
import './App.css';

const STORAGE_KEY = 'tacitsns-prototype-shell-v2';
const STAGE_TRANSITION_MS = 360;

function createSampleWorkspace(brand: BrandData): WorkspaceSnapshot {
  const inferredGoals = inferBusinessGoalOptions(brand);
  const selectedBusinessGoals = inferredGoals.filter(goal => goal.isRecommended).slice(0, 3);
  const activeGoal = selectedBusinessGoals[0] ?? inferredGoals[0];
  const starterFolders: PostGoalFolder[] = activeGoal
    ? [
        createPostGoalFolder(
          {
            title: 'Show our quality or process',
            description: 'Use one post to make craftsmanship and credibility immediately visible.',
            taxonomyTags: ['Functional', 'Educational'],
            assistantPrompt: 'Show product or service quality cues with calm, credible visual storytelling.'
          },
          activeGoal,
          'recommended'
        )
      ]
    : [];

  return {
    brand,
    selectedBusinessGoals,
    activeBusinessGoalId: activeGoal?.id ?? 'trust',
    postGoalFolders: starterFolders
  };
}

function App() {
  const [currentStage, setCurrentStage] = useState<AppStage>('auth');
  const [stageTransition, setStageTransition] = useState<{
    exiting: AppStage;
    entering: AppStage;
    direction: 'forward' | 'backward';
  } | null>(null);
  const [user, setUser] = useState<PrototypeUser | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<PostGoalFolder | null>(null);
  const [studioSessionsByFolderId, setStudioSessionsByFolderId] = useState<Record<string, PostGoalStudioSession>>({});
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<'narrative' | undefined>(
    undefined
  );
  const [isWorkspaceEditOpen, setIsWorkspaceEditOpen] = useState(false);
  const [onboardingProgressStep, setOnboardingProgressStep] = useState<OnboardingStep>('narrative');
  const [workspaceEditProgressStep, setWorkspaceEditProgressStep] = useState<OnboardingStep>('narrative');
  const [studioViewMode, setStudioViewMode] = useState<ViewMode>('grid');
  const initialStudioBootstrapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const brandData = workspace?.brand ?? null;

  const transitionToStage = (nextStage: AppStage, direction: 'forward' | 'backward' = 'forward') => {
    if (nextStage === currentStage) {
      return;
    }

    setStageTransition({
      exiting: currentStage,
      entering: nextStage,
      direction
    });
    setCurrentStage(nextStage);

    window.setTimeout(() => {
      setStageTransition(prev =>
        prev?.entering === nextStage ? null : prev
      );
    }, STAGE_TRANSITION_MS);
  };

  const handleLogin = (nextUser: PrototypeUser) => {
    setUser(nextUser);
    setOnboardingInitialStep(undefined);
    setOnboardingProgressStep('narrative');
    transitionToStage(workspace ? 'workspace' : 'onboarding', 'forward');
  };

  const handleOnboardingComplete = (result: OnboardingResult) => {
    setWorkspace(result);
    setStudioSessionsByFolderId({});
    setSelectedFolder(null);
    setOnboardingInitialStep(undefined);
    setOnboardingProgressStep('narrative');
    transitionToStage('workspace', 'forward');
  };

  const handleWorkspaceEditComplete = (result: OnboardingResult) => {
    const nextFolderIds = new Set(result.postGoalFolders.map(folder => folder.id));

    setWorkspace(result);
    setSelectedFolder(null);
    setWorkspaceEditProgressStep('narrative');
    setStudioSessionsByFolderId(current =>
      Object.fromEntries(
        Object.entries(current).filter(([folderId]) => nextFolderIds.has(folderId))
      )
    );
    setIsWorkspaceEditOpen(false);
  };

  const handleRemoveWorkspacePostGoal = (folderId: string) => {
    delete initialStudioBootstrapRef.current[folderId];

    setWorkspace(current => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        postGoalFolders: current.postGoalFolders.filter(folder => folder.id !== folderId)
      };
    });

    setSelectedFolder(current => (current?.id === folderId ? null : current));
    setStudioSessionsByFolderId(current => {
      if (!(folderId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[folderId];
      return next;
    });
  };

  const handleUpdateStudioSession = useCallback((folderId: string, session: PostGoalStudioSession) => {
    setStudioSessionsByFolderId(current => {
      const existingSession = current[folderId];
      if (existingSession && JSON.stringify(existingSession) === JSON.stringify(session)) {
        return current;
      }

      return {
        ...current,
        [folderId]: session
      };
    });
  }, []);

  const startInitialStudioBootstrap = useCallback(
    (folder: PostGoalFolder, snapshot: WorkspaceSnapshot | null) => {
      if (!snapshot) {
        return;
      }

      const existingSession = studioSessionsByFolderId[folder.id];
      if (
        existingSession?.bootstrapStatus === 'generating' ||
        (existingSession?.nodes?.length ?? 0) > 0 ||
        initialStudioBootstrapRef.current[folder.id]
      ) {
        return;
      }

      const businessGoal =
        snapshot.selectedBusinessGoals.find(goal => goal.id === folder.businessGoalId) ?? null;
      const requestId = `${folder.id}:${Date.now()}`;
      initialStudioBootstrapRef.current[folder.id] = requestId;

      handleUpdateStudioSession(
        folder.id,
        createPendingStudioSession({
          brandName: snapshot.brand.name,
          brandCategory: snapshot.brand.category,
          brandIdentity: snapshot.brand.identity,
          brandNarrative: snapshot.brand.description,
          businessGoal,
          folder
        })
      );

      void bootstrapInitialStudioSession({
        brandName: snapshot.brand.name,
        brandCategory: snapshot.brand.category,
        brandIdentity: snapshot.brand.identity,
        brandNarrative: snapshot.brand.description,
        businessGoal,
        folder
      }).then(session => {
        if (initialStudioBootstrapRef.current[folder.id] !== requestId) {
          return;
        }

        handleUpdateStudioSession(folder.id, session);
      }).finally(() => {
        if (initialStudioBootstrapRef.current[folder.id] === requestId) {
          delete initialStudioBootstrapRef.current[folder.id];
        }
      });
    },
    [handleUpdateStudioSession, studioSessionsByFolderId]
  );

  const handleCreateWorkspacePostGoal = (folder: PostGoalFolder) => {
    if (!workspace) {
      return;
    }

    const existingIndex = workspace.postGoalFolders.findIndex(existing => existing.id === folder.id);
    const nextFolders =
      existingIndex === -1
        ? [...workspace.postGoalFolders, folder]
        : workspace.postGoalFolders.map(existing => (existing.id === folder.id ? folder : existing));
    const nextWorkspace = {
      ...workspace,
      postGoalFolders: nextFolders
    };

    setWorkspace(nextWorkspace);

    if (currentStage === 'workspace' && nextFolders.length === 1) {
      startInitialStudioBootstrap(folder, nextWorkspace);
    }
  };

  const handleSelectedFolderStudioSessionChange = useCallback(
    (session: PostGoalStudioSession) => {
      if (!selectedFolder) {
        return;
      }

      handleUpdateStudioSession(selectedFolder.id, session);
    },
    [selectedFolder]
  );

  const handleApplyStudioGoalUpdate = useCallback(
    (draft: ClarificationDraftGoalUpdate) => {
      if (!selectedFolder) {
        return;
      }

      setWorkspace(current => {
        if (!current) {
          return current;
        }

        const nextBusinessGoals =
          draft.target === 'business_goal'
            ? current.selectedBusinessGoals.map(goal =>
                goal.id === selectedFolder.businessGoalId
                  ? {
                      ...goal,
                      title: draft.title,
                      description: draft.description,
                      rationale: draft.rationale || goal.rationale
                    }
                  : goal
              )
            : current.selectedBusinessGoals;

        const nextFolders = current.postGoalFolders.map(folder => {
          if (draft.target === 'business_goal' && folder.businessGoalId === selectedFolder.businessGoalId) {
            return {
              ...folder,
              businessGoalTitle: draft.title
            };
          }

          if (draft.target === 'post_goal' && folder.id === selectedFolder.id) {
            return {
              ...folder,
              title: draft.title,
              description: draft.description,
              whyThisDirectionFits: draft.whyThisDirectionFits || folder.whyThisDirectionFits,
              directionAngles:
                draft.directionAngles?.length ? draft.directionAngles : folder.directionAngles,
              imageTypeChips:
                draft.imageTypeChips?.length ? draft.imageTypeChips : folder.imageTypeChips
            };
          }

          return folder;
        });

        return {
          ...current,
          selectedBusinessGoals: nextBusinessGoals,
          postGoalFolders: nextFolders
        };
      });

      setSelectedFolder(current => {
        if (!current) {
          return current;
        }

        if (draft.target === 'business_goal') {
          return {
            ...current,
            businessGoalTitle: draft.title
          };
        }

        return {
          ...current,
          title: draft.title,
          description: draft.description,
          whyThisDirectionFits: draft.whyThisDirectionFits || current.whyThisDirectionFits,
          directionAngles:
            draft.directionAngles?.length ? draft.directionAngles : current.directionAngles,
          imageTypeChips:
            draft.imageTypeChips?.length ? draft.imageTypeChips : current.imageTypeChips
        };
      });
    },
    [selectedFolder]
  );

  const handleLoadSampleWorkspace = (brand: BrandData) => {
    const sampleWorkspace = createSampleWorkspace(brand);
    setWorkspace(sampleWorkspace);
    setStudioSessionsByFolderId({});
    setUser({
      id: `prototype-sample-${Date.now()}`,
      name: 'Sample User',
      email: 'sample@prototype.local'
    });
    setSelectedFolder(null);
    setOnboardingInitialStep(undefined);
    setOnboardingProgressStep('narrative');
    transitionToStage('workspace', 'forward');
  };

  useEffect(() => {
    if (currentStage !== 'workspace' || !workspace || workspace.postGoalFolders.length !== 1) {
      return;
    }

    startInitialStudioBootstrap(workspace.postGoalFolders[0], workspace);
  }, [currentStage, startInitialStudioBootstrap, workspace]);

  const activeJourneyStep: JourneyStepKey = (() => {
    if (isWorkspaceEditOpen) {
      if (workspaceEditProgressStep === 'goals') {
        return 'business-goal';
      }

      if (workspaceEditProgressStep === 'post-goals') {
        return 'post-goal';
      }

      return 'narrative';
    }

    if (currentStage === 'auth') {
      return 'intro';
    }

    if (currentStage === 'onboarding') {
      if (onboardingProgressStep === 'goals') {
        return 'business-goal';
      }

      if (onboardingProgressStep === 'post-goals') {
        return 'post-goal';
      }

      return 'narrative';
    }

    if (currentStage === 'workspace') {
      return 'dashboard';
    }

    return studioViewMode === 'single' ? 'image-post' : 'image-generation';
  })();

  const renderStage = (stage: AppStage) => {
    if (stage === 'auth') {
      return <PrototypeLogin onLogin={handleLogin} />;
    }

    if (stage === 'onboarding' && user) {
      return (
        <BrandInfoStep
          initialData={workspace}
          initialStep={onboardingInitialStep}
          onStepChange={setOnboardingProgressStep}
          onComplete={handleOnboardingComplete}
        />
      );
    }

    if (stage === 'workspace' && workspace) {
      return (
        <>
          <PostGoalWorkspace
            brandName={workspace.brand.name}
            brandCategory={workspace.brand.category}
            brandIdentity={workspace.brand.identity}
            brandNarrative={workspace.brand.description}
            businessGoals={workspace.selectedBusinessGoals}
            activeBusinessGoalId={workspace.activeBusinessGoalId}
            postGoalFolders={workspace.postGoalFolders}
            studioSessionsByFolderId={studioSessionsByFolderId}
            onEditGoals={() => {
              setSelectedFolder(null);
              setWorkspaceEditProgressStep('narrative');
              setIsWorkspaceEditOpen(true);
            }}
            onCreatePostGoal={handleCreateWorkspacePostGoal}
            onRemovePostGoal={handleRemoveWorkspacePostGoal}
            onOpenPostGoal={folder => {
              setSelectedFolder(folder);
              setStudioViewMode('grid');
              transitionToStage('studio', 'forward');
            }}
          />

          <WorkspaceEditModal
            isOpen={isWorkspaceEditOpen}
            initialData={workspace}
            onStepChange={setWorkspaceEditProgressStep}
            onClose={() => {
              setWorkspaceEditProgressStep('narrative');
              setIsWorkspaceEditOpen(false);
            }}
            onComplete={handleWorkspaceEditComplete}
          />
        </>
      );
    }

    if (stage === 'studio' && workspace && selectedFolder) {
      return (
        <PostStudio
          brandName={workspace.brand.name}
          brandCategory={workspace.brand.category}
          brandIdentity={workspace.brand.identity}
          brandNarrative={workspace.brand.description}
          businessGoalTitle={selectedFolder.businessGoalTitle}
          businessGoalDescription={
            workspace.selectedBusinessGoals.find(goal => goal.id === selectedFolder.businessGoalId)?.description
          }
          postGoalTitle={selectedFolder.title}
          postGoalDescription={selectedFolder.description}
          postGoalWhyThisDirectionFits={selectedFolder.whyThisDirectionFits}
          postGoalTaxonomyTags={selectedFolder.taxonomyTags}
          postGoalImageTypeChips={selectedFolder.imageTypeChips}
          postGoalDirectionAngles={selectedFolder.directionAngles}
          postGoalPreviewImageUrl={selectedFolder.previewImageUrl}
          referenceAssets={selectedFolder.referenceAssets}
          studioSession={studioSessionsByFolderId[selectedFolder.id] ?? null}
          onStudioSessionChange={handleSelectedFolderStudioSessionChange}
          onViewModeChange={setStudioViewMode}
          onApplyGoalUpdate={handleApplyStudioGoalUpdate}
          onBack={() => {
            transitionToStage('workspace', 'backward');
          }}
          onFinalize={() => {
            alert('Post finalized! Ready to publish.');
          }}
        />
      );
    }

    return null;
  };

  return (
    <>
      <div className="app-shell">
        {currentStage !== 'auth' ? (
          <AppJourneyProgress activeStep={activeJourneyStep} />
        ) : null}

        <div className="app-content">
          <PrototypeDebugDrawer
            currentStage={currentStage}
            user={user}
            workspace={workspace}
            selectedFolderTitle={selectedFolder?.title ?? null}
            onJumpToAuth={() => {
              setSelectedFolder(null);
              setIsWorkspaceEditOpen(false);
              setWorkspaceEditProgressStep('narrative');
              setStudioViewMode('grid');
              transitionToStage('auth', 'backward');
            }}
            onJumpToOnboarding={() => {
              setSelectedFolder(null);
              setIsWorkspaceEditOpen(false);
              setWorkspaceEditProgressStep('narrative');
              setOnboardingInitialStep('narrative');
              setOnboardingProgressStep('narrative');
              transitionToStage(user ? 'onboarding' : 'auth', 'backward');
            }}
            onJumpToWorkspace={() => {
              if (workspace) {
                setSelectedFolder(null);
                setIsWorkspaceEditOpen(false);
                setWorkspaceEditProgressStep('narrative');
                setStudioViewMode('grid');
                transitionToStage('workspace', 'forward');
              }
            }}
            onJumpToStudio={() => {
              if (workspace?.postGoalFolders.length) {
                setSelectedFolder(workspace.postGoalFolders[0]);
                setIsWorkspaceEditOpen(false);
                setWorkspaceEditProgressStep('narrative');
                setStudioViewMode('grid');
                transitionToStage('studio', 'forward');
              }
            }}
            onLoadSampleWorkspace={handleLoadSampleWorkspace}
            onResetPrototype={() => {
              setSelectedFolder(null);
              setWorkspace(null);
              setStudioSessionsByFolderId({});
              setUser(null);
              setOnboardingInitialStep(undefined);
              setOnboardingProgressStep('narrative');
              setWorkspaceEditProgressStep('narrative');
              setStudioViewMode('grid');
              setIsWorkspaceEditOpen(false);
              transitionToStage('auth', 'backward');
            }}
          />

          <div className="app-stage-stack">
            {stageTransition && (
              <div className={`app-stage-layer app-stage-layer--exit app-stage-layer--${stageTransition.direction}`}>
                {renderStage(stageTransition.exiting)}
              </div>
            )}

            <div
              className={`app-stage-layer ${stageTransition ? `app-stage-layer--enter app-stage-layer--${stageTransition.direction}` : 'app-stage-layer--static'}`}
            >
              {renderStage(currentStage)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
