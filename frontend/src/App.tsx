import React, { useEffect, useMemo, useState } from 'react';

import PrototypeLogin from './components/auth/PrototypeLogin';
import PrototypeDebugDrawer from './components/debug/PrototypeDebugDrawer';
import BrandInfoStep from './components/onboarding/BrandInfoStep';
import PostStudio from './components/PostStudio';
import PostGoalWorkspace from './components/workspace/PostGoalWorkspace';
import {
  createPostGoalFolder,
  inferBusinessGoalOptions
} from './data/goalHierarchy';
import type { BrandData } from './types/brand';
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

type PersistedAppState = {
  user: PrototypeUser | null;
  workspace: WorkspaceSnapshot | null;
};

function loadPersistedState(): PersistedAppState {
  if (typeof window === 'undefined') {
    return { user: null, workspace: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, workspace: null };
    }

    return JSON.parse(raw) as PersistedAppState;
  } catch (error) {
    console.error('Failed to load persisted prototype state:', error);
    return { user: null, workspace: null };
  }
}

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

function deriveStage(user: PrototypeUser | null, workspace: WorkspaceSnapshot | null): AppStage {
  if (!user) {
    return 'auth';
  }

  if (!workspace) {
    return 'onboarding';
  }

  return 'workspace';
}

function App() {
  const persisted = useMemo(() => loadPersistedState(), []);
  const [currentStage, setCurrentStage] = useState<AppStage>(() =>
    deriveStage(persisted.user, persisted.workspace)
  );
  const [stageTransition, setStageTransition] = useState<{
    exiting: AppStage;
    entering: AppStage;
    direction: 'forward' | 'backward';
  } | null>(null);
  const [user, setUser] = useState<PrototypeUser | null>(persisted.user);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(persisted.workspace);
  const [selectedFolder, setSelectedFolder] = useState<PostGoalFolder | null>(null);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<'narrative' | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user,
        workspace
      } satisfies PersistedAppState)
    );
  }, [user, workspace]);

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
    transitionToStage(workspace ? 'workspace' : 'onboarding', 'forward');
  };

  const handleOnboardingComplete = (result: OnboardingResult) => {
    setWorkspace(prev => {
      const allowedGoalIds = new Set(result.selectedBusinessGoals.map(goal => goal.id));
      return {
        ...result,
        postGoalFolders: prev?.postGoalFolders.filter(folder => allowedGoalIds.has(folder.businessGoalId)) ?? []
      };
    });
    setSelectedFolder(null);
    setOnboardingInitialStep(undefined);
    transitionToStage('post-goals', 'forward');
  };

  const handleLoadSampleWorkspace = (brand: BrandData) => {
    const sampleWorkspace = createSampleWorkspace(brand);
    setWorkspace(sampleWorkspace);
    setUser({
      id: `prototype-sample-${Date.now()}`,
      name: 'Sample User',
      email: 'sample@prototype.local'
    });
    setSelectedFolder(null);
    setOnboardingInitialStep(undefined);
    transitionToStage('workspace', 'forward');
  };

  const renderStage = (stage: AppStage) => {
    if (stage === 'auth') {
      return <PrototypeLogin onLogin={handleLogin} />;
    }

    if (stage === 'onboarding' && user) {
      return (
        <BrandInfoStep
          initialData={workspace}
          initialStep={onboardingInitialStep}
          onComplete={handleOnboardingComplete}
        />
      );
    }

    if (stage === 'workspace' && workspace) {
      return (
        <PostGoalWorkspace
          mode="workspace"
          brandName={workspace.brand.name}
          brandIdentity={workspace.brand.identity}
          businessGoals={workspace.selectedBusinessGoals}
          activeBusinessGoalId={workspace.activeBusinessGoalId}
          postGoalFolders={workspace.postGoalFolders}
          onSelectBusinessGoal={goalId => {
            setWorkspace(prev =>
              prev
                ? {
                    ...prev,
                    activeBusinessGoalId: goalId
                  }
                : prev
            );
          }}
          onCreatePostGoal={folder => {
            setWorkspace(prev =>
              prev
                ? {
                    ...prev,
                    postGoalFolders: [folder, ...prev.postGoalFolders]
                  }
                : prev
            );
          }}
          onEditGoals={() => {
            setSelectedFolder(null);
            setOnboardingInitialStep('narrative');
            transitionToStage('onboarding', 'backward');
          }}
          onOpenPostGoal={folder => {
            setSelectedFolder(folder);
            transitionToStage('studio', 'forward');
          }}
        />
      );
    }

    if (stage === 'post-goals' && workspace) {
      return (
        <PostGoalWorkspace
          mode="setup"
          brandName={workspace.brand.name}
          brandIdentity={workspace.brand.identity}
          businessGoals={workspace.selectedBusinessGoals}
          activeBusinessGoalId={workspace.activeBusinessGoalId}
          postGoalFolders={workspace.postGoalFolders}
          onSelectBusinessGoal={goalId => {
            setWorkspace(prev =>
              prev
                ? {
                    ...prev,
                    activeBusinessGoalId: goalId
                  }
                : prev
            );
          }}
          onCreatePostGoal={folder => {
            setWorkspace(prev =>
              prev
                ? {
                    ...prev,
                    postGoalFolders: [folder, ...prev.postGoalFolders]
                  }
                : prev
            );
          }}
          onEditGoals={() => {
            setSelectedFolder(null);
            setOnboardingInitialStep('narrative');
            transitionToStage('onboarding', 'backward');
          }}
          onContinueToWorkspace={() => {
            transitionToStage('workspace', 'forward');
          }}
          onOpenPostGoal={() => {
            transitionToStage('workspace', 'forward');
          }}
        />
      );
    }

    if (stage === 'studio' && workspace && selectedFolder) {
      return (
        <PostStudio
          brandName={workspace.brand.name}
          brandCategory={workspace.brand.category}
          brandContext={[
            workspace.brand.identity,
            workspace.brand.description,
            `Business goal: ${selectedFolder.businessGoalTitle}`,
            `Post goal: ${selectedFolder.title}`,
            selectedFolder.assistantPrompt
          ].filter(Boolean).join(' ')}
          businessGoalTitle={selectedFolder.businessGoalTitle}
          postGoalTitle={selectedFolder.title}
          postGoalDescription={selectedFolder.description}
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
      <PrototypeDebugDrawer
        currentStage={currentStage}
        user={user}
        workspace={workspace}
        onJumpToAuth={() => {
          setSelectedFolder(null);
          transitionToStage('auth', 'backward');
        }}
        onJumpToOnboarding={() => {
          setSelectedFolder(null);
          setOnboardingInitialStep('narrative');
          transitionToStage(user ? 'onboarding' : 'auth', 'backward');
        }}
        onJumpToWorkspace={() => {
          if (workspace) {
            setSelectedFolder(null);
            transitionToStage('workspace', 'forward');
          }
        }}
        onJumpToStudio={() => {
          if (workspace?.postGoalFolders.length) {
            setSelectedFolder(workspace.postGoalFolders[0]);
            transitionToStage('studio', 'forward');
          }
        }}
        onLoadSampleWorkspace={handleLoadSampleWorkspace}
        onResetPrototype={() => {
          setSelectedFolder(null);
          setWorkspace(null);
          setUser(null);
          setOnboardingInitialStep(undefined);
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
    </>
  );
}

export default App;
