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
  const [user, setUser] = useState<PrototypeUser | null>(persisted.user);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(persisted.workspace);
  const [selectedFolder, setSelectedFolder] = useState<PostGoalFolder | null>(null);

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

  const handleLogin = (nextUser: PrototypeUser) => {
    setUser(nextUser);
    setCurrentStage(workspace ? 'workspace' : 'onboarding');
  };

  const handleOnboardingComplete = (result: OnboardingResult) => {
    setWorkspace({
      ...result,
      postGoalFolders: []
    });
    setSelectedFolder(null);
    setCurrentStage('workspace');
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
    setCurrentStage('workspace');
  };

  return (
    <>
      <PrototypeDebugDrawer
        currentStage={currentStage}
        user={user}
        workspace={workspace}
        onJumpToAuth={() => {
          setSelectedFolder(null);
          setCurrentStage('auth');
        }}
        onJumpToOnboarding={() => {
          setSelectedFolder(null);
          setCurrentStage(user ? 'onboarding' : 'auth');
        }}
        onJumpToWorkspace={() => {
          if (workspace) {
            setSelectedFolder(null);
            setCurrentStage('workspace');
          }
        }}
        onJumpToStudio={() => {
          if (workspace?.postGoalFolders.length) {
            setSelectedFolder(workspace.postGoalFolders[0]);
            setCurrentStage('studio');
          }
        }}
        onLoadSampleWorkspace={handleLoadSampleWorkspace}
        onResetPrototype={() => {
          setSelectedFolder(null);
          setWorkspace(null);
          setUser(null);
          setCurrentStage('auth');
        }}
      />

      {currentStage === 'auth' && (
        <PrototypeLogin onLogin={handleLogin} />
      )}

      {currentStage === 'onboarding' && user && (
        <BrandInfoStep onComplete={handleOnboardingComplete} />
      )}

      {currentStage === 'workspace' && workspace && (
        <PostGoalWorkspace
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
          onOpenPostGoal={folder => {
            setSelectedFolder(folder);
            setCurrentStage('studio');
          }}
        />
      )}

      {currentStage === 'studio' && workspace && selectedFolder && (
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
            setCurrentStage('workspace');
          }}
          onFinalize={() => {
            alert('Post finalized! Ready to publish.');
          }}
        />
      )}
    </>
  );
}

export default App;
