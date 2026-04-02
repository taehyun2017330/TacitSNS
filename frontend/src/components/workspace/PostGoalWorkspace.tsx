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
        {folderCount === 0 ? (
          <section className="workspace-hub-empty">
            <h3>No post goals yet</h3>
            <p>Add one to begin exploring.</p>
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
