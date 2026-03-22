import React, { useMemo, useState } from 'react';

import type { BrandData } from '../../types/brand';
import type { PostGoalStudioSession } from '../../types/postStudio';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import WorkspaceContextRail from './WorkspaceContextRail';
import WorkspacePostGoalChooserModal from './WorkspacePostGoalChooserModal';
import WorkspacePostGoalDirectory, { type WorkspaceFolderGroup } from './WorkspacePostGoalDirectory';
import './WorkspaceHub.css';

interface Props {
  brandName: string;
  brandCategory: string;
  brandIdentity: string;
  brandNarrative: string;
  businessGoals: BusinessGoalOption[];
  activeBusinessGoalId: string;
  postGoalFolders: PostGoalFolder[];
  studioSessionsByFolderId: Record<string, PostGoalStudioSession>;
  onEditGoals: () => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
  onOpenPostGoal: (folder: PostGoalFolder) => void;
}

const SavedImagesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="9" cy="10" r="1.4" fill="currentColor" />
    <path
      d="M7.3 16.2l3.1-3.3 2.2 2.1 1.8-1.9 2.3 3.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PublishImagesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 16.5V6.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8.8 10.1 12 6.8l3.2 3.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 18.5h11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const PostGoalWorkspace: React.FC<Props> = ({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoals,
  activeBusinessGoalId,
  postGoalFolders,
  studioSessionsByFolderId,
  onEditGoals,
  onCreatePostGoal,
  onRemovePostGoal,
  onOpenPostGoal
}) => {
  const [isAddingPostGoal, setIsAddingPostGoal] = useState(false);
  const activeBusinessGoal = useMemo(
    () => businessGoals.find(goal => goal.id === activeBusinessGoalId) ?? businessGoals[0] ?? null,
    [activeBusinessGoalId, businessGoals]
  );
  const brand = useMemo<BrandData>(
    () => ({
      name: brandName,
      category: brandCategory,
      identity: brandIdentity,
      description: brandNarrative
    }),
    [brandCategory, brandIdentity, brandName, brandNarrative]
  );

  const orderedFolders = useMemo(
    () =>
      [...postGoalFolders].sort((a, b) => {
        if (a.businessGoalId !== b.businessGoalId) {
          return a.businessGoalTitle.localeCompare(b.businessGoalTitle);
        }

        return a.createdAt.localeCompare(b.createdAt);
      }),
    [postGoalFolders]
  );

  const folderGroups = useMemo<WorkspaceFolderGroup[]>(() => {
    const groups = new Map<string, WorkspaceFolderGroup>();

    orderedFolders.forEach(folder => {
      const existing = groups.get(folder.businessGoalId);
      if (existing) {
        existing.folders.push(folder);
        return;
      }

      groups.set(folder.businessGoalId, {
        id: folder.businessGoalId,
        title: folder.businessGoalTitle,
        folders: [folder]
      });
    });

    return Array.from(groups.values());
  }, [businessGoals, orderedFolders]);

  const folderCount = orderedFolders.length;
  const hasMultipleGroups = folderGroups.length > 1;

  return (
    <main className="workspace-hub">
      <WorkspaceContextRail
        brandName={brandName}
        brandCategory={brandCategory}
        brandIdentity={brandIdentity}
        brandNarrative={brandNarrative}
        activeBusinessGoal={activeBusinessGoal}
        onEditGoals={onEditGoals}
      />

      <section className="workspace-hub-main">
        <header className="workspace-hub-header">
          <div className="workspace-hub-header-copy">
            <div className="screen-eyebrow">Post goals</div>
            <h2>Your post goals</h2>
            <p>Open one to begin image exploration.</p>
          </div>

          <div className="workspace-hub-toolbar">
            <button type="button" className="ui-btn ui-btn--secondary" disabled>
              <span className="workspace-hub-toolbar-icon">
                <SavedImagesIcon />
              </span>
              Saved images
            </button>
            <button type="button" className="ui-btn ui-btn--secondary" disabled>
              <span className="workspace-hub-toolbar-icon">
                <PublishImagesIcon />
              </span>
              Publish images
            </button>
          </div>
        </header>

        {folderCount === 0 ? (
          <section className="workspace-hub-empty">
            <div className="screen-eyebrow">Post goals</div>
            <h3>No post goals yet</h3>
            <p>Add one here to begin image exploration in the workspace.</p>
            {activeBusinessGoal ? (
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => setIsAddingPostGoal(true)}
              >
                Choose a post goal
              </button>
            ) : (
              <button type="button" className="ui-btn ui-btn--primary" onClick={onEditGoals}>
                Return to onboarding
              </button>
            )}
          </section>
        ) : (
          <WorkspacePostGoalDirectory
            folderCount={folderCount}
            folderGroups={folderGroups}
            hasMultipleGroups={hasMultipleGroups}
            activeBusinessGoalId={activeBusinessGoal?.id ?? null}
            studioSessionsByFolderId={studioSessionsByFolderId}
            onOpenPostGoal={onOpenPostGoal}
            onRequestAddPostGoal={() => setIsAddingPostGoal(true)}
          />
        )}

        <WorkspacePostGoalChooserModal
          isOpen={isAddingPostGoal}
          brand={brand}
          activeBusinessGoal={activeBusinessGoal}
          postGoalFolders={postGoalFolders}
          onCreatePostGoal={onCreatePostGoal}
          onRemovePostGoal={onRemovePostGoal}
          onClose={() => setIsAddingPostGoal(false)}
        />
      </section>
    </main>
  );
};

export default PostGoalWorkspace;
